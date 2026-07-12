# MEMORY.md - Shared Technical Project Context

This document captures historical context, technical design choices, and architectural rationales for the SuperBot project.

---

## 1. Core Technical Decisions Record

### Choice A: Express + Prisma over NestJS
- **Decision**: Use Express.js with a modular Service-Repository pattern instead of nest.js.
- **Rationale**: Keeps the codebase lightweight and startup times extremely fast, which is critical for deployments on serverless or resource-constrained environments (like Render Free/Starter tiers). Developers have full transparency on dependencies without Nest's heavy injection overhead.

### Choice B: Telegram Webhooks over Long Polling
- **Decision**: Exclusively use webhook-based bot updates (`POST /webhook/:shopId`).
- **Rationale**: Long polling requires maintaining persistent socket connections per bot. For a multi-tenant SaaS hosting hundreds of customer shops, spawning polling processes per token is resource-heavy and fails to scale. Webhooks leverage standard stateless Express routers, scaling linearly with server capacity.

### Choice C: Manual Bank Transfer Verification
- **Decision**: Launch with manual screenshot verification as the primary gateway, followed by automated processors.
- **Rationale**: Many small businesses in target regions (Southeast Asia, Latin America) transact primarily using local bank rails (SQR, Pix, bank apps) rather than Stripe or credit cards. Screenshot checking provides immediate utility without high transaction fees or merchant onboarding delays.

---

## 2. Shared Understandings

- **Backward Compatibility Priority**: Since each shop runs its live business continuously, updating columns or API models must be handled without stopping existing webhooks.
- **Database Indexing Awareness**: Do not search on non-indexed text fields in high-frequency bot calls. Always structure callback query data to reference short hashes or unique index keys.
- **Zero-Mock Policy**: In early phases, developers may be tempted to write mock order processors. This is banned. The codebase must have concrete database logs and file uploads implemented to prevent bugs when transitioning to staging environments.
