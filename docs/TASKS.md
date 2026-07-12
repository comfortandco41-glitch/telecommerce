# TASKS.md - Phase-by-Phase Development Checklist

This document contains the step-by-step task checklist mapping directly to the project Build Order.

---

## Phase 1: Database & Webhook Infrastructure
- [ ] **Task 1.1: Project Bootstrap**
  - Initialize Node/Express TypeScript backend.
  - Set up EsLint, Prettier, and Jest configurations.
- [ ] **Task 1.2: Database Foundation**
  - Install Prisma ORM.
  - Copy the schema from `docs/DATABASE.md` to `prisma/schema.prisma`.
  - Spin up local PostgreSQL container or connect to Supabase and run `npx prisma migrate dev`.
- [ ] **Task 1.3: Webhook Routing and Verification**
  - Implement Express public endpoint `POST /api/v1/webhook/:shopId`.
  - Add security middleware verifying the `X-Telegram-Bot-Api-Secret-Token` header.
- [ ] **Task 1.4: Webhook Idempotency & Logger**
  - Implement repository method to record incoming updates to the `WebhookLog` table.
  - Wrap processing in a database unique-constraint check on `updateId`.
- [ ] **Task 1.5: Phase 1 Tests**
  - Write Supertest route assertions for the webhook endpoint (verifying HTTP 200, duplicate handling, and validation failures).

---

## Phase 2: Products Catalog Flow
- [ ] **Task 2.1: Categories & Products API**
  - Write `CategoryRepository` and `ProductRepository` classes.
  - Write endpoints to create, read, update, and toggle active state for products and categories.
- [ ] **Task 2.2: Conversational Bot Storefront**
  - Implement commands parser inside the Webhook Service.
  - Hook `/start` command to display category inline buttons.
  - Add callback handler for `cat:<id>` displaying products in the selected category.
- [ ] **Task 2.3: Phase 2 Tests**
  - Write unit tests for `ProductService` mock queries.
  - Write unit tests simulating bot update payloads and validating bot responses.

---

## Phase 3: Orders, Cart & Screenshot Upload
- [ ] **Task 3.1: Session Cart State**
  - Implement a session state parser tracking customer cart selections in-memory or in database.
  - Add inline buttons to add/remove products to/from cart.
- [ ] **Task 3.2: Checkout Conversational Questionnaire**
  - Implement conversational state transition matching the state machine (Name -> Address -> Phone).
  - Enforce input formats (e.g. phone number syntax regex).
- [ ] **Task 3.3: Receipt Upload Handler**
  - Configure the webhook to parse photo messages when state is `AWAITING_RECEIPT`.
  - Fetch raw photo binary streams from Telegram API, pipe directly to Supabase storage receipts bucket.
  - Create the `Order` record, set status to `PENDING_VERIFICATION`, and alert the buyer.
- [ ] **Task 3.4: Phase 3 Tests**
  - Run integration tests simulating a full customer checkout dialog tree.

---

## Phase 4: Merchant Dashboard Shell
- [ ] **Task 4.1: Authentication System**
  - Write bcrypt registration and login endpoints.
  - Implement JWT token generator and routing middleware (`authMiddleware`, `shopAccessMiddleware`).
- [ ] **Task 4.2: Frontend Shell Bootstrap**
  - Create React Vite TypeScript project.
  - Configure TailwindCSS and initialize Shadcn UI primitives.
- [ ] **Task 4.3: Order and Product Management Views**
  - Implement reactive table listing orders, supporting details sheet with bank transfer receipt image.
  - Create catalog manager containing categories and product editors with file uploader.

---

## Phase 5: Payment Approval & Invoices
- [ ] **Task 5.1: HTML-to-PDF Generator**
  - Build server-side Handlebars compiler.
  - Integrate Puppeteer/Chromium generating PDF buffers.
- [ ] **Task 5.2: Invoice Storage & Bot Dispatcher**
  - Upload invoice PDF to Supabase invoices bucket.
  - Trigger Telegram `sendDocument` call to push the PDF file stream to the customer's chat.
- [ ] **Task 5.3: Phase 5 Tests**
  - Write E2E test verifying: "Approve Order clicked in UI" -> "Database updates" -> "PDF is compiled and uploaded" -> "Bot delivers PDF to mock customer".

---

## Phase 6: CRM Campaigns & Broadcasts
- [ ] **Task 6.1: Throttled Broadcast Queue**
  - Write a background worker script dispatching broadcasts to all shop subscribers.
  - Enforce throttling delay (limit to 25 messages per second) to respect Telegram API rate limits.
- [ ] **Task 6.2: Broadcast UI Composer**
  - Create dashboard broadcast manager page containing segment filter queries and dispatch scheduling forms.

---

## Phase 7: Workflow Engine & Production Release
- [ ] **Task 7.1: Automation Workflows**
  - Implement simple database schema for trigger-action hooks.
  - Write event broker evaluating workflows (e.g. alert owner on Telegram group when checkout completes).
- [ ] **Task 7.2: Production Deployment**
  - Deploy backend API to Render Web Service, frontend dashboard to Render Static Site.
  - Populate production environment variable configurations.
