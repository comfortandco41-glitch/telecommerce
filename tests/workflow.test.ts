import { prisma } from "../src/db/client";
import { telegramClient } from "../src/services/telegramClient";
import { workflowService } from "../src/services/workflowService";
import { mockReset } from "jest-mock-extended";

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

// Setup global fetch mock
const mockFetch = jest.fn().mockResolvedValue({ ok: true });
global.fetch = mockFetch;

const prismaMock = prisma as any;
const telegramClientMock = telegramClient as any;

describe("Phase 7 - Automation Workflows and Event Broker", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    jest.clearAllMocks();
    telegramClientMock.sendMessage.mockResolvedValue({ ok: true });
    mockFetch.mockResolvedValue({ ok: true });
  });

  const shopId = "shop-uuid-123";
  const botToken = "bot-token-999";

  it("should trigger webhook workflow action on matching event", async () => {
    // 1. Mock DB returning a webhook action workflow
    prismaMock.workflow.findMany.mockResolvedValue([
      {
        id: "wf-webhook-uuid",
        shopId,
        name: "Alert Zapier Hook",
        trigger: "ORDER_CREATED",
        action: "SEND_WEBHOOK",
        config: { url: "https://hooks.zapier.com/hooks/catch/123" },
        isActive: true,
      },
    ]);

    // 2. Fire the broker trigger
    await workflowService.trigger(shopId, "ORDER_CREATED", {
      orderId: "order-999",
      amount: "29.99",
      customerName: "Alex Doe",
    });

    // 3. Verify Zapier mock URL was queried with POST payload
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.zapier.com/hooks/catch/123",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "order-999",
          amount: "29.99",
          customerName: "Alex Doe",
        }),
      })
    );
  });

  it("should trigger Telegram notification workflow action with interpolated values", async () => {
    // 1. Mock DB returning a Telegram notification workflow
    prismaMock.workflow.findMany.mockResolvedValue([
      {
        id: "wf-telegram-uuid",
        shopId,
        name: "Notify Store Owner Group",
        trigger: "ORDER_PAID",
        action: "SEND_TELEGRAM_NOTIFICATION",
        config: {
          chatId: "-100888999",
          messageTemplate: "New PAID Order: {{orderId}} for ${{amount}} by customer {{customerName}}!",
        },
        isActive: true,
      },
    ]);

    prismaMock.shop.findUnique.mockResolvedValue({
      id: shopId,
      botToken,
    });

    // 2. Fire the broker trigger
    await workflowService.trigger(shopId, "ORDER_PAID", {
      orderId: "order-777",
      amount: "89.00",
      customerName: "Sam Smith",
      botToken,
    });

    // 3. Verify Telegram sendMessage was executed with interpolated text template
    expect(telegramClientMock.sendMessage).toHaveBeenCalledWith(
      botToken,
      "-100888999",
      "New PAID Order: order-777 for $89.00 by customer Sam Smith!"
    );
  });
});
