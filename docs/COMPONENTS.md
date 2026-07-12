# COMPONENTS.md - Reusable Frontend Component Catalog

This document details the interface definitions, behaviors, and specifications for reusable UI components.

---

## 1. StatCard Component

Displays dashboard metrics with a visual change indicator and skeleton loader support.

### Props Definition
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number; // e.g. 12.5
    direction: "up" | "down";
  };
  isLoading?: boolean;
}
```
- **Visuals**: Displays values in large semi-bold typography (`text-2xl font-semibold`), using a green arrow up or red arrow down depending on the trend context.

---

## 2. BotStatusIndicator Component

Shows webhook connection health. Placed in the global header bar.

### Behavior
- On mount, calls `GET /api/v1/shops/:shopId/webhook-health`.
- Reads Telegram `getWebhookInfo` response from the backend.
- Displays state badge:
  - **Active (Green)**: Webhook is properly set up, no pending errors.
  - **Failing (Red)**: Webhook URL is blocked, SSL failed, or has multiple timeout retries in queue. Displays tooltip with the error message.
  - **Checking (Yellow/Pulsing)**: Initiating verification ping.

---

## 3. ImageUpload Component

Drag-and-drop file target used for upload fields (product images, settings avatar).

### Behavior
- Integrates with `useDropzone` (from `react-dropzone`).
- Validates limits (e.g. 2MB for product files) and rejects files with toast warnings on failure.
- Displays uploading progress indicator bar.
- Shows file thumbnail once uploaded, along with an overlay **Delete icon button** to reset.

---

## 4. OrderTable Component

Displays list of transactions with status updating dropdown menus.

### Props Definition
```typescript
interface OrderTableProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  pagination: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}
```
- **Dynamic Updates**: Modifying a status dropdown row triggers an immediate API request. During processing, a spinner replaces the dropdown row, which then updates with a success toast confirmation.

---

## 5. BroadcastHistoryItem Component

Lists details of executed or queued broadcast notifications.

### Visual Requirements
- Displays card layout:
  - Header: Message preview text and scheduled date.
  - Progress bar: Displays completion percentage (delivered vs. failed).
  - Status Badge: `PENDING`, `SENDING`, `SENT`, `FAILED`.
- Displays action button `[ Cancel Broadcast ]` only if the status is `PENDING`.
