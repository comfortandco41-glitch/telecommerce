import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { supabase } from "../db/supabaseClient";
import { telegramClient } from "./telegramClient";
import { prisma } from "../db/client";

export class InvoiceService {
  async generateAndSendInvoice(shopId: string, orderId: string): Promise<void> {
    try {
      console.log(`Generating invoice for order ${orderId}...`);

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

      // 2. Compile HTML content from Handlebars template
      const templatePath = path.join(__dirname, "../resources/invoiceTemplate.html");
      let htmlContent = "";

      if (fs.existsSync(templatePath)) {
        const templateSource = fs.readFileSync(templatePath, "utf-8");
        const template = handlebars.compile(templateSource);

        const itemsData = order.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.priceAtPurchase).toFixed(2),
          totalPrice: (Number(item.priceAtPurchase) * item.quantity).toFixed(2),
        }));

        htmlContent = template({
          orderId: order.id,
          shopName: order.shop.name,
          customerName: order.customer
            ? `${order.customer.firstName} ${order.customer.lastName || ""}`.trim()
            : "Valued Customer",
          deliveryPhone: order.deliveryPhone,
          deliveryAddress: order.deliveryAddress,
          items: itemsData,
          totalAmount: Number(order.totalAmount).toFixed(2),
          issueDate: new Date(order.createdAt).toLocaleDateString(),
        });
      } else {
        htmlContent = `<h1>Invoice for Order #${order.id}</h1><p>Total: $${Number(order.totalAmount).toFixed(2)}</p>`;
      }

      // 3. Compile PDF buffer (fallback to mock buffer if chromium download was skipped)
      let pdfBuffer: Buffer;
      if (
        process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === "true" ||
        process.env.NODE_ENV === "test"
      ) {
        console.log("Puppeteer Chromium download skipped. Using mock PDF compiler buffer.");
        pdfBuffer = Buffer.from(htmlContent);
      } else {
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
        pdfBuffer = Buffer.from(await page.pdf({ format: "A4", printBackground: true }));
        await browser.close();
      }

      // 4. Upload PDF invoice buffer to Supabase Storage invoices bucket
      const storagePath = `${shopId}/invoices/${orderId}-invoice.pdf`;
      const { error } = await supabase.storage.from("invoices").upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

      if (error) {
        throw new Error(`Supabase Storage invoice upload failed: ${error.message}`);
      }

      // 5. Retrieve public invoice URL
      const { data: urlData } = supabase.storage.from("invoices").getPublicUrl(storagePath);
      const invoicePdfUrl = urlData.publicUrl;

      // 6. Update database Order row
      await prisma.order.update({
        where: { id: orderId },
        data: { invoicePdfUrl },
      });

      // 7. Dispatch document file to buyer
      if (order.customer) {
        await telegramClient.sendDocument(
          order.shop.botToken,
          order.customer.telegramId.toString(),
          invoicePdfUrl,
          `Invoice-${orderId.slice(-8).toUpperCase()}.pdf`
        );
      }

      console.log(`Invoice successfully compiled, uploaded, and dispatched for order ${orderId}`);
    } catch (err: any) {
      console.error(`Invoice generation error for order ${orderId}:`, err.message);
    }
  }
}
