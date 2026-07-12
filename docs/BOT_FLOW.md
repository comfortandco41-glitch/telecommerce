# BOT_FLOW.md - Telegram Customer Bot Interaction Flow

This document details the step-by-step user experience flows and conversational state machine inside the customer Telegram Bot.

---

## 1. Customer Bot State Transitions

To manage complex checkout flows across multiple active users, we track conversational state inside the `Customer` database record under a `checkoutStep` column.

```
       +------------------+
       |   State: IDLE    | <------------------------------------+
       +------------------+                                      |
         |                                                       |
         | (Clicks Checkout)                                     |
         v                                                       |
       +------------------------+                                |
       | State: AWAITING_NAME   |                                |
       +------------------------+                                |
         |                                                       |
         | (Replies with Text)                                   |
         v                                                       |
       +---------------------------+                             |
       | State: AWAITING_ADDRESS   |                             |
       +---------------------------+                             |
         |                                                       |
         | (Replies with Text)                                   |
         v                                                       |
       +-------------------------+                               |
       | State: AWAITING_PHONE   |                               |
       +-------------------------+                               |
         |                                                       |
         | (Replies with Text)                                   |
         v                                                       |
       +---------------------------+                             |
       | State: AWAITING_RECEIPT   |                             |
       +---------------------------+                             |
         |                                                       |
         | (Uploads Photo Receipt)                               |
         +-------------------------------------------------------+
```

---

## 2. Conversation Flow Detailed Steps

### Step 1: Shop Entry (`/start`)
- **Action**: User types `/start` or clicks the link.
- **Bot Response**: Welcomes the customer by name. Displays the store's `welcomeMessage` and inline buttons listing top-level categories.
- **Buttons**:
  - `[ 💿 Vinyl Records ]`  `[ 👕 Apparel ]`
  - `[ 🛒 View Cart (0) ]`

### Step 2: Category and Product Browsing
- **Action**: User clicks `[ 💿 Vinyl Records ]`.
- **Bot Response**: Edits the welcome message. Lists products in that category.
- **Buttons**:
  - `[ Pink Floyd - $29.99 ]`
  - `[ Led Zeppelin - $24.99 ]`
  - `[ ⬅️ Back to Categories ]`

- **Action**: User clicks `[ Pink Floyd - $29.99 ]`.
- **Bot Response**: Sends the product image, description, price, and cart controls.
- **Buttons**:
  - `[ ➕ Add to Cart ]`  `[ ➖ Remove ]`
  - `[ 🛒 View Cart (0) ]` `[ ⬅️ Back to Products ]`

### Step 3: Cart Management (`/cart`)
- **Action**: User clicks `[ 🛒 View Cart ]` or types `/cart`.
- **Bot Response**: Displays summary of items, quantities, sub-total, and checkout options.
- **Example text**:
  ```
  Your Shopping Cart:
  1x Pink Floyd - Dark Side ($29.99)
  Total: $29.99
  ```
- **Buttons**:
  - `[ 🏁 Proceed to Checkout ]`
  - `[ 🧹 Clear Cart ]`
  - `[ ⬅️ Continue Shopping ]`

### Step 4: Checkout Collection Questionnaire
If the customer has no stored contact profile:
1. **AWAITING_NAME**: "Please enter your Full Name:"
2. **AWAITING_ADDRESS**: "Please enter your Delivery Address:"
3. **AWAITING_PHONE**: "Please enter your Phone Number:"

If profile exists, the bot prompts:
`"Confirm delivery to: [Stored Address]? [ Yes, Use Stored ] [ No, Change Details ]"`

### Step 5: Payment Instructions & Receipt Upload
- **Action**: Checkout info confirmed.
- **Bot Response**: Sets state to `AWAITING_RECEIPT`. Outputs the total cost, currency, merchant bank credentials, and instructions.
  ```
  Order Summary:
  - 1x Pink Floyd ($29.99)
  Total Due: $29.99
  
  Please transfer to:
  Bank: Chase Bank
  Account: 1234-5678-9012
  Name: SuperBot Retailers
  
  ⚠️ Once transfer is complete, please upload the transaction receipt PHOTO directly to this chat.
  ```
- **Action**: Customer uploads photo.
- **Bot Response**: Webhook downloads photo, shifts state to `IDLE`, sets Order to `PENDING_VERIFICATION`, and outputs:
  `"Thank you! We received your payment screenshot. Our team will review the transaction and notify you shortly."`
