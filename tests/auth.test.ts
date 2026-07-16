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
    if ((globalThis as any).supabaseMocks) {
      (globalThis as any).supabaseMocks.signUpError = null;
      (globalThis as any).supabaseMocks.signInError = null;
      (globalThis as any).supabaseMocks.verifyOtpError = null;
      (globalThis as any).supabaseMocks.resetPasswordError = null;
      (globalThis as any).supabaseMocks.updateUserError = null;
    }
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
      expect(response.body.message).toContain("verification code");
      expect(response.body.data.email).toBe(email);
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

  describe("POST /api/v1/auth/verify-otp", () => {
    it("should successfully verify OTP and return a token", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue({ id: merchantId, email, name });

      const response = await request(app)
        .post("/api/v1/auth/verify-otp")
        .send({ email, code: "123456" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.merchant.email).toBe(email);
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
      if ((globalThis as any).supabaseMocks) {
        (globalThis as any).supabaseMocks.signInError = new Error("Invalid email or password");
      }
      prismaMock.merchant.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({ email, password });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("should trigger recovery email", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue({ id: merchantId, email });

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("should verify recovery code and update password", async () => {
      prismaMock.merchant.findUnique.mockResolvedValue({ id: merchantId, email });
      prismaMock.merchant.update.mockResolvedValue({ id: merchantId, email });

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ email, code: "654321", newPassword: "newsecurepassword123" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
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
});
