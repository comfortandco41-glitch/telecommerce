# PROJECT.md - SuperBot Project Overview

SuperBot is a production-ready, multi-tenant Telegram Shop Management SaaS. It empowers merchants to run complete e-commerce stores directly inside Telegram using custom bots, while managing inventory, customers, order workflows, CRM, and broadcast communications from a single unified web dashboard.

---

## 1. Value Proposition & Business Goal

Selling on messaging platforms is fast but traditionally messy. Merchants often handle orders manually via chats, leading to lost screenshots, inventory discrepancies, and poor CRM. SuperBot bridges this gap:
- **For Customers**: A fluid, interactive Telegram Bot shopping experience (interactive keyboard menus, categories, shopping cart, and inline checkout) with real-time order status updates.
- **For Merchants**: A premium, web-based management dashboard to oversee products, verify payment screenshots, execute CRM campaigns (broadcasts/DMs), and configure automated notification workflows.

---

## 2. Multi-Tenant Architecture Model

SuperBot uses a **Logical Isolation** multi-tenant model sharing a single database instance with strict column-level tenant separation:

```
                  +--------------------------------+
                  |    SuperBot Web Dashboard      |
                  +--------------------------------+
                                  |
            +---------------------+---------------------+
            | (Tenant 1 Admin)    | (Tenant 2 Admin)    |
            v                     v                     v
      [ Shop 1 Config ]     [ Shop 2 Config ]     [ Shop 3 Config ]
            |                     |                     |
      (Token A Webhook)     (Token B Webhook)     (Token C Webhook)
            |                     |                     |
            v                     v                     v
    +---------------+     +---------------+     +---------------+
    | @Shop1_Bot    |     | @Shop2_Bot    |     | @Shop3_Bot    |
    | Telegram User |     | Telegram User |     | Telegram User |
    +---------------+     +---------------+     +---------------+
```

- **Tenants**: A tenant corresponds to a `Merchant` account, which owns one or more `Shops`.
- **Shops**: Each `Shop` has its own unique Telegram Bot Token, custom bot flow, and customer database.
- **Isolation Principle**: Every SQL query must filter by `shopId` or `tenantId`. Prisma middleware or service-layer wrappers must enforce this check to prevent cross-tenant data leakage.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 powered by Vite.
- **Language**: TypeScript (strict mode enabled).
- **Styling**: TailwindCSS for modular layouts and utility classes.
- **Component Library**: Shadcn UI (Radix UI primitives under the hood).
- **State Management**: Zustand / React Query (TanStack Query) for API caching.

### Backend
- **Runtime**: Node.js (v18+ LTS).
- **Framework**: Express.js with TypeScript (`ts-node` for dev, compiled JS for production).
- **Database ORM**: Prisma ORM with PostgreSQL client.
- **Authentication**: Stateless JWT for dashboard admin users, Telegram InitData validation for Telegram shoppers.

### Database & Storage
- **Database Engine**: Supabase PostgreSQL.
- **Storage**: Supabase Storage Buckets for product images and order bank transfer screenshots.

### Telegram Core
- **API**: Telegram Bot API (via webhooks).
- **Webhook Routing**: Backend exposes `/api/v1/webhook/:shopId` to receive POST requests from Telegram.

### PDF & Invoices
- **Engine**: Puppeteer or PDFKit (HTML to PDF rendering) to generate invoices.

---

## 4. Key Feature Matrix

| Feature | Description | Target User |
| :--- | :--- | :--- |
| **Bot Shop Front** | Dynamic product catalogs, categories, cart management, checkout in Telegram. | Customer |
| **Bot Payment Upload**| Ability to upload bank transaction screenshots as proof of payment. | Customer |
| **Merchant Dashboard**| Admin interface for order tracking, inventory, and status changes. | Merchant / Tenant |
| **CRM & Messaging**  | Broadcast messages to all subscribers or direct message individual shoppers. | Merchant / Tenant |
| **Invoice Generator** | Auto-generates PDF invoices and sends them directly to the buyer's Telegram. | System / Customer |
| **Workflow Builder**  | Simple trigger-action rules (e.g., "when Order is Paid -> send alert to Owner"). | Merchant / Tenant |
