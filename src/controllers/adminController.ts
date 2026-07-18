import { Request, Response, NextFunction } from "express";
import { MerchantRepository } from "../repositories/merchantRepository";
import { AppError } from "../errors/appError";
import { z } from "zod";

const merchantRepo = new MerchantRepository();

const extendSubscriptionSchema = z.object({
  email: z.string().email(),
  daysToAdd: z.number().optional(),
  newExpiryDate: z.string().optional(), // ISO date string e.g. "2026-08-31T23:59:59Z"
});

export async function handleExtendSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = extendSubscriptionSchema.safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid inputs", 400, "BAD_REQUEST", parse.error.format()));
    }

    const { email, daysToAdd, newExpiryDate } = parse.data;
    const merchant = await merchantRepo.getByEmail(email);

    if (!merchant) {
      return next(new AppError("Merchant not found with that email", 440, "NOT_FOUND"));
    }

    let targetExpiry: Date;

    if (newExpiryDate) {
      targetExpiry = new Date(newExpiryDate);
      if (isNaN(targetExpiry.getTime())) {
        return next(new AppError("Invalid newExpiryDate format", 400, "BAD_REQUEST"));
      }
    } else {
      const days = daysToAdd || 30; // default to 30 days if unspecified
      const currentExpiryMs = merchant.subscriptionExpiresAt
        ? new Date(merchant.subscriptionExpiresAt).getTime()
        : Date.now();

      // Extend from whichever is later: current date or existing expiration date
      const baseTimeMs = Math.max(Date.now(), currentExpiryMs);
      targetExpiry = new Date(baseTimeMs + days * 24 * 60 * 60 * 1000);
    }

    const updatedMerchant = await merchantRepo.updateSubscription(
      merchant.id,
      "ACTIVE",
      targetExpiry
    );

    res.status(200).json({
      success: true,
      message: `Successfully extended subscription for merchant ${email}.`,
      data: {
        merchant: {
          id: updatedMerchant.id,
          email: updatedMerchant.email,
          name: updatedMerchant.name,
          subscriptionStatus: updatedMerchant.subscriptionStatus,
          subscriptionExpiresAt: updatedMerchant.subscriptionExpiresAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
