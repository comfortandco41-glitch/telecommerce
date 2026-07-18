import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/db/client";
import { mockReset } from "jest-mock-extended";
import jwt from "jsonwebtoken";
import crypto from "crypto";

jest.mock("../src/db/client", () => {
  const { mockDeep } = require("jest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep(),
  };
});

const prismaMock = prisma as any;
const JWT_SECRET = process.env.JWT_SECRET || "local-jwt-secret-key-32-bytes-long";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "superbot-admin-secret-key-2026";

describe("Subscription Expiration & Admin API", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  const merchantId = "merchant-expired-111";
  const shopId = "shop-uuid-222";
  const email = "expired@merchant.com";
  const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

  describe("Webhook Execution on Expired Subscription", () => {
    it("should pause bot webhook handling when merchant subscription is expired", async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      prismaMock.shop.findUnique.mockResolvedValue({
        id: shopId,
        botToken,
        merchant: {
          id: merchantId,
          email,
          subscriptionStatus: "EXPIRED",
          subscriptionExpiresAt: expiredDate,
        },
      });

      const secretToken = crypto.createHash("sha256").update(botToken).digest("hex");

      const response = await request(app)
        .post(`/api/v1/webhook/${shopId}`)
        .set("x-telegram-bot-api-secret-token", secretToken)
        .send({ update_id: 99999, message: { text: "/start" } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Merchant subscription has expired");
    });
  });

  describe("Dashboard Action on Expired Subscription", () => {
    it("should block shop creation (mutation) when merchant subscription is expired", async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      prismaMock.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        email,
        name: "Expired Store",
        subscriptionStatus: "EXPIRED",
        subscriptionExpiresAt: expiredDate,
      });

      const token = jwt.sign({ id: merchantId, email }, JWT_SECRET);

      const response = await request(app)
        .post("/api/v1/shops")
        .set("Authorization", `Bearer ${token}`)
        .send({
          botToken: "new-bot-token",
          name: "New Shop Attempt",
        });

      expect(response.status).toBe(402);
      expect(response.body.error.code).toBe("SUBSCRIPTION_EXPIRED");
    });
  });

  describe("POST /api/v1/admin/subscription", () => {
    it("should allow admin to extend merchant subscription", async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      prismaMock.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        email,
        subscriptionStatus: "EXPIRED",
        subscriptionExpiresAt: new Date(Date.now() - 86400000),
      });

      prismaMock.merchant.update.mockResolvedValue({
        id: merchantId,
        email,
        name: "Extended Store",
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: futureDate,
      });

      const response = await request(app)
        .post("/api/v1/admin/subscription")
        .set("x-admin-secret", ADMIN_SECRET)
        .send({ email, daysToAdd: 30 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant.subscriptionStatus).toBe("ACTIVE");
    });

    it("should reject admin endpoint call when x-admin-secret is invalid", async () => {
      const response = await request(app)
        .post("/api/v1/admin/subscription")
        .set("x-admin-secret", "invalid-secret")
        .send({ email, daysToAdd: 30 });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
