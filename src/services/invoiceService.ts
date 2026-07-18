import { supabase } from "../db/supabaseClient";
import { telegramClient } from "./telegramClient";
import { prisma } from "../db/client";

export class InvoiceService {
  async generateAndSendInvoice(shopId: string, orderId: string): Promise<void> {
    try {
      console.log(`Generating text (.txt) invoice for order ${orderId}...`);

      // 1. Fetch deep order details
      const order = await prisma.order.findFirst({
        where: { id: orderId, shopId },
        include: {
          items: { include: { product: true } },
          customer: true,
          shop: true,
        },
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      const currency = order.shop.currency || "MMK";
      const customerName = order.customer
        ? `${order.customer.firstName} ${order.customer.lastName || ""}`.trim()
        : "Valued Customer";
      const issueDate = new Date(order.createdAt).toLocaleString();

      // 2. Build clean, human-readable text invoice content
      let txtContent = `==================================================\n`;
      txtContent += `                 OFFICIAL INVOICE                 \n`;
      txtContent += `==================================================\n`;
      txtContent += `Store Name   : ${order.shop.name}\n`;
      txtContent += `Invoice ID   : ${order.id}\n`;
      txtContent += `Date         : ${issueDate}\n`;
      txtContent += `Customer     : ${customerName}\n`;
      txtContent += `Phone        : ${order.deliveryPhone || "N/A"}\n`;
      txtContent += `Address      : ${order.deliveryAddress || "N/A"}\n`;
      txtContent += `--------------------------------------------------\n`;
      txtContent += `ITEMS PURCHASED:\n`;
      txtContent += `--------------------------------------------------\n`;

      order.items.forEach((item, index) => {
        const unitPrice = Number(item.priceAtPurchase).toLocaleString();
        const lineTotal = (Number(item.priceAtPurchase) * item.quantity).toLocaleString();
        txtContent += `${index + 1}. ${item.product.name}\n`;
        txtContent += `   Qty: ${item.quantity} x ${unitPrice} ${currency} = ${lineTotal} ${currency}\n`;
      });

      txtContent += `--------------------------------------------------\n`;
      txtContent += `TOTAL AMOUNT : ${Number(order.totalAmount).toLocaleString()} ${currency}\n`;
      txtContent += `PAYMENT      : VERIFIED & CONFIRMED\n`;
      txtContent += `STATUS       : PAID\n`;
      txtContent += `==================================================\n`;
      txtContent += `Thank you for shopping with ${order.shop.name}!\n`;
      txtContent += `==================================================\n`;

      const txtBuffer = Buffer.from(txtContent, "utf-8");

      // 3. Upload .txt invoice buffer to Supabase Storage invoices bucket
      const storagePath = `${shopId}/invoices/${orderId}-invoice.txt`;
      const { error } = await supabase.storage.from("invoices").upload(storagePath, txtBuffer, {
        contentType: "text/plain; charset=utf-8",
        upsert: true,
      });

      if (error) {
        throw new Error(`Supabase Storage invoice upload failed: ${error.message}`);
      }

      // 4. Retrieve public invoice URL
      const { data: urlData } = supabase.storage.from("invoices").getPublicUrl(storagePath);
      const invoicePdfUrl = urlData.publicUrl;

      // 5. Update database Order row
      await prisma.order.update({
        where: { id: orderId },
        data: { invoicePdfUrl },
      });

      // 6. Dispatch .txt document file to Telegram buyer
      if (order.customer) {
        const shortId = orderId.slice(-8).toUpperCase();
        await telegramClient.sendDocument(
          order.shop.botToken,
          order.customer.telegramId.toString(),
          invoicePdfUrl,
          `Invoice-${shortId}.txt`
        );
      }

      console.log(`Invoice (.txt) successfully compiled, uploaded, and dispatched for order ${orderId}`);
    } catch (err: any) {
      console.error(`Invoice generation error for order ${orderId}:`, err.message);
    }
  }
}
