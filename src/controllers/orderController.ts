import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { OrderRepository } from "../repositories/orderRepository";
import { AppError } from "../errors/appError";
import { OrderStatus } from "@prisma/client";
import { InvoiceService } from "../services/invoiceService";
import { workflowService } from "../services/workflowService";
import { telegramClient } from "../services/telegramClient";
import { escapeMarkdownV2 } from "../utils/markdown";

const orderRepo = new OrderRepository();

export async function handleGetOrders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { shopId } = req.params;
  try {
    const orders = await orderRepo.listByShopId(shopId);
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { shopId, orderId } = req.params;
  const { status } = req.body;

  try {
    if (!Object.values(OrderStatus).includes(status)) {
      return next(new AppError(`Invalid status value: ${status}`, 400, "BAD_REQUEST"));
    }

    const order = await orderRepo.getById(shopId, orderId);
    if (!order) {
      return next(new AppError("Order not found", 404, "NOT_FOUND"));
    }

    const updated = await orderRepo.updateStatus(shopId, orderId, status);

    if (status === OrderStatus.PAID) {
      if (order.customer && order.customer.telegramId) {
        const confirmText =
          `🎉 *Order Confirmed\\!* / *အော်ဒါအတည်ပြုပြီးပါပြီ\\!*\n\n` +
          `🇬🇧 Your payment has been verified\\! Your order is now confirmed and our team is preparing it for delivery\\.\n\n` +
          `🇲🇲 လူကြီးမင်း၏ ငွေပေးချေမှုကို အတည်ပြုပြီးပါပြီ။ သင်၏အော်ဒါကို အတည်ပြုပြီးဖြစ်၍ ပို့ဆောင်ရန် ပြင်ဆင်နေပါပြီ။\n\n` +
          `*Order ID:* \`${escapeMarkdownV2(orderId)}\``;

        telegramClient.sendMessage((order as any).shop?.botToken, order.customer.telegramId.toString(), confirmText).catch((err) => {
          console.error("Failed to send order confirm message to customer:", err.message);
        });
      }

      const invoiceService = new InvoiceService();
      invoiceService.generateAndSendInvoice(shopId, orderId).catch((err) => {
        console.error("Background invoice compiler error:", err.message);
      });

      workflowService.trigger(shopId, "ORDER_PAID", {
        orderId,
        amount: Number(order.totalAmount).toFixed(2),
        customerName: order.customer
          ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim()
          : "Valued Customer",
        botToken: (order as any).shop?.botToken,
      }).catch((err) => {
        console.error("Workflow broker ORDER_PAID error:", err.message);
      });
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}
