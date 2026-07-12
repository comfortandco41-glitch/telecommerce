# DATABASE.md - Prisma Schema and Database Architecture

This document describes the database design, indexing strategy, and tenant separation constraints.

---

## 1. Prisma Schema Specification

SuperBot uses Supabase PostgreSQL. Below is the production-ready Prisma schema representing the data structures.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum OrderStatus {
  PENDING
  PENDING_VERIFICATION
  PAID
  SHIPPED
  CANCELLED
}

enum BroadcastStatus {
  PENDING
  SENDING
  SENT
  FAILED
}

model Merchant {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  shops        Shop[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Shop {
  id                  String      @id @default(uuid())
  merchantId          String
  merchant            Merchant    @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  botToken            String      @unique
  botUsername         String?
  name                String
  currency            String      @default("USD")
  paymentInstructions String      @db.Text
  welcomeMessage      String      @db.Text
  isActive            Boolean     @default(true)
  categories          Category[]
  products            Product[]
  customers           Customer[]
  orders              Order[]
  broadcasts          Broadcast[]
  webhookLogs         WebhookLog[]
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
}

model Category {
  id          String    @id @default(uuid())
  shopId      String
  shop        Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  name        String
  description String?   @db.Text
  isActive    Boolean   @default(true)
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([shopId])
}

model Product {
  id          String      @id @default(uuid())
  shopId      String
  shop        Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id])
  name        String
  description String      @db.Text
  price       Decimal     @db.Decimal(10, 2)
  stock       Int         @default(0)
  images      String[]    // Array of URLs from Supabase Storage
  isActive    Boolean     @default(true)
  orderItems  OrderItem[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([shopId, categoryId])
  @@index([shopId, isActive])
}

model Customer {
  id          String   @id @default(uuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  telegramId  BigInt   // Keep BigInt for 64-bit Telegram user IDs
  username    String?
  firstName   String
  lastName    String?
  phone       String?
  address     String?  @db.Text
  orders      Order[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([shopId, telegramId])
  @@index([shopId])
}

model Order {
  id                String      @id @default(uuid())
  shopId            String
  shop              Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  customerId        String
  customer          Customer    @relation(fields: [customerId], references: [id])
  status            OrderStatus @default(PENDING)
  totalAmount       Decimal     @db.Decimal(10, 2)
  deliveryAddress   String      @db.Text
  deliveryPhone     String
  bankScreenshotUrl String?     // Supabase storage path
  invoicePdfUrl     String?     // Supabase storage path
  items             OrderItem[]
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@index([shopId, customerId])
  @@index([shopId, status])
}

model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  quantity        Int
  priceAtPurchase Decimal  @db.Decimal(10, 2)
}

model Broadcast {
  id          String          @id @default(uuid())
  shopId      String
  shop        Shop            @relation(fields: [shopId], references: [id], onDelete: Cascade)
  messageText String          @db.Text
  mediaUrl    String?
  status      BroadcastStatus @default(PENDING)
  sentCount   Int             @default(0)
  failedCount Int             @default(0)
  scheduledAt DateTime?
  sentAt      DateTime?
  createdAt   DateTime        @default(now())

  @@index([shopId, status])
}

model WebhookLog {
  id          String   @id @default(uuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  updateId    BigInt   @unique // Used to enforce message idempotency
  payload     Json
  isProcessed Boolean  @default(false)
  errorMessage String? @db.Text
  createdAt   DateTime @default(now())

  @@index([shopId, createdAt])
}
```

---

## 2. Database Indexes Strategy

We define index compound boundaries to optimize performance:
1. `@@unique([shopId, telegramId])` in Customer ensures we don't duplicate customers inside the same shop, but supports customers using the same telegram accounts across different merchant shops.
2. `@@index([shopId, categoryId])` and `@@index([shopId, isActive])` in Product optimizes shop queries inside Telegram Bot where category filters are executed repeatedly.
3. `@@index([shopId, status])` in Order yields fast dashboard counts (`Paid`, `Pending Verification`, etc.).
4. `@unique` constraint on `WebhookLog.updateId` supports fast idempotency checks when multiple identical payloads hit the server during spikes.

---

## 3. Data Integrity & Migration Principles
- **No Direct Schema Manipulation**: All modifications must flow through Prisma Migrate (`npx prisma migrate dev`).
- **No Column Deletions/Renames**: When changing properties, add the new field first, write a backfill script, deprecate the old column, and drop it in subsequent releases to protect active tenants.
