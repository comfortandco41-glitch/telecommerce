# SECURITY.md - System Security Guidelines

This document details the security policies, defenses, and access limitations built into SuperBot.

---

## 1. Rate Limiting System

To prevent Denial of Service (DoS) attacks and abuse of public API endpoints, we implement IP-based rate limiting using the `express-rate-limit` middleware.

### Configurations
- **Global API routes**: Max **100 requests per 15 minutes** per IP.
- **Authentication routes (`/api/v1/auth/login`, `/api/v1/auth/register`)**: Max **5 requests per 15 minutes** per IP to defend against brute-force attacks.
- **Webhook Endpoint (`/api/v1/webhook/:shopId`)**:
  - We do not apply standard IP rate limiting here because Telegram requests originate from shared, dynamic API gateways.
  - Instead, we apply rate limiting based on the `:shopId` in memory to prevent a compromised or misconfigured token from spamming the system (max **120 requests per minute** per shop).

---

## 2. SQL Injection Defense

SuperBot protects database calls using **Prisma ORM's parameterized query engine**. Prisma constructs parameterized commands under the hood, ensuring variables are parsed as arguments and never compiled as executable SQL fragments.

### Strict Coding Rule
- **No string concatenation** in raw queries. If a raw query is required, use Prisma's sql template tag to force parameters:
  ```typescript
  // Forbidden
  await prisma.$queryRawUnsafe(`SELECT * FROM Product WHERE name = '${input}'`);

  // Required
  await prisma.$queryRaw`SELECT * FROM Product WHERE name = ${input}`;
  ```

---

## 3. CORS and Domain Restrictions

We use Express's `cors` package to block unauthorized browsers from hitting the API.

```typescript
import cors from "cors";

const allowedOrigins = [
  process.env.FRONTEND_URL, // Merchant dashboard
  "http://localhost:5173"   // Local dashboard dev
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow server-to-server calls or public bots (which don't send Origin header)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Blocked by CORS security policy."));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
});
```
*Note: The Webhook endpoint `/api/v1/webhook/:shopId` is registered on a separate router that bypasses CORS restrictions to ensure Telegram's POST updates are accepted.*

---

## 4. Production Secrets Management

- **No Secrets in Code**: Secrets are never hardcoded or committed to git.
- **Local Development**: Configured in `.env` (blacklisted in `.gitignore`).
- **Production (Render)**: Environmental secrets are managed through the Render dashboard panel.

### Checklist of Environment Variables
```env
# Database connection
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres?schema=public"

# Auth secrets
JWT_SECRET="super-secret-random-32-byte-hex"

# Supabase Object Storage
SUPABASE_URL="https://[project].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="service-role-key-for-write-permission"

# Domain Configuration
FRONTEND_URL="https://dashboard.superbot.app"
BACKEND_URL="https://api.superbot.app"
```
