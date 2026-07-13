import { prisma } from "../src/db/client";
import { telegramClient } from "../src/services/telegramClient";
import { mockReset } from "jest-mock-extended";
import { WebhookService } from "../src/services/webhookService";
import { Decimal } from "@prisma/client/runtime/library";
import { supabase } from "../src/db/supabaseClient";

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
    getFile: jest.fn().mockResolvedValue({ file_path: "photos/receipt.jpg" }),
    downloadFile: jest.fn().mockResolvedValue(Buffer.from("mock-binary-receipt-data")),
  },
}));

// Mock Supabase storage upload operations
jest.mock("@supabase/supabase-js", () => {
  return {
    createClient: jest.fn().mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ data: { path: "mock-path" }, error: null }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: "https://mock-supabase.co/receipt.jpg" },
          }),
        }),
      },
    }),
  };
});

const prismaMock = prisma as any;
const telegramClientMock = telegramClient as any;

describe("Phase 3 Checkout - Cart and Payment Receipt Upload Pipeline", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    jest.clearAllMocks();
    telegramClientMock.sendMessage.mockResolvedValue({ ok: true });
    telegramClientMock.editMessageText.mockResolvedValue({ ok: true });
    telegramClientMock.answerCallbackQuery.mockResolvedValue({ ok: true });
    telegramClientMock.getFile.mockResolvedValue({ file_path: "photos/receipt.jpg" });
    telegramClientMock.downloadFile.mockResolvedValue(Buffer.from("mock-binary-receipt-data"));

    // Re-apply supabase mock implementation that was reset
    const fromMock = supabase.storage.from as jest.Mock;
    fromMock.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: "mock-path" }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: "https://mock-supabase.co/receipt.jpg" },
      }),
    });
  });

  const shopId = "shop-uuid-123";
  const customerId = "customer-uuid-456";
  const botToken = "test-bot-token";

  it("should process checkout steps and submit order when customer uploads a receipt photo", async () => {
    const mockShop = {
      id: shopId,
      botToken,
      currency: "$",
      welcomeMessage: "Welcome!",
      paymentInstructions: "Transfer to Chase Account 123",
    };
    prismaMock.shop.findUnique.mockResolvedValue(mockShop);

    // Mock customer in AWAITING_RECEIPT state
    const mockCustomer = {
      id: customerId,
      shopId,
      telegramId: BigInt(8877),
      firstName: "John Doe",
      address: "123 Main St",
      phone: "+1234567890",
      checkoutStep: "AWAITING_RECEIPT",
      cart: [{ productId: "prod-1", quantity: 2 }],
    };
    prismaMock.customer.findFirst.mockResolvedValue(mockCustomer);
    prismaMock.customer.update.mockResolvedValue(mockCustomer);

    // Mock product detail
    const mockProduct = {
      id: "prod-1",
      name: "Floyd Vinyl",
      price: new Decimal(29.99),
      stock: 10,
    };
    prismaMock.product.findUnique.mockResolvedValue(mockProduct);
    prismaMock.product.findFirst.mockResolvedValue(mockProduct);

    // Mock Order transaction result
    const mockOrder = {
      id: "order-uuid-999",
      shopId,
      customerId,
      status: "PENDING_VERIFICATION",
      totalAmount: new Decimal(59.98),
      deliveryAddress: "123 Main St",
      deliveryPhone: "+1234567890",
      bankScreenshotUrl: "https://mock-supabase.co/receipt.jpg",
    };
    prismaMock.$transaction.mockResolvedValue(mockOrder);

    const webhookService = new WebhookService();
    
    // Simulating Telegram Photo payload
    const photoPayload = {
      update_id: 11002,
      message: {
        chat: { id: 8877 },
        from: { id: 8877, first_name: "John", last_name: "Doe", username: "johndoe" },
        photo: [
          { file_id: "small-id", file_size: 1000 },
          { file_id: "large-id", file_size: 5000 },
        ],
      },
    };

    await webhookService.processUpdate(shopId, photoPayload);

    // Assert that the image file was downloaded from Telegram
    expect(telegramClientMock.getFile).toHaveBeenCalledWith(botToken, "large-id");
    expect(telegramClientMock.downloadFile).toHaveBeenCalledWith(botToken, "photos/receipt.jpg");

    // Assert database transaction was executed to log order and decrease stock
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    // Assert customer state was reset back to IDLE
    expect(prismaMock.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: customerId },
        data: expect.objectContaining({
          checkoutStep: "IDLE",
          cart: [],
        }),
      })
    );

    // Assert success alert message delivered to user
    expect(telegramClientMock.sendMessage).toHaveBeenCalledWith(
      botToken,
      8877,
      expect.stringContaining("Order Received Successfully")
    );
  });
});
