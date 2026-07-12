# TELEGRAM.md - Telegram Bot API Integration Spec

This document details the Telegram Bot API commands, payload structures, inline keyboards, and configuration methods.

---

## 1. Bot Command Registry

Upon connecting a new bot token, the server registers the standard command menu using the `setMyCommands` endpoint:

```
POST https://api.telegram.org/bot<BOT_TOKEN>/setMyCommands
Payload: {
  "commands": [
    {"command": "start", "description": "Browse shop products & categories"},
    {"command": "cart", "description": "View current shopping cart and checkout"},
    {"command": "orders", "description": "Check your order history and status"},
    {"command": "help", "description": "View payment info and merchant support"}
  ]
}
```

---

## 2. API Methods Implemented

To avoid heavy dependency trees and ensure control, the backend makes native HTTP requests to `https://api.telegram.org/bot<BOT_TOKEN>/<method>` using `axios`.

### Core Methods Used
- **`getMe`**: Verifies bot token validity and fetches the bot username during onboarding.
- **`sendMessage`**: Sends rich text updates supporting `MarkdownV2` styling.
- **`sendPhoto`**: Delivers product listings with description captions.
- **`sendDocument`**: Transmits generated PDF invoices.
- **`answerCallbackQuery`**: Acknowledges button clicks instantly to clear loading spinners on the user client.
- **`editMessageText` / `editMessageReplyMarkup`**: Implements in-place screen replacement for categories, products, and cart screens to avoid cluttering chat history.

---

## 3. Compact Callback Data Schema

Telegram limits callback button payload (`callback_data`) to **64 bytes**. We use a compressed, colon-separated namespace schema to fit metadata:

| Action | Callback Data Pattern | Description |
| :--- | :--- | :--- |
| **View Category** | `cat:<uuid_prefix>` | Displays products belonging to the selected category. |
| **View Product** | `prod:<uuid_prefix>` | Displays specific product details, price, and "Add to Cart" button. |
| **Add Product** | `add:<uuid_prefix>` | Appends product to cart, shows immediate "Added!" pop-up notification. |
| **Sub Product** | `sub:<uuid_prefix>` | Decrements quantity of a product in the cart. |
| **View Cart** | `cart_view` | Displays cart items, total sum, and "Proceed to Checkout" button. |
| **Checkout** | `checkout_start` | Triggers checkout questionnaire (name, address, phone). |
| **Confirm Order** | `order_confirm` | Generates order record and asks user to upload payment screenshot. |

*(Note: Because UUIDs are 36 characters, we index product/category records by a shortened 8-character unique hash or prefix to fit callback limits).*

---

## 4. Telegram WebApp Button Integration

To provide a premium e-commerce shopping experience, SuperBot supports launching a React storefront WebApp directly inside Telegram. WebApps can be invoked using two primary button configurations:

### 1. Inline Keyboard WebApp Buttons
Perfect for category context menus or single product showcases:
```json
{
  "inline_keyboard": [
    [
      {
        "text": "🛍️ Browse Shop WebApp",
        "web_app": {
          "url": "https://storefront.superbot.app/shop/8b08e2d4-1a3b"
        }
      }
    ]
  ]
}
```

### 2. Persistent Menu Keyboard Buttons
Placed in the bottom chat interface for quick launch access:
```json
{
  "keyboard": [
    [
      {
        "text": "📱 Open Storefront App",
        "web_app": {
          "url": "https://storefront.superbot.app/shop/8b08e2d4-1a3b"
        }
      }
    ]
  ],
  "resize_keyboard": true,
  "is_persistent": true
}
```

### 3. WebApp to Bot Data Communication
When checkout is finalized within the React WebApp, it submits the cart payload back to the Telegram conversation thread:
```javascript
// Triggered inside the React/Vite storefront webapp context
if (window.Telegram?.WebApp) {
  const payload = {
    action: "web_app_checkout",
    cartItems: [
      { productId: "prod-1", quantity: 2, price: 29.99 }
    ]
  };
  
  // Closes the WebApp window and fires a WebAppUpdate payload to the bot
  window.Telegram.WebApp.sendData(JSON.stringify(payload));
}
```
The Express webhook catches this under `message.web_app_data.data`, parses the JSON object, updates the checkout session cache, and transitions the conversation flow to `AWAITING_RECEIPT`.

---

## 4. Markdown Formatting Rules

All Telegram messages use `parse_mode: "MarkdownV2"`. You must escape special characters `_ * [ ] ( ) ~ ` > # + - = | { } . !` using a helper utility to avoid message delivery failures:

```typescript
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
```
Ensure all dynamic values (product titles, prices, names) pass through this escape utility before assembly.
