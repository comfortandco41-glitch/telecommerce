import { WebhookRepository } from "../repositories/webhookRepository";
import { ShopRepository } from "../repositories/shopRepository";
import { CategoryRepository } from "../repositories/categoryRepository";
import { ProductRepository } from "../repositories/productRepository";
import { telegramClient } from "./telegramClient";
import { escapeMarkdownV2 } from "../utils/markdown";

export class WebhookService {
  private webhookRepo = new WebhookRepository();
  private shopRepo = new ShopRepository();
  private categoryRepo = new CategoryRepository();
  private productRepo = new ProductRepository();

  async processUpdate(shopId: string, payload: Record<string, any>): Promise<void> {
    const updateId = BigInt(payload.update_id as number | string | bigint);
    try {
      console.log(`Processing update ${updateId} in background for shop ${shopId}...`);

      const shop = await this.shopRepo.getById(shopId);
      if (!shop) {
        throw new Error(`Shop with ID ${shopId} not found in database.`);
      }

      if (payload.message) {
        await this.handleMessage(shop, payload.message);
      } else if (payload.callback_query) {
        await this.handleCallbackQuery(shop, payload.callback_query);
      } else {
        throw new Error("Invalid payload: Update does not contain message or callback_query.");
      }

      // Mark webhook log as processed
      await this.webhookRepo.markProcessed(updateId, true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Error processing webhook update ${updateId}:`, errMsg);
      await this.webhookRepo.markProcessed(updateId, false, errMsg);
    }
  }

  private async handleMessage(shop: any, message: any): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text;

    if (text === "/start") {
      await this.sendWelcomeMessage(shop, chatId);
    }
  }

  private async handleCallbackQuery(shop: any, callbackQuery: any): Promise<void> {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    // Acknowledge button click instantly
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
    }
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

    // Add navigation back button
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
    
    // Add WebApp Storefront Button first
    keyboard.push([
      {
        text: "🛍️ Launch WebApp Storefront",
        web_app: {
          url: `https://storefront.superbot.app/shop/${shopId}`,
        },
      },
    ]);

    // Categories buttons
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
