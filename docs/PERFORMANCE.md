# PERFORMANCE.md - Performance Tuning & Caching

This document outlines standard response time targets, N+1 query prevention rules, and caching mechanisms.

---

## 1. Response Time Benchmarks

We enforce strict latency thresholds for API operations:

| Request Class | Target P95 Latency | Mechanism / Guardrail |
| :--- | :--- | :--- |
| **Incoming Bot Webhook** | `< 100ms` | Return `200 OK` instantly; process commands in background tasks. |
| **Dashboard Page API** | `< 200ms` | Parameterized indexes, select only necessary DB columns. |
| **Asset Uploads** | `< 1500ms` | backend compression before Supabase storage streaming. |
| **PDF Generation** | `< 3000ms` | Render Puppeteer buffer asynchronously, update bot message when done. |

---

## 2. DB Query Optimization & N+1 Prevention

A common performance pitfall is performing sub-queries inside a loop (N+1 problem):

```typescript
// BAD: Triggers a DB lookup for every single product iteration
const products = await prisma.product.findMany();
const productsWithCategories = await Promise.all(products.map(async (p) => {
  const category = await prisma.category.findUnique({ where: { id: p.categoryId } });
  return { ...p, category };
}));

// GOOD: Single joined query
const productsWithCategories = await prisma.product.findMany({
  include: {
    category: true
  }
});
```

### Prisma Query Constraints
1. **Always select subset columns** instead of pulling entire records if only a few fields are needed:
   ```typescript
   // Good
   prisma.product.findMany({
     select: { id: true, name: true, price: true }
   });
   ```
2. **Batch writing**: When creating multiple database rows (e.g., OrderItems during checkout), use `prisma.orderItem.createMany()` rather than looping over individual records.

---

## 3. Configuration Caching Strategy

The Telegram Webhook router receives updates continuously. Fetching the bot token, welcome text, and bank details from PostgreSQL on every message causes database performance issues.

### In-Memory Cache Pattern
Active shop configurations are cached locally using an LRU (Least Recently Used) cache:

```typescript
import { LRUCache } from "lru-cache";

// Cache configs for max 1000 shops, expire after 10 minutes
const shopConfigCache = new LRUCache<string, CachedShopConfig>({
  max: 1000,
  ttl: 1000 * 60 * 10 
});

export async function getCachedShopConfig(shopId: string): Promise<CachedShopConfig> {
  const cached = shopConfigCache.get(shopId);
  if (cached) return cached;

  const config = await db.shop.findUnique({
    where: { id: shopId }
  });
  
  if (config) {
    shopConfigCache.set(shopId, config);
  }
  return config;
}
```

### Cache Invalidation Rule
Whenever a Merchant modifies settings on the dashboard (`PUT /api/v1/shops/:shopId`), the controller must explicitly invalidate the corresponding cache key:
```typescript
shopConfigCache.delete(shopId);
```
This forces the subsequent webhook transaction to fetch the fresh token and welcome configuration from the database.
