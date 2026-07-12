# CONTEXT.md - Developer Onboarding & Local Setup Guide

This document contains quick-start guidelines to prepare your workspace, run local environments, and test Telegram integrations.

---

## 1. Prerequisites

Before starting, install the following:
- **Node.js**: v18+ LTS
- **Docker**: For running a local PostgreSQL container (optional, otherwise use Supabase test project)
- **Ngrok**: For routing Telegram webhook callbacks to your local server

---

## 2. Local Environment Setup

### Step 1: Clone and Configure Environments
1. Duplicate the sample variables template:
   `cp .env.example .env`
2. Populate the `.env` values (generate a mock `JWT_SECRET` and add your Supabase or local DB string).

### Step 2: Database Initialization
Install dependencies, generate the Prisma client client classes, and push the schema structure:
```bash
# Install dependencies
npm install

# Push database schema structures to PostgreSQL
npx prisma db push

# Open database studio GUI (optional, to view tables)
npx prisma studio
```

### Step 3: Run Development Servers
Start the backend Express server and Vite frontend dashboard:
```bash
# Run backend development server (listens on port 10000)
npm run dev:backend

# Run frontend dashboard (opens on port 5173)
npm run dev:frontend
```

---

## 3. Webhook Testing and Tunneling (Ngrok)

Telegram cannot send callbacks to `localhost`. You must expose your local port `10000` using a public tunnel:

1. **Fire up Ngrok**:
   ```bash
   ngrok http 10000
   ```
2. **Retrieve public URL**:
   Copy the HTTPS address provided by Ngrok (e.g. `https://1234-56-78.ngrok-free.app`).
3. **Register local URL with Telegram**:
   Make a request using `curl` to bind a mock bot token to your tunnel:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_TEST_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://1234-56-78.ngrok-free.app/api/v1/webhook/<YOUR_TEST_SHOP_ID>"}'
   ```
4. Send a message to your Telegram bot. You should immediately see incoming request logs in your Express terminal dashboard.
