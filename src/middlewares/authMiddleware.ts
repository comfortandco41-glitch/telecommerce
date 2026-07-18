import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { MerchantRepository } from "../repositories/merchantRepository";
import { AppError } from "../errors/appError";

export interface AuthenticatedRequest extends Request {
  merchant?: {
    id: string;
    email: string;
    name: string;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: Date | null;
    isExpired?: boolean;
  };
}

const merchantRepo = new MerchantRepository();
const JWT_SECRET = process.env.JWT_SECRET || "local-jwt-secret-key-32-bytes-long";

export async function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized: Missing token header", 401, "UNAUTHORIZED"));
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const merchant = await merchantRepo.getById(decoded.id);

    if (!merchant) {
      return next(new AppError("Unauthorized: Merchant profile not found", 401, "UNAUTHORIZED"));
    }

    const isExpired = merchant.subscriptionExpiresAt
      ? new Date(merchant.subscriptionExpiresAt) < new Date() || merchant.subscriptionStatus === "EXPIRED"
      : false;

    req.merchant = {
      id: merchant.id,
      email: merchant.email,
      name: merchant.name,
      subscriptionStatus: isExpired ? "EXPIRED" : merchant.subscriptionStatus,
      subscriptionExpiresAt: merchant.subscriptionExpiresAt,
      isExpired,
    };
    next();
  } catch (err) {
    return next(new AppError("Unauthorized: Invalid token signature", 401, "UNAUTHORIZED"));
  }
}

export async function checkSubscriptionMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (req.merchant?.isExpired) {
    return next(
      new AppError(
        "Subscription expired. Please contact admin @TCsub_bot on Telegram to renew your account.",
        402,
        "SUBSCRIPTION_EXPIRED"
      )
    );
  }
  next();
}
