# CODING_RULES.md - Coding Standards and Conventions

This document defines the code quality, formatting, styling, and naming standards to ensure consistency and maintainability across the SuperBot SaaS codebase.

---

## 1. TypeScript Rules

Strict TypeScript is enforced at the compiler level.
- **No `any` Type**: Do not use the `any` type. If a type is unknown (e.g., raw API payloads), use `unknown` and validate it using schema libraries (e.g., Zod) or type guards.
- **Explicit Return Types**: All exported functions, service methods, and repository operations must explicitly specify their return type.
- **Prefer Interface over Type**: Use `interface` for object shapes that may be extended, and `type` for unions, intersections, or primitives.

```typescript
// Good
export interface ProductPayload {
  name: string;
  price: number;
}

// Avoid
export type ProductPayload = {
  name: string;
  price: number;
}
```

---

## 2. Naming Conventions

Consistency in naming makes the codebase easy to navigate:
- **Files and Folders**:
  - Use `camelCase` for directories (e.g., `src/repositories`, `src/controllers`).
  - Use `kebab-case` for utility files or config files (e.g., `tailwind.config.js`).
  - Use `PascalCase` for React components and component files (e.g., `ProductCard.tsx`).
  - Use `camelCase` for backend source files (e.g., `orderService.ts`).
- **Variables and Functions**: Always use `camelCase`.
- **Classes, Types, and Interfaces**: Always use `PascalCase`.
- **Database Tables and Columns**: Table names are PascalCase (Prisma convention). Columns are `camelCase`.
- **Environment Variables**: Always `UPPER_CASE_WITH_UNDERSCORES`.

---

## 3. Clean Code & Architecture Rules

- **Guard Clauses First**: Avoid nested `if` statements. Handle error/exit conditions first.

```typescript
// Good
if (!order) {
  throw new NotFoundError("Order not found");
}
if (order.status !== "PENDING") {
  throw new ValidationError("Order is already processed");
}
// execute main logic

// Avoid
if (order) {
  if (order.status === "PENDING") {
    // execute main logic
  } else {
    throw new ValidationError("Order is already processed");
  }
} else {
  throw new NotFoundError("Order not found");
}
```

- **Single Responsibility Principle (SRP)**: Keep functions and classes small. A service method should perform one business task. If a method exceeds 50 lines, evaluate splitting it.

---

## 4. Git Commit Guidelines

We follow **Conventional Commits**:
Format: `<type>(<scope>): <subject>`

Types:
- `feat`: A new user-facing feature.
- `fix`: A bug fix.
- `docs`: Documentation-only changes.
- `style`: Formatting, missing semi-colons, style adjustments (no code change).
- `refactor`: Restructuring code without changing behavior.
- `test`: Adding or correcting tests.
- `chore`: Build steps, dependency updates, tools.

Example:
`feat(webhook): add Telegram signature validation middleware`
