import { WebhookRepository } from "../repositories/webhookRepository";
import { ShopRepository } from "../repositories/shopRepository";
import { CategoryRepository } from "../repositories/categoryRepository";
import { ProductRepository } from "../repositories/productRepository";
import { CustomerRepository } from "../repositories/customerRepository";
import { OrderRepository } from "../repositories/orderRepository";
import { telegramClient } from "./telegramClient";
import { escapeMarkdownV2 } from "../utils/markdown";
import { supabase } from "../db/supabaseClient";
import { workflowService } from "./workflowService";

export class WebhookService {
  private webhookRepo = new WebhookRepository();
  private shopRepo = new ShopRepository();
  private categoryRepo = new CategoryRepository();
  private productRepo = new ProductRepository();
  private customerRepo = new CustomerRepository();
  private orderRepo = new OrderRepository();

  async processUpdate(shopId: string, payload: Record<string, any>): Promise<void> {
    const updateId = BigInt(payload.update_id as number | string | bigint);
    try {
      console.log(`Processing update ${updateId} in background for shop ${shopId}...`);

      const shop = await this.shopRepo.getById(shopId);
      if (!shop) {
        throw new Error(`Shop with ID ${shopId} not found in database.`);
      }

      const tgUser = payload.message ? payload.message.from : payload.callback_query?.from;
      if (!tgUser) {
        throw new Error("Invalid update: Missing sender user details.");
      }

      const telegramId = BigInt(tgUser.id);
      let customer = await this.customerRepo.getByTelegramId(shopId, telegramId);

      // Create customer profile if new
      if (!customer) {
        customer = await this.customerRepo.create(shopId, {
          telegramId,
          username: tgUser.username,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
        });
      }

      if (payload.message) {
        await this.handleMessage(shop, customer, payload.message);
      } else if (payload.callback_query) {
        await this.handleCallbackQuery(shop, customer, payload.callback_query);
      } else {
        throw new Error("Invalid payload: Update does not contain message or callback_query.");
      }

      await this.webhookRepo.markProcessed(updateId, true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Error processing webhook update ${updateId}:`, errMsg);
      await this.webhookRepo.markProcessed(updateId, false, errMsg);
    }
  }

  private async handleMessage(shop: any, customer: any, message: any): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text;

    // 1. If in a questionnaire state, intercept message text inputs
    if (customer.checkoutStep && customer.checkoutStep !== "IDLE") {
      await this.processQuestionnaire(shop, customer, message);
      return;
    }

    // 2. Normal commands
    if (text === "/start") {
      await this.sendWelcomeMessage(shop, chatId);
    } else if (text === "/cart") {
      await this.showCart(shop, customer, chatId);
    }
  }

  private async handleCallbackQuery(shop: any, customer: any, callbackQuery: any): Promise<void> {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    await telegramClient.answerCallbackQuery(shop.botToken, callbackQuery.id).catch((err) => {
      console.error("Failed to answer callback query:", err.message);
    });

    if (data === "back_categories") {
      await this.editMessageToWelcome(shop, chatId, messageId);
    } else if (data.startsWith("cat:")) {
      const categoryId = data.substring(4);
      await this.showCategoryProducts(shop, chatId, messageId, categoryId);
    } else if (data.startsWith("prod:")) {
      const productId = data.substring(5);
      await this.showProductDetails(shop, chatId, messageId, productId);
    } else if (data.startsWith("add:")) {
      const productId = data.substring(4);
      await this.addToCart(shop, customer, chatId, productId);
    } else if (data.startsWith("sub:")) {
      const productId = data.substring(4);
      await this.subFromCart(shop, customer, chatId, productId);
    } else if (data === "cart_view") {
      await this.showCart(shop, customer, chatId);
    } else if (data === "checkout_start") {
      await this.startCheckout(shop, customer, chatId);
    } else if (data === "use_stored_details") {
      await this.transitionToAwaitingReceipt(shop, customer, chatId);
    } else if (data === "edit_details") {
      await this.askForName(shop, customer, chatId);
    }
  }

  private async processQuestionnaire(shop: any, customer: any, message: any): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text;

    if (customer.checkoutStep === "AWAITING_NAME") {
      if (!text || text.trim() === "") {
        await telegramClient.sendMessage(
          shop.botToken,
          chatId,
          escapeMarkdownV2("Please enter a valid full name:")
        );
        return;
      }
      const name = text.trim();
      await this.customerRepo.update(shop.id, customer.id, {
        firstName: name,
        checkoutStep: "AWAITING_ADDRESS",
      });
      await telegramClient.sendMessage(
        shop.botToken,
        chatId,
        escapeMarkdownV2("Please enter your complete delivery Address:")
      );
    } else if (customer.checkoutStep === "AWAITING_ADDRESS") {
      if (!text || text.trim() === "") {
        await telegramClient.sendMessage(
          shop.botToken,
          chatId,
          escapeMarkdownV2("Please enter a valid delivery address:")
        );
        return;
      }
      const address = text.trim();
      await this.customerRepo.update(shop.id, customer.id, {
        address,
        checkoutStep: "AWAITING_PHONE",
      });
      await telegramClient.sendMessage(
        shop.botToken,
        chatId,
        escapeMarkdownV2("Please enter your Phone Number:")
      );
    } else if (customer.checkoutStep === "AWAITING_PHONE") {
      if (!text || text.trim() === "") {
        await telegramClient.sendMessage(
          shop.botToken,
          chatId,
          escapeMarkdownV2("Please enter a valid phone number:")
        );
        return;
      }
      const phone = text.trim();
      // Basic phone format check: 7 to 15 digits
      const phoneRegex = /^\+?[\d\s\-]{7,20}$/;
      if (!phoneRegex.test(phone)) {
        await telegramClient.sendMessage(
          shop.botToken,
          chatId,
          escapeMarkdownV2(
            "Invalid phone number format. Please enter a valid phone number (e.g. +123456789):"
          )
        );
        return;
      }
      await this.customerRepo.update(shop.id, customer.id, {
        phone,
        checkoutStep: "AWAITING_RECEIPT",
      });
      const updatedCustomer = await this.customerRepo.getById(shop.id, customer.id);
      await this.sendPaymentInstructions(shop, updatedCustomer, chatId);
    } else if (customer.checkoutStep === "AWAITING_RECEIPT") {
      if (message.photo) {
        await this.handleReceiptUpload(shop, customer, message);
      } else {
        await telegramClient.sendMessage(
          shop.botToken,
          chatId,
          escapeMarkdownV2("Please upload your bank transfer payment screenshot (receipt photo) here:")
        );
      }
    }
  }

  private async addToCart(
    shop: any,
    customer: any,
    chatId: string | number,
    productId: string
  ): Promise<void> {
    const product = await this.productRepo.getById(shop.id, productId);
    if (!product) {
      await telegramClient.sendMessage(shop.botToken, chatId, escapeMarkdownV2("Product not found."));
      return;
    }

    const cart = (customer.cart as any[]) || [];
    const existingItem = cart.find((i) => i.productId === productId);
    const currentQty = existingItem ? existingItem.quantity : 0;

    if (product.stock < currentQty + 1) {
      await telegramClient.sendMessage(
        shop.botToken,
        chatId,
        escapeMarkdownV2(`Sorry, only ${product.stock} items left in stock.`)
      );
      return;
    }

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ productId, quantity: 1 });
    }

    await this.customerRepo.update(shop.id, customer.id, { cart });
    
    const inlineKeyboard = [
      [
        {
          text: "🛒 View Cart & Checkout",
          callback_data: "cart_view",
        },
      ],
      [
        {
          text: "⬅️ Keep Shopping",
          callback_data: "back_categories",
        },
      ],
    ];

    await telegramClient.sendMessage(
      shop.botToken,
      chatId,
      escapeMarkdownV2(`"${product.name}" added to cart!`),
      {
        inline_keyboard: inlineKeyboard,
      }
    );
  }

  private async subFromCart(
    shop: any,
    customer: any,
    chatId: string | number,
    productId: string
  ): Promise<void> {
    const cart = (customer.cart as any[]) || [];
    const itemIndex = cart.findIndex((i) => i.productId === productId);

    if (itemIndex > -1) {
      const item = cart[itemIndex];
      item.quantity -= 1;
      if (item.quantity <= 0) {
        cart.splice(itemIndex, 1);
      }
      await this.customerRepo.update(shop.id, customer.id, { cart });
      await telegramClient.sendMessage(
        shop.botToken,
        chatId,
        escapeMarkdownV2("Cart updated successfully.")
      );
    }
  }

  private async showCart(shop: any, customer: any, chatId: string | number): Promise<void> {
    const cart = (customer.cart as any[]) || [];
    if (cart.length === 0) {
      await telegramClient.sendMessage(
        shop.botToken,
        chatId,
        escapeMarkdownV2("Your shopping cart is empty.")
      );
      return;
    }

    let text = "*Your Shopping Cart:*\n\n";
    let total = 0;
    const inlineKeyboard: any[] = [];

    for (const item of cart) {
      const product = await this.productRepo.getById(shop.id, item.productId);
      if (product) {
        const itemSum = Number(product.price) * item.quantity;
        total += itemSum;
        text += `• *${escapeMarkdownV2(product.name)}* x${item.quantity} \\= ${escapeMarkdownV2(shop.currency)}${escapeMarkdownV2(itemSum.toString())}\n`;
        
        inlineKeyboard.push([
          {
            text: `➕ ${product.name}`,
            callback_data: `add:${product.id}`,
          },
          {
            text: `➖ ${product.name}`,
            callback_data: `sub:${product.id}`,
          },
        ]);
      }
    }

    text += `\n*Total Sum: ${escapeMarkdownV2(shop.currency)}${escapeMarkdownV2(total.toString())}*`;

    inlineKeyboard.push([
      {
        text: "🏁 Proceed to Checkout",
        callback_data: "checkout_start",
      },
    ]);

    await telegramClient.sendMessage(shop.botToken, chatId, text, {
      inline_keyboard: inlineKeyboard,
    });
  }

  private async startCheckout(shop: any, customer: any, chatId: string | number): Promise<void> {
    const cart = (customer.cart as any[]) || [];
    if (cart.length === 0) {
      await telegramClient.sendMessage(
        shop.botToken,
        chatId,
        escapeMarkdownV2("Your cart is empty. Please select products first.")
      );
      return;
    }

    // Check if details exist
    if (customer.firstName && customer.address && customer.phone) {
      const confirmationText =
        `Confirm delivery details:\n\n` +
        `Name: *${escapeMarkdownV2(customer.firstName)}*\n` +
        `Address: *${escapeMarkdownV2(customer.address)}*\n` +
        `Phone: *${escapeMarkdownV2(customer.phone)}*`;

      const inlineKeyboard = [
        [
          {
            text: "✅ Yes, Use Stored Details",
            callback_data: "use_stored_details",
          },
        ],
        [
          {
            text: "❌ No, Edit Details",
            callback_data: "edit_details",
          },
        ],
      ];

      await telegramClient.sendMessage(shop.botToken, chatId, confirmationText, {
        inline_keyboard: inlineKeyboard,
      });
    } else {
      await this.askForName(shop, customer, chatId);
    }
  }

  private async askForName(shop: any, customer: any, chatId: string | number): Promise<void> {
    await this.customerRepo.update(shop.id, customer.id, {
      checkoutStep: "AWAITING_NAME",
    });
    await telegramClient.sendMessage(
      shop.botToken,
      chatId,
      escapeMarkdownV2("Please enter your Full Name:")
    );
  }

  private async transitionToAwaitingReceipt(
    shop: any,
    customer: any,
    chatId: string | number
  ): Promise<void> {
    await this.customerRepo.update(shop.id, customer.id, {
      checkoutStep: "AWAITING_RECEIPT",
    });
    await this.sendPaymentInstructions(shop, customer, chatId);
  }

  private async sendPaymentInstructions(
    shop: any,
    customer: any,
    chatId: string | number
  ): Promise<void> {
    const cart = (customer.cart as any[]) || [];
    let total = 0;

    for (const item of cart) {
      const product = await this.productRepo.getById(shop.id, item.productId);
      if (product) {
        total += Number(product.price) * item.quantity;
      }
    }

    const instructionText =
      `*Order Total: ${escapeMarkdownV2(shop.currency)}${escapeMarkdownV2(total.toString())}*\n\n` +
      `Please make bank transfer using the instructions below:\n` +
      `\`\`\`\n${shop.paymentInstructions}\n\`\`\`\n\n` +
      `⚠️ Once transfer is complete, please upload the transaction receipt PHOTO directly in this chat window:`;

    await telegramClient.sendMessage(shop.botToken, chatId, instructionText);
  }

  private async handleReceiptUpload(shop: any, customer: any, message: any): Promise<void> {
    const chatId = message.chat.id;
    const photo = message.photo[message.photo.length - 1]; // pick largest resolution

    // 1. Fetch file path from Telegram
    const fileInfo = await telegramClient.getFile(shop.botToken, photo.file_id);
    if (!fileInfo.file_path) {
      throw new Error("Failed to retrieve file_path from Telegram Bot API");
    }

    // 2. Download raw buffer
    const buffer = await telegramClient.downloadFile(shop.botToken, fileInfo.file_path);

    // 3. Upload to Supabase Storage receipts bucket
    const storagePath = `${shop.id}/receipts/${customer.id}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("receipts").upload(storagePath, buffer, {
      contentType: "image/jpeg",
    });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    // Retrieve public file reference
    const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(storagePath);
    const screenshotUrl = urlData.publicUrl;

    // 4. Calculate total amount & assemble order items
    const cart = (customer.cart as any[]) || [];
    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of cart) {
      const product = await this.productRepo.getById(shop.id, item.productId);
      if (product) {
        const price = Number(product.price);
        totalAmount += price * item.quantity;
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          priceAtPurchase: price,
        });
      }
    }

    // 5. Execute transactional checkout insertion & stock update
    const order = await this.orderRepo.createOrderTransaction(shop.id, customer.id, {
      totalAmount,
      deliveryAddress: customer.address || "Telegram Order",
      deliveryPhone: customer.phone || "00000000",
      bankScreenshotUrl: screenshotUrl,
      items: orderItems,
    });

    workflowService.trigger(shop.id, "ORDER_CREATED", {
      orderId: order.id,
      amount: totalAmount.toFixed(2),
      customerName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
      botToken: shop.botToken,
    }).catch((err) => {
      console.error("Workflow broker ORDER_CREATED error:", err.message);
    });

    // 6. Reset cart session and checkout steps
    await this.customerRepo.update(shop.id, customer.id, {
      checkoutStep: "IDLE",
      cart: [],
    });

    // 7. Alert customer
    const successText =
      `✅ *Order Submitted Successfully!*\n\n` +
      `Thank you! We received your payment receipt screenshot\\. Our administration team will verify the payment and alert you shortly\\.\n\n` +
      `*Order ID:* \`${escapeMarkdownV2(order.id)}\``;

    await telegramClient.sendMessage(shop.botToken, chatId, successText);
  }

  private async sendWelcomeMessage(shop: any, chatId: string | number): Promise<void> {
    const activeCategories = await this.categoryRepo.listActiveByShopId(shop.id);
    const welcomeText = escapeMarkdownV2(shop.welcomeMessage || "Welcome to our shop!");

    const inlineKeyboard = this.buildCategoriesKeyboard(shop.id, activeCategories);

    await telegramClient.sendMessage(shop.botToken, chatId, welcomeText, {
      inline_keyboard: inlineKeyboard,
    });
  }

  private async editMessageToWelcome(shop: any, chatId: string | number, messageId: number): Promise<void> {
    const activeCategories = await this.categoryRepo.listActiveByShopId(shop.id);
    const welcomeText = escapeMarkdownV2(shop.welcomeMessage || "Welcome to our shop!");

    const inlineKeyboard = this.buildCategoriesKeyboard(shop.id, activeCategories);

    await telegramClient.editMessageText(shop.botToken, chatId, messageId, welcomeText, {
      inline_keyboard: inlineKeyboard,
    });
  }

  private async showCategoryProducts(
    shop: any,
    chatId: string | number,
    messageId: number,
    categoryId: string
  ): Promise<void> {
    const category = await this.categoryRepo.getById(shop.id, categoryId);
    if (!category) {
      await telegramClient.sendMessage(shop.botToken, chatId, escapeMarkdownV2("Category not found."));
      return;
    }

    const products = await this.productRepo.listActiveByCategoryId(shop.id, categoryId);
    
    let text = `*Category: ${escapeMarkdownV2(category.name)}*\n`;
    if (category.description) {
      text += `${escapeMarkdownV2(category.description)}\n`;
    }
    text += "\nSelect a product to view details:";

    const inlineKeyboard: any[] = [];
    products.forEach((prod) => {
      inlineKeyboard.push([
        {
          text: `${prod.name} - ${shop.currency}${prod.price.toString()}`,
          callback_data: `prod:${prod.id}`,
        },
      ]);
    });

    inlineKeyboard.push([
      {
        text: "⬅️ Back to Categories",
        callback_data: "back_categories",
      },
    ]);

    await telegramClient.editMessageText(shop.botToken, chatId, messageId, text, {
      inline_keyboard: inlineKeyboard,
    });
  }

  private async showProductDetails(
    shop: any,
    chatId: string | number,
    messageId: number,
    productId: string
  ): Promise<void> {
    const product = await this.productRepo.getById(shop.id, productId);
    if (!product) {
      await telegramClient.sendMessage(shop.botToken, chatId, escapeMarkdownV2("Product not found."));
      return;
    }

    const text = `*${escapeMarkdownV2(product.name)}*\n\n` +
      `Price: *${escapeMarkdownV2(shop.currency)}${escapeMarkdownV2(product.price.toString())}*\n` +
      `In Stock: ${product.stock}\n\n` +
      `${escapeMarkdownV2(product.description || "")}`;

    const inlineKeyboard = [
      [
        {
          text: "➕ Add to Cart",
          callback_data: `add:${product.id}`,
        },
      ],
      [
        {
          text: "⬅️ Back",
          callback_data: `cat:${product.categoryId}`,
        },
      ],
    ];

    await telegramClient.editMessageText(shop.botToken, chatId, messageId, text, {
      inline_keyboard: inlineKeyboard,
    });
  }

  private buildCategoriesKeyboard(shopId: string, categories: any[]): any[] {
    const keyboard: any[] = [];
    
    keyboard.push([
      {
        text: "🛍️ Launch WebApp Storefront",
        web_app: {
          url: `https://storefront.superbot.app/shop/${shopId}`,
        },
      },
    ]);

    categories.forEach((cat) => {
      keyboard.push([
        {
          text: cat.name,
          callback_data: `cat:${cat.id}`,
        },
      ]);
    });

    return keyboard;
  }
}
