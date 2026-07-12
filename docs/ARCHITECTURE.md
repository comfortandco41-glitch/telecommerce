# ARCHITECTURE.md - System Architecture and Layers

This document outlines the software architecture, design patterns, and modular structure of the SuperBot SaaS.

---

## 1. High-Level Architecture Pattern

SuperBot is structured as a **Layered Clean Architecture** using the **Service-Repository** pattern. This enforces separation of concerns, decouples business logic from external frameworks, and simplifies writing automated tests.

```
       +---------------------------------------------+
       |             HTTP Routing Layer              |
       |  (Express Controllers & Telegram Webhooks)  |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |                Service Layer                |
       |  (Business Logic, Workflows, Integrations)   |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |              Repository Layer               |
       |     (Prisma DB Queries & Tenant Filters)    |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |               Database Layer                |
       |            (Supabase PostgreSQL)            |
       +---------------------------------------------+
```

### Architectural Rules
1. **Controllers** only translate HTTP requests/webhooks into service arguments, check basic schema validation, and send HTTP responses.
2. **Services** contain core business logic, orchestrate third-party integrations (Supabase Storage, Telegram API, PDF generation), and manage transactions.
3. **Repositories** are the sole source of database queries. Services never instantiate Prisma client directly.
4. **No Controller Database Access**: Direct DB calls in handlers are strictly prohibited.

---

## 2. Multi-Tenancy Isolation Strategy

Multi-tenancy isolation is enforced at the **Repository Layer** through explicit `shopId` context.

```typescript
// Sample abstract Repository class forcing shopId encapsulation
export abstract class BaseRepository {
  protected shopId: string;
  
  constructor(shopId: string) {
    if (!shopId) {
      throw new Error("Repository instantiation requires a valid shopId context.");
    }
    this.shopId = shopId;
  }
}

// Example Implementation
export class ProductRepository extends BaseRepository {
  async getById(id: string) {
    return prisma.product.findFirst({
      where: {
        id,
        shopId: this.shopId // Tenant protection
      }
    });
  }
}
```

Every service instantiation is scoped to a specific `shopId`. The route controller extracts the `shopId` from the route params (e.g., `/api/v1/webhook/:shopId`) or from the decrypted JWT payload and injects it into the service constructors.

---

## 3. Webhook Handling Architecture

To prevent Telegram from resending messages due to timeouts, webhooks must be acknowledged immediately:

```
[Telegram Update] -> [WebhookController] -> (Fast Validation) 
                          |
                          +---> [Return 200 OK to Telegram] (Immediate, <100ms)
                          |
                          +---> [WebhookService.process(update)] (Async execution)
```

1. **Telegram Updates** arrive at `POST /api/v1/webhook/:shopId`.
2. **WebhookController** checks payload validity, matches the `shopId`, and triggers an asynchronous handling task before instantly returning a `200 OK` status back to Telegram.
3. **WebhookService** processes the callback query or command, retrieving the correct bot token from database cache and managing the user session state.
