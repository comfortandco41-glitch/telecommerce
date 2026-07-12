import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/db/client";
import { telegramClient } from "../src/services/telegramClient";
import { mockReset } from "jest-mock-extended";
import { WebhookService } from "../src/services/webhookService";
import { Decimal } from "@prisma/client/runtime/library";
import jwt from "jsonwebtoken";

// Mock the database client singleton
jest.mock("../src/db/client", () => {
  const { mockDeep } = require("jest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep(),
  };
});

// Mock the Telegram Client
jest.mock("../src/services/telegramClient", () => ({
  telegramClient: {
    sendMessage: jest.fn().mockResolvedValue({ ok: true }),
    editMessageText: jest.fn().mockResolvedValue({ ok: true }),
    answerCallbackQuery: jest.fn().mockResolvedValue({ ok: true }),
  },
}));

const prismaMock = prisma as any;
const telegramClientMock = telegramClient as any;

describe("Phase 2 Catalog - REST Endpoints and Bot Flows", () => {
  const shopId = "shop-uuid-123";
  const botToken = "test-bot-token";
  const merchantId = "merchant-uuid-111";
  const JWT_SECRET = process.env.JWT_SECRET || "local-jwt-secret-key-32-bytes-long";
  const token = jwt.sign({ id: merchantId, email: "merchant@test.com" }, JWT_SECRET);

  beforeEach(() => {
    mockReset(prismaMock);
    telegramClientMock.sendMessage.mockResolvedValue({ ok: true });
    telegramClientMock.editMessageText.mockResolvedValue({ ok: true });
    telegramClientMock.answerCallbackQuery.mockResolvedValue({ ok: true });

    prismaMock.customer.findFirst.mockResolvedValue({ id: "cust-1", checkoutStep: "IDLE", cart: [] });
    prismaMock.customer.create.mockResolvedValue({ id: "cust-1", checkoutStep: "IDLE", cart: [] });

    prismaMock.merchant.findUnique.mockResolvedValue({ id: merchantId, email: "merchant@test.com", name: "Jane" });
    prismaMock.shop.findUnique.mockResolvedValue({ id: shopId, merchantId });
  });

  describe("REST API - Categories", () => {
    it("should create a category on valid input", async () => {
      const mockCategory = { id: "cat-1", name: "Vinyls", description: "Old pressings", shopId };
      prismaMock.category.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/categories`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Vinyls", description: "Old pressings" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("Vinyls");
      expect(prismaMock.category.create).toHaveBeenCalledTimes(1);
    });

    it("should reject category creation with empty name", async () => {
      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/categories`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("BAD_REQUEST");
    });
  });

  describe("REST API - Products", () => {
    it("should reject product creation if category does not exist in shop", async () => {
      prismaMock.category.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/products`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          categoryId: "invalid-cat",
          name: "Led Zeppelin III",
          description: "Remastered edition",
          price: 24.99,
          stock: 5,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should create product when inputs and category are valid", async () => {
      const mockCategory = { id: "cat-1", name: "Vinyls", shopId };
      prismaMock.category.findFirst.mockResolvedValue(mockCategory);

      const mockProduct = {
        id: "prod-1",
        categoryId: "cat-1",
        name: "Led Zeppelin III",
        description: "Remastered edition",
        price: new Decimal(24.99),
        stock: 5,
        images: [],
        shopId,
      };
      prismaMock.product.create.mockResolvedValue(mockProduct);

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/products`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          categoryId: "cat-1",
          name: "Led Zeppelin III",
          description: "Remastered edition",
          price: 24.99,
          stock: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("Led Zeppelin III");
      expect(prismaMock.product.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("Webhook Bot Flow Storefront Interactions", () => {
    it("should respond with welcome message and active categories list on /start", async () => {
      const mockShop = { id: shopId, botToken, welcomeMessage: "Welcome to Retro!" };
      prismaMock.shop.findUnique.mockResolvedValue(mockShop);

      const mockCategories = [
        { id: "cat-1", name: "Vinyls", isActive: true },
        { id: "cat-2", name: "Apparel", isActive: true },
      ];
      prismaMock.category.findMany.mockResolvedValue(mockCategories);

      const webhookService = new WebhookService();
      const payload = {
        update_id: 9901,
        message: {
          chat: { id: 8877 },
          from: { id: 8877, first_name: "John", last_name: "Doe", username: "johndoe" },
          text: "/start",
        },
      };

      await webhookService.processUpdate(shopId, payload);

      expect(telegramClientMock.sendMessage).toHaveBeenCalledWith(
        botToken,
        8877,
        "Welcome to Retro\\!",
        expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({ text: "🛍️ Launch WebApp Storefront" }),
            ]),
            expect.arrayContaining([
              expect.objectContaining({ text: "Vinyls", callback_data: "cat:cat-1" }),
            ]),
          ]),
        })
      );
    });

    it("should edit current text with product list when category callback occurs", async () => {
      const mockShop = { id: shopId, botToken, currency: "$" };
      prismaMock.shop.findUnique.mockResolvedValue(mockShop);

      const mockCategory = { id: "cat-1", name: "Vinyls", description: "Awesome records" };
      prismaMock.category.findFirst.mockResolvedValue(mockCategory);

      const mockProducts = [
        { id: "prod-1", name: "Pink Floyd", price: new Decimal(29.99) },
      ];
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const webhookService = new WebhookService();
      const payload = {
        update_id: 9902,
        callback_query: {
          id: "cb-query-id-1",
          from: { id: 8877, first_name: "John", last_name: "Doe", username: "johndoe" },
          message: {
            chat: { id: 8877 },
            message_id: 4545,
          },
          data: "cat:cat-1",
        },
      };

      await webhookService.processUpdate(shopId, payload);

      expect(telegramClientMock.answerCallbackQuery).toHaveBeenCalledWith(botToken, "cb-query-id-1");
      expect(telegramClientMock.editMessageText).toHaveBeenCalledWith(
        botToken,
        8877,
        4545,
        expect.stringContaining("Category: Vinyls"),
        expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({ text: "Pink Floyd - $29.99", callback_data: "prod:prod-1" }),
            ]),
            expect.arrayContaining([
              expect.objectContaining({ text: "⬅️ Back to Categories", callback_data: "back_categories" }),
            ]),
          ]),
        })
      );
    });
  });
});
