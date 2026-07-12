# IDEMPOTENCY.md - Idempotent Operations Specifications

This document defines the rules, database configurations, and design patterns used to prevent duplicate operations in SuperBot.

---

## 1. Webhook Update Idempotency

Telegram retries update deliveries if it fails to receive a HTTP `200 OK` response within a few seconds. We handle this at the router layer using the Telegram `update_id`.

### Mechanics
1. Incoming POST requests contain `update_id` (e.g., `850284029`).
2. The server attempts to write to the `WebhookLog` database table before parsing business operations:
   ```typescript
   try {
     await prisma.webhookLog.create({
       data: {
         updateId: BigInt(payload.update_id),
         shopId: shopId,
         payload: payload
       }
     });
   } catch (err: any) {
     if (err.code === "P2002") { // Prisma unique constraint code
       // Duplicate update detected. Acknowledge and ignore.
       return res.status(200).send("Duplicate update ignored.");
     }
     throw err;
   }
   ```
3. By responding with `200 OK` immediately, we stop Telegram's retry cycle while ensuring the update is processed exactly once.

---

## 2. Double-Click Prevention during checkout

When a customer clicks the `[ Confirm Order ]` inline keyboard button, button latency can lead to users double-tapping the button. This can result in two identical orders created in parallel.

### Implementation: Checkout Locks
We enforce a temporary lock on orders using the customer's database ID.
1. When `order_confirm` is received, query the database for orders with status `PENDING` or `PENDING_VERIFICATION` created by this `customerId` within the last **30 seconds**.
2. If an order exists with identical cart items, discard the second request and output: `"Your order is already processing. Please upload payment receipt."`

---

## 3. Resilient File Upload Pipeline

If a webhook fails *after* a payment screenshot has been uploaded to Supabase Storage but *before* the database order update is written:
1. Telegram will retry the webhook.
2. The server receives the update, parses it, and discovers that the storage file already exists.
3. Instead of throwing an error or creating a duplicate file, the upload service checks for the presence of the file first using a `headObject` request.
4. If found, it skips the upload stream phase and proceeds directly to update the database record, linking the existing screenshot path.
5. This prevents storage bloat and resolves partial-failure conditions gracefully.
