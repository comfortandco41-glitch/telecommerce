# PROMPTS.md - AI Prompt Templates

This document provides reusable templates to guide coding assistants (like Gemini, Claude, or GPT) when implementing features for SuperBot.

---

## 1. Feature Implementation Prompt Template

Use this template when requesting an assistant to implement a new feature (e.g. adding a new field to products or orders):

```markdown
Role: Senior TypeScript Engineer
Context: You are working on the "SuperBot" multi-tenant Telegram Shop SaaS.
Stack: React (Vite, Tailwind, Shadcn), Node/Express TS backend, Prisma, Supabase PostgreSQL.

Task: Implement [Feature Description]

Constraints:
1. Always follow the layered Service-Repository pattern outlined in docs/ARCHITECTURE.md.
2. Ensure tenant data isolation using the shopId context as defined in docs/DATABASE.md.
3. Throw errors using the unified error handler class system defined in docs/ERROR_HANDLING.md.
4. Do not use placeholder code or mock data. Write production-quality code.
5. All database operations must go through a Repository layer, never directly inside a Service or Controller.

Steps Required:
1. Show the Prisma schema changes needed (if any) and state the migration instructions.
2. Implement repository logic in `src/repositories/`.
3. Implement business logic and checks in `src/services/`.
4. Create Express routes and controller handlers in `src/controllers/`.
5. Develop frontend components using React and Shadcn UI.
6. Provide unit and integration tests using Jest.
```

---

## 2. API Endpoint Generator Template

Use this template when you need to generate a new REST API endpoint:

```markdown
Role: Backend Node.js API Designer
Context: SuperBot Backend API router.

Task: Generate REST endpoint `[HTTP_METHOD] [PATH]` for [Description of action].

Payload Inputs:
- Query parameters: [List query params]
- Request Body: [JSON schema of body]

Response Format:
- Enforce the global success/error response envelope specified in docs/API.md:
  {
    "success": true,
    "data": { ... }
  }

Please output:
1. Express Router mapping.
2. Request validation schema (using Zod validation middleware).
3. Controller logic extracting parameters, passing to service, and returning response.
4. Mocked service method declaration showing input and return types.
```

---

## 3. Bot Command Handler Template

Use this template when configuring new interactive conversational dialogues:

```markdown
Role: Telegram Bot Engineer
Context: Webhook processing pipeline of SuperBot.

Task: Add callback query or command action handler for "[COMMAND/CALLBACK]".

Flow details:
- Trigger condition: [Condition]
- Expected customer state: [State]
- Database modifications: [e.g. update product stock, update user info]
- Bot message response: [Rich text in MarkdownV2, detail the message and buttons]
- Next state transition: [Next state in the state machine]

Please output:
1. Switch case logic to append to WebhookService update-type dispatcher.
2. Session update queries to modify Customer state database columns.
3. Message formatting code, ensuring special characters are escaped using the escapeMarkdownV2 helper.
```
