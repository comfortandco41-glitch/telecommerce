import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/db/client";
import { telegramClient } from "../src/services/telegramClient";
import { mockReset } from "jest-mock-extended";
import { InvoiceService } from "../src/services/invoiceService";
import { supabase } from "../src/db/supabaseClient";
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
    sendDocument: jest.fn().mockResolvedValue({ ok: true }),
  },
}));

const prismaMock = prisma as any;
const telegramClientMock = telegramClient as any;

describe("Phase 5 - Payment Approval & PDF Invoice Dispatch Pipeline", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    jest.clearAllMocks();
    telegramClientMock.sendMessage.mockResolvedValue({ ok: true });
    telegramClientMock.sendDocument.mockResolvedValue({ ok: true });

    // Re-apply supabase mock implementation that gets reset
    const fromMock = supabase.storage.from as jest.Mock;
    fromMock.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: "invoice-path" }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: "https://mock-supabase.co/invoice-123.pdf" },
      }),
    });
  });

  const shopId = "shop-uuid-123";
  const orderId = "order-uuid-999";
  const botToken = "test-bot-token";
  const merchantId = "merchant-uuid-111";
  const JWT_SECRET = process.env.JWT_SECRET || "local-jwt-secret-key-32-bytes-long";
  const token = jwt.sign({ id: merchantId, email: "merchant@test.com" }, JWT_SECRET);

  it("should generate a PDF invoice, upload to Supabase, and dispatch to buyer on status PAID", async () => {
    // 1. Mock DB returns
    prismaMock.merchant.findUnique.mockResolvedValue({ id: merchantId, email: "merchant@test.com" });
    prismaMock.shop.findUnique.mockResolvedValue({ id: shopId, merchantId });

    const mockOrder = {
      id: orderId,
      shopId,
      customerId: "cust-1",
      status: "PENDING_VERIFICATION",
      totalAmount: new Decimal(49.99),
      deliveryAddress: "123 Main St",
      deliveryPhone: "+1234567890",
      createdAt: new Date(),
      shop: { id: shopId, name: "Retro Store", botToken },
      customer: { id: "cust-1", telegramId: BigInt(8877), firstName: "John", lastName: "Doe" },
      items: [
        {
          id: "item-1",
          productId: "prod-1",
          quantity: 1,
          priceAtPurchase: new Decimal(49.99),
          product: { id: "prod-1", name: "Purple Rain Vinyl" },
        },
      ],
    };
    prismaMock.order.findFirst.mockResolvedValue(mockOrder);
    prismaMock.order.getById.mockResolvedValue(mockOrder);
    // Since getById in repository is used in controller checks
    prismaMock.order.update.mockResolvedValue({ ...mockOrder, status: "PAID" });

    // 2. Put status to PAID via REST endpoint
    const response = await request(app)
      .put(`/api/v1/shops/${shopId}/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PAID" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // 3. Trigger invoice generation synchronously in test thread to test compiler logic
    const invoiceService = new InvoiceService();
    await invoiceService.generateAndSendInvoice(shopId, orderId);

    // Assert that the storage compiler uploaded the PDF file
    const uploadMock = supabase.storage.from("invoices").upload as jest.Mock;
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringContaining(`${shopId}/invoices/${orderId}-invoice.pdf`),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "application/pdf" })
    );

    // Assert that the order is updated with the PDF link in database
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: orderId },
        data: expect.objectContaining({
          invoicePdfUrl: "https://mock-supabase.co/invoice-123.pdf",
        }),
      })
    );

    // Assert that the document was successfully sent to the customer
    expect(telegramClientMock.sendDocument).toHaveBeenCalledWith(
      botToken,
      "8877",
      "https://mock-supabase.co/invoice-123.pdf",
      expect.stringContaining("Invoice-")
    );
  });
});
