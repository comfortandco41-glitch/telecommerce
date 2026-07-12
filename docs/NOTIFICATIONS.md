# NOTIFICATIONS.md - Alert Systems & Message Templates

This document outlines the system notifications, triggers, templates, and Telegram rate-limiting protocols.

---

## 1. Merchant Admin Telegram Notifications

Merchants can configure an `adminTelegramChatId` (individual account or group chat) to receive real-time notifications about shop actions.

### Trigger: Order Submitted (`PENDING_VERIFICATION`)
```
🔔 *New Order Received!*
Shop: My Retro Shop
Order ID: `fc406ba1-0fb8`
Customer: John Doe (@johndoe)
Total Amount: $29.99

🔗 [Review Receipt in Dashboard](https://dashboard.superbot.app/shops/8b08e2d4/orders/fc406ba1)
```

---

## 2. Customer Order Status Notifications

These templates are sent automatically to the customer's Telegram chat whenever the merchant edits an order's status in the dashboard.

### Trigger: Order Approved (`PAID`)
```
✅ *Payment Verified!*

Dear John, your payment for Order `fc406ba1` has been successfully verified. We are packaging your items.

📄 *Attached:* Your PDF Invoice
```
*(Backend operation: The system generates the invoice PDF and sends it immediately using `sendDocument` as part of the same transaction).*

### Trigger: Order Dispatched (`SHIPPED`)
```
🚚 *Your Order Has Been Shipped!*

Your order `fc406ba1` is on its way.
📦 *Tracking Code:* `DHL-74920491-US`
🚚 *Carrier:* DHL Express

Thank you for shopping with us!
```

### Trigger: Order Rejected (`CANCELLED`)
```
❌ *Order Cancelled*

Your order `fc406ba1` was cancelled.
💬 *Reason:* The uploaded payment screenshot was invalid or could not be verified in our bank statement.

If you have questions, reply directly to this chat to reach support.
```

---

## 3. Telegram API Rate Limits & Throttling

Telegram enforces strict boundaries for bot broadcasts:
- Max **30 messages per second** to different users.
- Max **20 messages per minute** inside a single group chat.

### Broadcast Queue Implementation
To avoid hitting HTTP `429 Too Many Requests`, broadcasts are processed using a rate-limited queue worker (e.g., using `bullmq` or a local async generator):

```typescript
import { delay } from "../utils/time";

export async function processBroadcastQueue(customers: string[], messageText: string, botToken: string) {
  const batchSize = 25; // Keep under the 30-message limit
  
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (chatId) => {
        try {
          await telegramClient.sendMessage(botToken, chatId, messageText);
        } catch (err) {
          console.error(`Failed to send message to ${chatId}:`, err);
        }
      })
    );
    
    // Throttle: Pause 1.1 seconds between batches
    await delay(1100);
  }
}
```
This throttling implementation ensures the bot remains compliant with Telegram API limits.
