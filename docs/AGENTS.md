# AGENTS.md

Welcome, AI Agent, to the SuperBot engineering team. This document defines the strict operational rules, guardrails, and architectural patterns you must adhere to while working on this codebase.

## 1. System Philosophy & Core Constraints

SuperBot is a production-ready, multi-tenant Telegram Shop Management SaaS. Every line of code written must be production-quality, fully typed, responsive, and secure.

### Critical Guardrails (Zero-Tolerance Policy)
- **Do NOT bypass the Service Layer**: Controllers/handlers must never call Prisma client or database repositories directly. Always invoke services.
- **Do NOT write direct database queries in controllers**: Use the Repository pattern. Repositories handle database interactions, Services handle business logic, and Controllers handle HTTP/Routing.
- **Do NOT rename database columns**: Any schema changes must be done via Prisma migrations and backward-compatible.
- **Do NOT rename existing API endpoints or webhook routes**: Changing `/webhook/:shopId` or core API paths breaks client/bot integrations.
- **Do NOT delete uploaded files**: When updating orders or payment screenshots, mark old files as inactive or archive them; never delete from Supabase storage without explicit tenant request.
- **Do NOT rewrite working code** without explicit user approval.
- **Do NOT use placeholder code or mock data**: Implement full, complete logic.

---

## 2. Technical Stack Context

Ensure your code uses the exact patterns of the following stack:
- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, Shadcn UI.
- **Backend**: Node.js, Express, TypeScript.
- **Database & ORM**: Supabase PostgreSQL with Prisma ORM.
- **Storage**: Supabase Storage buckets.
- **Telegram Integration**: Telegram Bot API via Webhooks.
- **Invoice Rendering**: HTML templates compiled to PDF (using a library like `puppeteer` or `pdfkit`).

---

## 3. Workflow for AI Agents

When implementing a task, follow this sequence:
1. **Locate & Read Docs**: Read files in `docs/` matching the feature domain before touching code.
2. **Database Changes**: Update `prisma/schema.prisma` first, run `npx prisma migrate dev`, and regenerate the Prisma client.
3. **Write Backend Logic**:
   - Write repository methods in `src/repositories/`.
   - Write business logic in `src/services/`.
   - Add routes and controller actions in `src/controllers/`.
4. **Write Tests**: Implement unit/integration tests before writing frontend code.
5. **Write Frontend UI**: Create responsive React components with Shadcn UI and TailwindCSS.
6. **Verify E2E**: Test the integration with the Telegram bot webhook (local simulation or tunneling tools like Ngrok).
7. **Definition of Done**: Validate that the build succeeds, TypeScript compiles without errors, database is migrated, and no mock data remains.

---

## 4. Interaction Style and Coding Rules

- **Strict TypeScript**: Never use `any` unless absolutely unavoidable (and documented with a `// eslint-disable-next-line`). Use precise interfaces.
- **Error Handling**: Use the unified error handler. Throw custom domain errors (e.g., `NotFoundError`, `UnauthorizedError`) with appropriate status codes and error messages.
- **Idempotency**: Webhook events and payment processes must be idempotent. Always check if a transaction or webhook ID was already processed.

Ensure you consult `docs/CODING_RULES.md` and `docs/ERROR_HANDLING.md` for detailed code patterns.
