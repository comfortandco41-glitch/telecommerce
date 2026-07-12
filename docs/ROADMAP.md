# ROADMAP.md - Product Evolution and Future Phases

This document maps out the post-release roadmap and architectural enhancements planned for SuperBot.

---

## Phase 8: Localization & Multi-Currency Expansion
- **Objective**: Support global merchants expanding into localized regions.
- **Key Actions**:
  - Implement a localization manager supporting multi-lingual bot translation files (e.g. `en.json`, `es.json`, `vi.json`).
  - Add exchange rate API cron worker syncing currencies daily.
  - Allow customers to pick localized language interfaces inside the bot storefront.

---

## Phase 9: Automated Payments (Digital Integrations)
- **Objective**: Move beyond manual screenshot verification to automated checkouts.
- **Key Actions**:
  - Integrate **Telegram Stars API** for native digital item checkouts.
  - Setup **Stripe Webhook API integration** for card processing inside Telegram WebApp frames.
  - Connect **TON/USDT Cryptographic Payments** (monitor blockchain wallet transactions matching unique memo numbers to automate verification).

---

## Phase 10: Inventory Sync & ERP Integrations
- **Objective**: Synchronize SuperBot inventory with external retail outlets.
- **Key Actions**:
  - Build integration plugins for **Shopify**, **WooCommerce**, and **Lazada/Shopee**.
  - Write webhooks updating database product quantities when external items sell out.
  - Expose API endpoints allowing developers to push products directly from ERP systems.

---

## Phase 11: Shipping & Logistics Integration
- **Objective**: Automate delivery estimates, shipping fee calculations, and tracking dispatches.
- **Key Actions**:
  - Integrate shipping calculators (e.g. **EasyPost**, **FedEx**, or local postal API services).
  - Automatically calculate shipping costs at checkout based on user location.
  - Auto-generate shipping label PDFs and dispatch tracking codes directly to the customer's Telegram thread.

---

## Phase 12: Live Support Agent Chat Console
- **Objective**: Let dashboard operators interact directly with customers in real-time.
- **Key Actions**:
  - Implement **WebSocket (Socket.io)** connections on the dashboard.
  - Build a chat console where agents can pause the bot state machine, take over the conversation, type back, and unpause the bot when resolved.
