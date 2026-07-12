# DASHBOARD.md - Merchant Dashboard View Specs

This document defines the pages, views, layouts, and data requirements for the React-based Merchant Web Dashboard.

---

## 1. Grid Layout and Global Navigation

The dashboard uses a responsive **Sidebar + Top Header** persistent layout:
- **Sidebar**: Links to Dashboard Home, Orders, Products, Customers, Broadcasts, Settings, and Developer Logs.
- **Top Header**: Shop selector dropdown (for multi-shop merchants), user profile dropdown, and system status indicator (Webhook health check).

---

## 2. Views Specification

### View A: Overview Analytics Home
- **Metric Cards**:
  - *Total Revenue*: Calculated from `PAID` orders.
  - *Active Customers*: Number of rows in `Customer`.
  - *Conversion Rate*: `PAID` orders divided by unique active customer count.
  - *Pending Verification Badge*: Glowing amber card displaying count of orders in `PENDING_VERIFICATION` status.
- **Charts**:
  - *Sales over Time*: Area chart displaying sales aggregated by Day/Week.
  - *Subscriber Growth*: Line chart mapping Telegram subscriber signups.

### View B: Orders Manager (Interactive)
- **Table Columns**: `Order ID` (shortened), `Customer`, `Date`, `Total Price`, `Status Badge`.
- **Status Badges**:
  - `PENDING`: Grey.
  - `PENDING_VERIFICATION`: Pulsing Yellow.
  - `PAID`: Green.
  - `SHIPPED`: Blue.
  - `CANCELLED`: Red.
- **Order Details Drawer (Shadcn Sheet)**:
  - Displays customer name, phone, address, and item list.
  - Displays the uploaded payment receipt image.
  - Action buttons:
    - **`[ Approve Payment ]`** (Changes status to `PAID`, triggers invoice generation).
    - **`[ Reject Order ]`** (Opens a text area for rejection reasons, changes status to `CANCELLED`, notifies customer).

### View C: Product & Inventory Catalog
- **Category Manager**: Add, delete, and rename categories.
- **Product Table**: List products, prices, and stock levels.
- **Add Product Modal**:
  - Dropdown select category.
  - Input fields for title, description, price, stock.
  - Drag-and-Drop Image Uploader (posts directly to `/api/v1/storage/upload` endpoint and appends return URL to image array).

### View D: CRM and Customers Directory
- **Customer List**: Lists all subscriber users. Shows their Telegram handles, total orders completed, and total lifetime value (LTV).
- **Customer Detail Drawer**: Lists order history of that specific customer and allows the merchant to send a direct message (DM) back to the user via the bot.

### View E: Broadcast Composer
- **Rich Editor**: Simple Markdown text editor.
- **Attachment Section**: Allows adding a single cover image.
- **Audience Segment Tool**: Filters target customers (e.g. "All users", "LTV > $50", "Users with 0 purchases").
- **Dispatch buttons**: `[ Send Now ]` (initiates background worker) and `[ Schedule for later ]` (specifies future date).
