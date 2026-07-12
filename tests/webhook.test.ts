import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/db/client";
import { mockReset } from "jest-mock-extended";
import crypto from "crypto";

// Mock the Prisma DB Client singleton
jest.mock("../src/db/client", () => {
  const { mockDeep } = require("jest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep(),
  };
});

const prismaMock = prisma as any;

describe("POST /api/v1/webhook/:shopId", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  const shopId = "test-shop-uuid";
  const botToken = "123456:ABCdefGH";
  const validSecretToken = crypto.createHash("sha256").update(botToken).digest("hex");

  it("should return 404 when shop does not exist", async () => {
    prismaMock.shop.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/webhook/${shopId}`)
      .set("X-Telegram-Bot-Api-Secret-Token", "some-token")
      .send({ update_id: 12345, message: { text: "hello" } });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("should return 403 when X-Telegram-Bot-Api-Secret-Token header is missing", async () => {
    const mockShop = { id: shopId, botToken };
    prismaMock.shop.findUnique.mockResolvedValue(mockShop);

    const response = await request(app)
      .post(`/api/v1/webhook/${shopId}`)
      .send({ update_id: 12345, message: { text: "hello" } });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("should return 403 when X-Telegram-Bot-Api-Secret-Token is invalid", async () => {
    const mockShop = { id: shopId, botToken };
    prismaMock.shop.findUnique.mockResolvedValue(mockShop);

    const response = await request(app)
      .post(`/api/v1/webhook/${shopId}`)
      .set("X-Telegram-Bot-Api-Secret-Token", "wrong-secret-token")
      .send({ update_id: 12345, message: { text: "hello" } });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("should return 400 validation error when update_id is missing", async () => {
    const mockShop = { id: shopId, botToken };
    prismaMock.shop.findUnique.mockResolvedValue(mockShop);

    const response = await request(app)
      .post(`/api/v1/webhook/${shopId}`)
      .set("X-Telegram-Bot-Api-Secret-Token", validSecretToken)
      .send({ message: { text: "hello" } });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("BAD_REQUEST");
  });

  it("should return 200 OK and queue webhook log on valid inputs", async () => {
    const mockShop = { id: shopId, botToken };
    prismaMock.shop.findUnique.mockResolvedValue(mockShop);

    const mockWebhookLog = { id: "log-uuid", updateId: BigInt(12345), shopId };
    prismaMock.webhookLog.create.mockResolvedValue(mockWebhookLog);
    prismaMock.webhookLog.update.mockResolvedValue(mockWebhookLog);

    const response = await request(app)
      .post(`/api/v1/webhook/${shopId}`)
      .set("X-Telegram-Bot-Api-Secret-Token", validSecretToken)
      .send({ update_id: 12345, message: { text: "hello" } });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("received");
    expect(prismaMock.webhookLog.create).toHaveBeenCalledTimes(1);
  });

  it("should return 200 OK and skip double insertion on duplicate update_id (idempotency)", async () => {
    const mockShop = { id: shopId, botToken };
    prismaMock.shop.findUnique.mockResolvedValue(mockShop);

    // Mock Prisma throwing unique constraint violation
    const prismaError = new Error("Unique constraint failed");
    (prismaError as any).code = "P2002";
    prismaMock.webhookLog.create.mockRejectedValue(prismaError);

    const response = await request(app)
      .post(`/api/v1/webhook/${shopId}`)
      .set("X-Telegram-Bot-Api-Secret-Token", validSecretToken)
      .send({ update_id: 12345, message: { text: "hello" } });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("Duplicate update ignored");
    expect(prismaMock.webhookLog.create).toHaveBeenCalledTimes(1);
  });
});
