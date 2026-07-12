# WEBHOOK.md - Telegram Webhook Architecture

This document describes how SuperBot handles webhook requests from Telegram, validates them, prevents duplicate processing, and handles retries.

---

## 1. Webhook Endpoint and Register Flow

Every active shop connects its own custom Telegram Bot. Webhooks are mapped using the shop's ID:
`POST /api/v1/webhook/:shopId`

When a shop is activated or its bot token is updated, the server triggers the webhook configuration:
```
POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
Payload: {
  "url": "https://api.superbot.app/api/v1/webhook/<shopId>",
  "secret_token": "<SECRET_TOKEN_UUID>",
  "allowed_updates": ["message", "callback_query"]
}
```

---

## 2. Webhook Security and Validation

To prevent malicious entities from flooding or spoofing the webhook endpoint, we enforce two layers of validation:

1. **Header Secret Token**: Telegram includes the `X-Telegram-Bot-Api-Secret-Token` header in all requests if configured. The backend compares this token with the stored `webhookSecret` generated during the shop set up.
2. **Shop Validation**: The route parameter `:shopId` must match an active shop in the database.

If validation fails, the server rejects the request immediately with `403 Forbidden`.

---

## 3. Idempotency Check

Telegram's delivery mechanism is "at least once". If our server takes longer than 2-3 seconds to respond, Telegram will retry the delivery, which can result in duplicate orders, double notifications, or broken user dialogues.

We prevent duplicates using a database-backed **Idempotency Guard**:
1. Every payload from Telegram contains a unique `update_id`.
2. Upon receiving the payload, we insert a new record into `WebhookLog` with `updateId`.
3. If the insert fails due to a unique index conflict (`updateId` already exists), we assume the update is currently processing or has already processed.
4. The endpoint immediately returns `200 OK` and stops execution.

---

## 4. Processing Pipeline

The webhook handler uses an asynchronous processing pattern:

```
[Telegram POST] 
       |
       v
[Extract: shopId, update_id, payload]
       |
       v
[DB check: WebhookLog.insert()] ---> (Duplicate update_id?) ---> YES: [Return 200 OK]
       |                                                                   ^
       NO                                                                  |
       v                                                                   |
[Async Worker: Trigger WebhookService.processUpdate()]                     |
       |                                                                   |
       v                                                                   |
[Return 200 OK immediately to Telegram] -----------------------------------+
       |
       +---> [Worker execution runs in background]
             - Match bot user to Customer.
             - Process command, callback_query, or image upload.
             - Dispatch bot response.
             - Mark WebhookLog as processed = true.
```

---

## 5. Webhook Error Logs & Retry Dashboard

If an update processing task encounters an error:
1. The error message and stack trace are caught.
2. The `WebhookLog` row is updated: `isProcessed = false`, `errorMessage = "Error description"`.
3. Platform admins can view failing updates in the dashboard.
4. A manual "Retry Webhook" button in the dashboard allows re-triggering the background worker using the stored update payload.
