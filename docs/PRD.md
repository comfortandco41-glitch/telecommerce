# PRD.md - Product Requirements Document

This document outlines the product requirements, user personas, key functional flows, and non-functional requirements for the SuperBot Telegram Shop SaaS.

---

## 1. User Personas

### Persona A: The Merchant (Shop Owner)
- **Goal**: Quickly set up an online shop without complex coding, accept payments via local bank transfers, and communicate directly with customers on Telegram.
- **Pain Points**: Hard to keep track of bank transfer screenshots sent in general chats; manual inventory updates are error-prone; lack of CRM metrics on Telegram subscribers.

### Persona B: The Customer (Shopper)
- **Goal**: Buy goods quickly on Telegram using a responsive conversational or web-app catalog, make payment via bank transfer, and get immediate order notifications.
- **Pain Points**: Typing long details in chats; waiting hours for a human administrator to verify bank receipts; lack of order tracking history.

### Persona C: The Platform Admin (Super Admin)
- **Goal**: Monitor platform health, manage SaaS subscriptions, view overall order volume, and troubleshoot webhook failures.

---

## 2. Core User Journeys

### Journey 1: Shop Setup and Activation
```
[Merchant Registers] -> [Inputs Bot Token] -> [System sets Webhook] -> [Bot is Active]
```
1. Merchant registers on the SuperBot Web Dashboard.
2. Merchant enters their Telegram Bot Token (obtained from `@BotFather`).
3. SuperBot backend makes a `setWebhook` call to Telegram.
4. System updates the status to "Connected" and registers standard commands (`/start`, `/cart`, `/help`).

### Journey 2: Customer Checkout Flow
1. Customer initiates chat with `@MerchantBot` and clicks `/start`.
2. Bot displays interactive category buttons.
3. Customer clicks a category -> views products -> clicks "Add to Cart" via inline buttons.
4. Customer types `/cart` or clicks "View Cart" -> clicks "Checkout".
5. Customer enters delivery address & phone number (collected via inline questions or web app interface).
6. Bot displays payment details (bank account name/number) and prompts customer to upload their receipt photo.

### Journey 3: Payment Verification and Invoicing
1. Customer uploads the payment receipt photo.
2. Webhook captures the photo message, downloads it, uploads to Supabase Storage, and creates an order with status `Pending Verification`.
3. Merchant is notified (via dashboard and Telegram admin bot).
4. Merchant views the receipt in the dashboard, validates the bank transaction, and clicks **Approve**.
5. System:
   - Changes order status to `Paid`.
   - Generates an HTML-to-PDF invoice.
   - Saves PDF to Storage.
   - Sends confirmation message + PDF invoice to Customer via Telegram.

---

## 3. Detailed Functional Requirements

### Tenant & Shop Configuration
- Support multiple shops per Merchant.
- Set currency, language, bank instructions, and welcome texts.

### Product & Inventory Management
- Product creation (name, description, images, price, stock, category).
- Automatic inventory deduction on checkout; restocking on cancellation.

### Customer Relationship Management (CRM)
- Record all users who interact with the bot as `Customers`.
- Broadcast feature: Compose a text/photo message and send it to all customers, or segmented filters.

### Automated Workflows
- Trigger-action architecture (e.g., "On order status updated to SHIPPED -> send tracking code to customer").

---

## 4. Non-Functional Requirements (NFR)

- **Webhook Response Speed**: The webhook endpoint must process requests asynchronously or respond within `500ms` with HTTP 200 OK. Slow webhooks cause Telegram to retry requests, flooding the queue.
- **Data Isolation**: Database roles or application-level middleware must prevent tenant cross-talk.
- **Storage Limits**: Implement validation limiting receipt uploads to 5MB, product images to 2MB.
- **Downtime Toleration**: Zero-downtime database schema upgrades using migrations.
