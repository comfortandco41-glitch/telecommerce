import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ShopRepository } from "../repositories/shopRepository";
import { AppError } from "../errors/appError";

import { prisma } from "../db/client";
import { z } from "zod";

const shopRepo = new ShopRepository();

const shopSchema = z.object({
  botToken: z.string().min(5),
  name: z.string().min(1),
  currency: z.string().default("USD"),
  paymentInstructions: z.string().min(5),
  welcomeMessage: z.string().min(5),
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

    const { botToken, name, currency, paymentInstructions, welcomeMessage } = parse.data;

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
      },
    });

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
