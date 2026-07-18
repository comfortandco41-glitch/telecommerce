import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/db/client";
import { mockReset } from "jest-mock-extended";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Mock the database client singleton
jest.mock("../src/db/client", () => {
  const { mockDeep } = require("jest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep(),
  };
});

const prismaMock = prisma as any;
const JWT_SECRET = process.env.JWT_SECRET || "local-jwt-secret-key-32-bytes-long";

describe("Merchant Authentication API", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  const email = "merchant@test.com";
  const password = "securepassword123";
  const name = "Jane Merchant";
  const merchantId = "merchant-uuid-111";

  describe("POST /api/v1/auth/register", () => {
    it("should successfully register a new merchant", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue(null);
      
      const mockMerchant = {
        id: merchantId,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        name,
      };
      prismaMock.merchant.create.mockResolvedValue(mockMerchant);

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({ email, password, name });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.merchant.email).toBe(email);
      expect(prismaMock.merchant.create).toHaveBeenCalledTimes(1);
    });

    it("should reject registration if email is already registered", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue({ id: merchantId, email });

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({ email, password, name });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("BAD_REQUEST");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should successfully authenticate merchant and return a token", async () => {
      const passwordHash = await bcrypt.hash(password, 10);
      prismaMock.merchant.findUnique.mockResolvedValue({ id: merchantId, email, passwordHash, name });

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.merchant.email).toBe(email);
    });

    it("should reject login on invalid credentials", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({ email, password });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should retrieve current merchant profile on valid JWT token", async () => {
      const mockMerchant = { id: merchantId, email, name };
      prismaMock.merchant.findUnique.mockResolvedValue(mockMerchant);

      const token = jwt.sign({ id: merchantId, email }, JWT_SECRET);

      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant.id).toBe(merchantId);
      expect(response.body.data.merchant.email).toBe(email);
    });

    it("should reject access when authorization token is missing", async () => {
      const response = await request(app).get("/api/v1/auth/me");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("should process forgot password request and return generic success message", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue({ id: merchantId, email });
      prismaMock.merchant.update.mockResolvedValue({ id: merchantId, email });

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("instructions have been sent");
    });

    it("should return generic message even if email does not exist", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "nonexistent@test.com" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("should successfully reset password with valid token", async () => {
      const validToken = "valid-reset-token-123";
      const futureDate = new Date(Date.now() + 3600000);

      prismaMock.merchant.findFirst.mockResolvedValue({
        id: merchantId,
        email,
        resetToken: validToken,
        resetTokenExpiresAt: futureDate,
      });
      prismaMock.merchant.update.mockResolvedValue({ id: merchantId });

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ token: validToken, newPassword: "newsecurepassword123" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(prismaMock.merchant.update).toHaveBeenCalledTimes(1);
    });

    it("should reject password reset when token is expired", async () => {
      const expiredToken = "expired-reset-token-123";
      const pastDate = new Date(Date.now() - 3600000);

      prismaMock.merchant.findFirst.mockResolvedValue({
        id: merchantId,
        email,
        resetToken: expiredToken,
        resetTokenExpiresAt: pastDate,
      });

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ token: expiredToken, newPassword: "newsecurepassword123" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("EXPIRED_TOKEN");
    });

    it("should reject password reset when token is invalid/not found", async () => {
      prismaMock.merchant.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ token: "invalid-token", newPassword: "newsecurepassword123" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
