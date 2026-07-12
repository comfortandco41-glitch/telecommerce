# STORAGE.md - Storage Buckets & Assets Guidelines

This document details the configuration, file constraints, and access policies for Supabase Storage buckets in SuperBot.

---

## 1. Storage Buckets Organization

SuperBot hosts files across three distinct buckets, ensuring isolation of public product assets from confidential financial records.

| Bucket Name | Access Policy | Content | Directory Structure |
| :--- | :--- | :--- | :--- |
| `products` | **Public** | Product showcase images. | `/:shopId/products/:productId-<hash>.<ext>` |
| `receipts` | **Private** | Bank transfer screenshots. | `/:shopId/receipts/:orderId-receipt.<ext>` |
| `invoices` | **Private** | Generated PDF invoices. | `/:shopId/invoices/:orderId-invoice.pdf` |

---

## 2. File Upload Constraints & Formats

To preserve storage space and maintain quick load times, we enforce strict limits at both the gateway (API) and bot webhook layers:

- **Product Images**:
  - Max File Size: **2MB**
  - Allowed Formats: `image/png`, `image/jpeg`, `image/webp`
  - Optimization: Compressed using the `sharp` library on the backend before upload (resized to max width `1024px`, converted to WEBP with 80% quality).
- **Payment Screenshots (Receipts)**:
  - Max File Size: **5MB**
  - Allowed Formats: `image/png`, `image/jpeg`
- **PDF Invoices**:
  - Max File Size: **1MB**
  - Allowed Formats: `application/pdf`

---

## 3. Webhook Asset Download Flow (Telegram to Supabase)

When a customer sends a payment receipt to the bot, the backend processes the binary file as follows:

```
[Telegram Webhook payload] -> Contains photo.file_id
       |
       v
[GET https://api.telegram.org/bot<TOKEN>/getFile?file_id=<ID>]
       |
       v
[Download file stream from api.telegram.org/file/bot...]
       |
       v
[Pipe stream directly to Supabase Storage client (receipts bucket)]
       |
       v
[Store returned storage path in Order.bankScreenshotUrl]
```

---

## 4. Access Control and Presigned URLs

- **Public Assets (`products` bucket)**:
  - Publicly readable using the static bucket URL: `https://[SUPABASE_PROJECT].supabase.co/storage/v1/object/public/products/[path]`
- **Protected Assets (`receipts` & `invoices` buckets)**:
  - Kept behind Row Level Security (RLS) policies.
  - To display a receipt on the Dashboard, the backend API generates a **Presigned URL** with a 15-minute expiration time. This URL is returned in the API payload, protecting against unauthorized access.
  - Invoices are delivered to the customer in the chat using a temporary signed link or directly as a Telegram document upload stream.
