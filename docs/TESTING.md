# TESTING.md - Test Architecture & Verification

This document describes the testing standards, frameworks, and commands for backend and frontend code.

---

## 1. Testing Frameworks

SuperBot uses a modular test suite:
- **Backend Unit & Integration Tests**: Jest with `ts-jest` and `supertest`.
- **Frontend Component Tests**: Vitest with React Testing Library.
- **End-to-End (E2E) Tests**: Playwright.

---

## 2. Backend Service Mocking (Jest)

Services rely heavily on external connections (Prisma client, Telegram API, Supabase Storage). We write isolated unit tests by mocking these dependencies.

### Mocking Prisma Client
We use `jest-mock-extended` to type-safely mock the Prisma client in unit tests.

```typescript
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { ProductService } from "./productService";
import { prisma } from "../db";

// Mock the global database client
jest.mock("../db", () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("ProductService.createProduct", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("should create a product and return it", async () => {
    const mockProduct = {
      id: "prod-1",
      name: "Vinyl Floyd",
      price: 29.99,
      stock: 10,
      shopId: "shop-1"
    };

    prismaMock.product.create.mockResolvedValue(mockProduct as any);

    const productService = new ProductService("shop-1");
    const result = await productService.createProduct({
      name: "Vinyl Floyd",
      price: 29.99,
      stock: 10
    });

    expect(result.name).toBe("Vinyl Floyd");
    expect(prismaMock.product.create).toHaveBeenCalledTimes(1);
  });
});
```

---

## 3. Frontend Component Testing (Vitest)

Vitest is configured native to Vite. We test UI components by rendering them into a virtual DOM and asserting styles and events.

### Example: Testing StatCard
```typescript
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard Component", () => {
  it("renders the title and value correctly", () => {
    render(
      <StatCard 
        title="Total Sales" 
        value="$1,234.00" 
        icon={<span>Icon</span>} 
      />
    );
    
    expect(screen.getByText("Total Sales")).toBeInTheDocument();
    expect(screen.getByText("$1,234.00")).toBeInTheDocument();
  });
});
```

---

## 4. End-to-End Testing (Playwright)

Playwright simulates a full browser session, running against a test database environment.

### Core E2E Journeys Automated:
1. **Merchant Signup**: Create account, submit shop bot token.
2. **Catalog Creation**: Add category, upload product image, save.
3. **Receipt Validation**: View order list, open sheet, approve receipt, check badge updates to paid.

---

## 5. Execution Commands

Keep these scripts in `package.json` for testing:

- **Run all tests**: `npm run test`
- **Run Backend tests**: `npm run test:backend`
- **Run Frontend tests**: `npm run test:frontend`
- **Run Playwright E2E tests**: `npm run test:e2e`
- **Generate coverage report**: `npm run test:coverage`
