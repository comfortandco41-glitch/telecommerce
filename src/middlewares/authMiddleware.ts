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

    req.merchant = {
      id: merchant.id,
      email: merchant.email,
      name: merchant.name,
      subscriptionStatus: merchant.subscriptionStatus,
      subscriptionExpiresAt: merchant.subscriptionExpiresAt,
    };
    next();
  } catch (err) {
    return next(new AppError("Unauthorized: Invalid token signature", 401, "UNAUTHORIZED"));
  }
}
