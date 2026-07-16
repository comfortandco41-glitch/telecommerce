import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ShopRepository } from "../repositories/shopRepository";
import { AppError } from "../errors/appError";

import { prisma } from "../db/client";
import { z } from "zod";
import crypto from "crypto";

const shopRepo = new ShopRepository();

async function registerTelegramWebhook(botToken: string, shopId: string, hostHeader: string): Promise<void> {
  const secretToken = crypto.createHash("sha256").update(botToken).digest("hex");
  const isLocal = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
  const protocol = isLocal ? "http" : "https";
  const webhookUrl = `${protocol}://${hostHeader}/api/v1/webhook/${shopId}`;
  
  const telegramUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${secretToken}&allowed_updates=${JSON.stringify(["message", "callback_query"])}`;
  
  try {
    const res = await fetch(telegramUrl);
    const json: any = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.description || "Failed to set Telegram webhook");
    }
  } catch (err: any) {
    throw new AppError(`Telegram webhook registration failed: ${err.message}`, 400, "BAD_REQUEST");
  }
}

const shopSchema = z.object({
  botToken: z.string().min(5),
  name: z.string().min(1),
  currency: z.string().default("USD"),
  paymentInstructions: z.string().min(5),
  welcomeMessage: z.string().min(5),
  faqs: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      })
    )
    .max(10)
    .optional(),
});

export async function handleCreateShop(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.merchant) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    const parse = shopSchema.safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid inputs", 400, "BAD_REQUEST", parse.error.format()));
    }

    // Enforce 1 shop limit per merchant account
    const existingShops = await shopRepo.listByMerchantId(req.merchant.id);
    if (existingShops.length >= 1) {
      return next(new AppError("Only one shop is allowed per merchant account.", 400, "BAD_REQUEST"));
    }

    const { botToken, name, currency, paymentInstructions, welcomeMessage, faqs } = parse.data;

    const existing = await shopRepo.getByToken(botToken);
    if (existing) {
      return next(new AppError("Bot token is already registered to another shop", 400, "BAD_REQUEST"));
    }

    const shop = await prisma.shop.create({
      data: {
        merchantId: req.merchant.id,
        botToken,
        name,
        currency,
        paymentInstructions,
        welcomeMessage,
        faqs: faqs || [],
      },
    });

    // Automatically register Telegram webhook
    const host = req.get("host") || "localhost:10000";
    try {
      await registerTelegramWebhook(botToken, shop.id, host);
    } catch (err: any) {
      // Rollback database record creation on webhook failure
      await prisma.shop.delete({ where: { id: shop.id } });
      return next(err);
    }

    res.status(201).json({
      success: true,
      data: shop,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetShops(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.merchant) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }
    const shops = await shopRepo.listByMerchantId(req.merchant.id);
    res.status(200).json({
      success: true,
      data: shops,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateShop(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { shopId } = req.params;
  try {
    if (!req.merchant) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    const parse = shopSchema.partial().safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid inputs", 400, "BAD_REQUEST", parse.error.format()));
    }

    // Verify merchant owns this shop
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, merchantId: req.merchant.id },
    });
    if (!shop) {
      return next(new AppError("Shop not found or access denied", 404, "NOT_FOUND"));
    }

    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: parse.data,
    });

    // If botToken was updated, re-register the webhook
    if (parse.data.botToken) {
      const host = req.get("host") || "localhost:10000";
      try {
        await registerTelegramWebhook(parse.data.botToken, updated.id, host);
      } catch (err: any) {
        // Rollback update on webhook registration failure
        await prisma.shop.update({
          where: { id: shopId },
          data: { botToken: shop.botToken },
        });
        return next(err);
      }
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}
