# SuperBot Engineering Documentation

## Project

SuperBot is a production-ready multi-tenant Telegram Shop Management SaaS.

Each shop connects its own Telegram bot and manages products, customers, orders, payment screenshots, broadcasts and CRM from one dashboard.

---

# Technology Stack

Frontend

- React
- Vite
- TypeScript
- TailwindCSS
- Shadcn UI

Backend

- Node.js
- Express
- TypeScript

Database

- Supabase PostgreSQL

ORM

- Prisma ORM

Authentication

- JWT
- bcrypt

Storage

- Supabase Storage

Deployment

- Render

Telegram

- Telegram Bot API
- Webhook

Invoice

- HTML → PDF

API

- REST API

Architecture

- Multi Tenant
- Service Layer
- Repository Pattern
- Production Ready

---

# Documentation Structure

Read these files in order.

## Foundation

1. AGENTS.md
2. PROJECT.md
3. PRD.md
4. ARCHITECTURE.md
5. CODING_RULES.md

## Backend

6. DATABASE.md
7. API.md
8. AUTH.md
9. STORAGE.md
10. WEBHOOK.md

## Telegram

11. TELEGRAM.md
12. BOT_FLOW.md
13. NOTIFICATIONS.md
14. INVOICE.md

## Dashboard

15. DASHBOARD.md
16. UI_UX.md
17. COMPONENTS.md

## Production

18. SECURITY.md
19. PERFORMANCE.md
20. TESTING.md
21. DEPLOYMENT.md

## Development

22. TASKS.md
23. ROADMAP.md
24. CHANGELOG.md

## AI

25. PROMPTS.md
26. MEMORY.md
27. CONTEXT.md

## Advanced

28. ERROR_HANDLING.md
29. STATE_MACHINE.md
30. IDEMPOTENCY.md

---

# AI Development Rules

Every AI coding agent MUST:

- Read all documentation before writing code.
- Follow the documented architecture.
- Never rename database columns.
- Never rename API endpoints.
- Never change webhook routes.
- Never rewrite working code without approval.
- Never break backward compatibility.
- Never delete uploaded files.
- Never change Telegram callback data.
- Never introduce duplicate business logic.
- Never bypass service layer.
- Never access the database directly from controllers.

---

# Build Order

Phase 1

Database

Webhook

Testing

STOP

Phase 2

Products

Testing

STOP

Phase 3

Orders

Screenshot Upload

Testing

STOP

Phase 4

Dashboard

Testing

STOP

Phase 5

Payment Confirmation

Invoice

Testing

STOP

Phase 6

Broadcast

Direct Message

CRM

Testing

STOP

Phase 7

Workflow Builder

Automation

Production Release

---

# Production Requirements

- Multi Tenant
- Production Ready
- Fully Typed
- RESTful
- Responsive
- Secure
- Scalable
- Tested
- Backward Compatible
- Zero Mock Data
- Zero Placeholder Code

---

# Deployment

Backend

Render Web Service

Frontend

Render Static Site

Database

Supabase PostgreSQL

Storage

Supabase Storage

Secrets

Render Environment Variables

Webhook

https://api.superbot.app/webhook/:shopId

---

# Definition of Done

A feature is complete only when:

✓ Build succeeds

✓ No TypeScript errors

✓ No runtime errors

✓ Database migration completed

✓ API documented

✓ UI completed

✓ Mobile responsive

✓ Telegram tested

✓ Backward compatible

✓ Production ready

---

Documentation is the source of truth.

Code must always follow documentation.