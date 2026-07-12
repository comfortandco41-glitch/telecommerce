import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { OrderRepository } from "../repositories/orderRepository";
import { AppError } from "../errors/appError";
import { OrderStatus } from "@prisma/client";
import { InvoiceService } from "../services/invoiceService";

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
      const invoiceService = new InvoiceService();
      invoiceService.generateAndSendInvoice(shopId, orderId).catch((err) => {
        console.error("Background invoice compiler error:", err.message);
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
