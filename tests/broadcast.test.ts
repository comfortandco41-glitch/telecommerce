import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/db/client";
import { telegramClient } from "../src/services/telegramClient";
import { mockReset } from "jest-mock-extended";
import { BroadcastService } from "../src/services/broadcastService";
import { BroadcastStatus } from "@prisma/client";
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
  },
}));

const prismaMock = prisma as any;
const telegramClientMock = telegramClient as any;

describe("Phase 6 - CRM Campaigns & Throttled Broadcasts Pipeline", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    jest.clearAllMocks();
    telegramClientMock.sendMessage.mockResolvedValue({ ok: true });
  });

  const shopId = "shop-uuid-123";
  const botToken = "test-bot-token-999";
  const merchantId = "merchant-uuid-111";
  const JWT_SECRET = process.env.JWT_SECRET || "local-jwt-secret-key-32-bytes-long";
  const token = jwt.sign({ id: merchantId, email: "merchant@test.com" }, JWT_SECRET);

  it("should validate compose inputs and queue broadcast for delivery", async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: merchantId, email: "merchant@test.com" });
    prismaMock.shop.findUnique.mockResolvedValue({ id: shopId, merchantId, botToken });
    prismaMock.broadcast.create.mockResolvedValue({
      id: "bc-1",
      shopId,
      messageText: "Save 20% tonight on all vinyls!",
      mediaUrl: null,
      status: "PENDING",
      createdAt: new Date(),
    });

    const response = await request(app)
      .post(`/api/v1/shops/${shopId}/broadcasts`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        messageText: "Save 20% tonight on all vinyls!",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe("bc-1");
  });

  it("should process delivery queue with rate limits and log successes and failures", async () => {
    // 1. Setup mock data
    const broadcastId = "bc-2";
    const mockBroadcast = {
      id: broadcastId,
      shopId,
      messageText: "Newsletter details",
      mediaUrl: "https://mock-image.png",
      status: BroadcastStatus.PENDING,
    };

    prismaMock.broadcast.findUnique.mockResolvedValue(mockBroadcast);
    prismaMock.shop.findUnique.mockResolvedValue({ id: shopId, botToken });

    // Mock 3 target subscribers
    prismaMock.customer.findMany.mockResolvedValue([
      { id: "cust-1", telegramId: BigInt(1111) },
      { id: "cust-2", telegramId: BigInt(2222) },
      { id: "cust-3", telegramId: BigInt(3333) },
    ]);

    // Make second dispatch fail to assert failed counts mapping
    telegramClientMock.sendMessage
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("Telegram Network Block"))
      .mockResolvedValueOnce({ ok: true });

    // 2. Trigger campaign delivery worker
    const broadcastService = new BroadcastService();
    await broadcastService.runBroadcast(shopId, broadcastId);

    // Assert status transition updates
    expect(prismaMock.broadcast.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: broadcastId },
        data: expect.objectContaining({
          status: BroadcastStatus.SENDING,
        }),
      })
    );

    // Assert loop checks all targets
    expect(telegramClientMock.sendMessage).toHaveBeenCalledTimes(3);

    // Assert metrics saving
    expect(prismaMock.broadcast.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: broadcastId },
        data: expect.objectContaining({
          status: BroadcastStatus.SENT,
          sentCount: 2,
          failedCount: 1,
          sentAt: expect.any(Date),
        }),
      })
    );
  });

  it("should filter only previous buyers when targetAudience is BUYERS", async () => {
    const broadcastId = "bc-buyers";
    const mockBroadcast = {
      id: broadcastId,
      shopId,
      messageText: "Exclusive buyers promotion",
      mediaUrl: null,
      targetAudience: "BUYERS",
      status: BroadcastStatus.PENDING,
    };

    prismaMock.broadcast.findUnique.mockResolvedValue(mockBroadcast);
    prismaMock.shop.findUnique.mockResolvedValue({ id: shopId, botToken });

    prismaMock.customer.findMany.mockResolvedValue([
      { id: "cust-buyer-1", telegramId: BigInt(5555) },
    ]);

    const broadcastService = new BroadcastService();
    await broadcastService.runBroadcast(shopId, broadcastId);

    expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shopId,
          orders: expect.objectContaining({
            some: expect.objectContaining({
              status: expect.objectContaining({
                not: "CANCELLED",
              }),
            }),
          }),
        }),
      })
    );
  });
});
