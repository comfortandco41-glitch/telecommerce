import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { prisma } from "../db/client";
import { AppError } from "../errors/appError";
import { telegramClient } from "../services/telegramClient";
import { escapeMarkdownV2 } from "../utils/markdown";

export async function handleGetChatHistory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { shopId, customerId } = req.params;
  try {
    if (!req.merchant) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    // Verify shop ownership
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, merchantId: req.merchant.id },
    });
    if (!shop) {
      return next(new AppError("Shop not found or access denied", 404, "NOT_FOUND"));
    }

    const messages = await prisma.supportMessage.findMany({
      where: { shopId, customerId },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleSendSupportMessage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { shopId, customerId } = req.params;
  const { text } = req.body;

  try {
    if (!req.merchant) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!text || typeof text !== "string" || text.trim() === "") {
      return next(new AppError("Message text is required", 400, "BAD_REQUEST"));
    }

    // Verify shop ownership
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, merchantId: req.merchant.id },
    });
    if (!shop) {
      return next(new AppError("Shop not found or access denied", 404, "NOT_FOUND"));
    }

    // Find customer details
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, shopId },
    });
    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }

    // Send actual message to Telegram client
    // Note: Escaping special chars for Telegram MarkdownV2 if parse_mode is active in client
    await telegramClient.sendMessage(shop.botToken, customer.telegramId.toString(), escapeMarkdownV2(text));

    // Save support message log to DB
    const savedMsg = await prisma.supportMessage.create({
      data: {
        shopId,
        customerId,
        sender: "ADMIN",
        text,
      },
    });

    res.status(201).json({
      success: true,
      data: savedMsg,
    });
  } catch (err: any) {
    next(err);
  }
}
