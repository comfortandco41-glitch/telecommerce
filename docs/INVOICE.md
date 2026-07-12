# INVOICE.md - Invoice Generation and PDF Delivery

This document outlines the invoice template layout, PDF generation engine, storage configuration, and Telegram bot delivery pipeline.

---

## 1. Invoice PDF Visual Layout Requirements

The generated invoice must be clean, readable, and professional. It is rendered using HTML/CSS and compiled to PDF:

- **Header**:
  - Store Name & Logo (top left).
  - Invoice Label, Order ID short-hash, and Issue Date (top right).
- **Billing Details**:
  - Merchant info: Name, support contact, shop username.
  - Customer details: Full Name, Telegram username, phone, shipping address.
- **Line Items Table**:
  - Columns: `#`, `Product Name`, `Unit Price`, `Qty`, `Subtotal`.
  - Borderless clean rows, alternating grey backgrounds.
- **Summary**:
  - Total amount highlighted in bold with currency sign (e.g. `$29.99 USD`).
- **Footer**:
  - "Thank you for your order! Powered by SuperBot SaaS."

---

## 2. Technical Rendering Pipeline

We use `puppeteer` (or `puppeteer-core` with Chromium on Render) to compile HTML to PDF.

```
[Order Paid status] -> [Fetch Order with Items] -> [Compile handlebars template]
                                                               |
                                                               v
[Upload PDF to Supabase Storage] <-- [Puppeteer: page.pdf()] <-- [Load HTML in Puppeteer]
                |
                v
[Order.invoicePdfUrl updated] -> [Telegram: sendDocument(PDF Stream)] -> [Customer Chat]
```

### Generation Implementation Snippet
```typescript
import puppeteer from "puppeteer";
import handlebars from "handlebars";

export async function generateInvoicePdf(orderData: any): Promise<Buffer> {
  const htmlTemplate = `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 30px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { margin-top: 30px; text-align: right; font-size: 1.2em; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div><h2>{{shopName}}</h2></div>
          <div><h3>Invoice #{{orderId}}</h3>Date: {{date}}</div>
        </div>
        <p><strong>Customer:</strong> {{customerName}} ({{customerPhone}})</p>
        <p><strong>Address:</strong> {{deliveryAddress}}</p>
        <table>
          <thead>
            <tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            {{#each items}}
            <tr>
              <td>{{this.name}}</td>
              <td>\${{this.price}}</td>
              <td>{{this.quantity}}</td>
              <td>\${{this.subtotal}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
        <div class="total">Total Due: \${{totalAmount}} {{currency}}</div>
      </body>
    </html>
  `;

  const template = handlebars.compile(htmlTemplate);
  const finalHtml = template(orderData);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true
  });
  const page = await browser.newPage();
  await page.setContent(finalHtml);
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();

  return pdfBuffer;
}
```

---

## 3. Storage and Telegram Delivery

1. **Upload to Supabase Storage**:
   The buffer is uploaded to `invoices/:shopId/invoices/:orderId-invoice.pdf` with `ContentType: "application/pdf"`.
2. **Retrieve URL**:
   Generate a signed/secure reference URL.
3. **Send to User**:
   The backend fetches the bot token and dispatches the PDF using Telegram's `sendDocument` endpoint, attaching the PDF buffer as a file stream:
   ```
   POST https://api.telegram.org/bot<BOT_TOKEN>/sendDocument
   Multipart Form Data:
   - chat_id: <TELEGRAM_USER_ID>
   - document: <PDF_BINARY_STREAM>
   - caption: "Here is your invoice for order #fc406ba1. Thank you!"
   ```
   This ensures the document is rendered inline within the user's Telegram conversation history.
