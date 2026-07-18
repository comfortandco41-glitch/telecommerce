import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/db/client";
import { mockReset } from "jest-mock-extended";
import jwt from "jsonwebtoken";

jest.mock("../src/db/client", () => {
  const { mockDeep } = require("jest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep(),
  };
});

const prismaMock = prisma as any;
const JWT_SECRET = process.env.JWT_SECRET || "local-jwt-secret-key-32-bytes-long";

describe("Monthly Broadcast Limit API (15/mo)", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  const merchantId = "merchant-limit-111";
  const shopId = "shop-limit-222";
  const email = "merchant@limit.com";

  describe("GET /api/v1/shops/:shopId/broadcasts", () => {
    it("should return broadcast list and monthly usage metadata", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        email,
        subscriptionStatus: "ACTIVE",
      });
      prismaMock.shop.findMany.mockResolvedValue([{ id: shopId, merchantId }]);
      prismaMock.shop.findUnique.mockResolvedValue({ id: shopId, merchantId });
      prismaMock.broadcast.findMany.mockResolvedValue([]);
      prismaMock.broadcast.count.mockResolvedValue(5);

      const token = jwt.sign({ id: merchantId, email }, JWT_SECRET);

      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/broadcasts`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.monthlyUsed).toBe(5);
      expect(response.body.meta.monthlyLimit).toBe(15);
    });
  });

  describe("POST /api/v1/shops/:shopId/broadcasts", () => {
    it("should allow creating a broadcast when under the 15 limit", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        email,
        subscriptionStatus: "ACTIVE",
      });
      prismaMock.shop.findMany.mockResolvedValue([{ id: shopId, merchantId }]);
      prismaMock.shop.findUnique.mockResolvedValue({ id: shopId, merchantId });
      prismaMock.broadcast.count.mockResolvedValue(14); // 14 used so far
      prismaMock.broadcast.create.mockResolvedValue({
        id: "b-15",
        shopId,
        messageText: "Test Campaign 15",
        status: "PENDING",
        sentCount: 0,
        failedCount: 0,
        createdAt: new Date(),
      });

      const token = jwt.sign({ id: merchantId, email }, JWT_SECRET);

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/broadcasts`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          messageText: "Special Offer Campaign text",
          targetAudience: "ALL",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.monthlyUsed).toBe(15);
    });

    it("should reject creating a 16th broadcast when limit (15) is reached", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        email,
        subscriptionStatus: "ACTIVE",
      });
      prismaMock.shop.findMany.mockResolvedValue([{ id: shopId, merchantId }]);
      prismaMock.shop.findUnique.mockResolvedValue({ id: shopId, merchantId });
      prismaMock.broadcast.count.mockResolvedValue(15); // Already reached 15!

      const token = jwt.sign({ id: merchantId, email }, JWT_SECRET);

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/broadcasts`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          messageText: "Attempting 16th Broadcast",
          targetAudience: "ALL",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("BROADCAST_LIMIT_REACHED");
      expect(response.body.error.message).toContain("Monthly broadcast limit reached");
    });
  });
});
