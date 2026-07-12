# AUTH.md - Authentication and Authorization Specs

This document defines the authentication architecture for Dashboard Merchants and Telegram Bot Customers.

---

## 1. Merchant Dashboard Authentication

Merchant authentication relies on stateful login verified via stateless **JSON Web Tokens (JWT)**.

```
+------------+   Login Request (Credentials)   +---------------+
|  Dashboard | ------------------------------> | Express Auth  |
|   Client   | <------------------------------ | Controller    |
+------------+       Success JWT Token         +---------------+
      |                                                |
      | HTTP Request + Headers                         |
      | Authorization: Bearer <token>                  |
      +------------------------------------------------v
                                               +---------------+
                                               | JWT Auth      |
                                               | Middleware    |
                                               +---------------+
                                                       | (Decrypted Context)
                                                       v
                                               +---------------+
                                               | Tenant Access |
                                               | Middleware    |
                                               +---------------+
```

### Encryption
- **Hash Algorithm**: `bcrypt` (10 salt rounds).
- **Session Tokens**: JWT (HMAC-SHA256) stored in HTTP-Only cookies or LocalStorage.
- **Payload Structure**:
  ```json
  {
    "merchantId": "e6a4b163-d34e-4f71-a477-d5d1c23f79a1",
    "email": "merchant@example.com",
    "exp": 1752321600
  }
  ```

---

## 2. Authentication and Access Middlewares

### 1. `authMiddleware`
Intercepts requests, extracts the JWT from the `Authorization` header, and assigns `req.merchant` to the Express Request context.
- **Header format**: `Authorization: Bearer <JWT>`
- **Failures**: Returns `401 Unauthorized` if token is missing, expired, or invalid.

### 2. `shopAccessMiddleware`
Enforces tenant isolation by checking if the requested `:shopId` in the path belongs to the logged-in merchant.
- **Check**: Queries `Shop` repository to verify `shop.merchantId === req.merchant.id`.
- **Failures**: Returns `403 Forbidden`.

---

## 3. Telegram Webhook & WebApp Validation

To ensure incoming bot requests and WebApp configurations originate from legitimate Telegram interactions, we perform HMAC signature checks.

### Signature Verification Algorithm
Telegram hashes the bot's raw API Token to create the validation key. We verify data received from Telegram WebApps using this key:

```typescript
import crypto from "crypto";

export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  // Sort parameter keys alphabetically, excluding the hash itself
  const keys = Array.from(params.keys())
    .filter((k) => k !== "hash")
    .sort();
    
  const dataCheckString = keys
    .map((key) => `${key}=${params.get(key)}`)
    .join("\n");

  // Generate WebApp secret key
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // Compute validation hash
  const computedHash = crypto
     .createHmac("sha256", secretKey)
     .update(dataCheckString)
     .digest("hex");

  return computedHash === hash;
}
```

This verification ensures that attackers cannot forge requests pretending to be customer accounts or execute orders on another user's behalf.
