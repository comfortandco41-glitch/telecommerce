import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { ShopRepository } from "../repositories/shopRepository";
import { AppError } from "../errors/appError";

const shopRepo = new ShopRepository();

export async function shopAccessMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const merchant = req.merchant;
  if (!merchant) {
    return next(new AppError("Unauthorized: Session required", 401, "UNAUTHORIZED"));
  }

  const shopId = req.params.shopId;
  if (!shopId) {
    return next(new AppError("Bad Request: Missing shop ID parameter", 400, "BAD_REQUEST"));
  }

  try {
    const shop = await shopRepo.getById(shopId);
    if (!shop) {
      return next(new AppError("Shop not found", 404, "NOT_FOUND"));
    }

    if (shop.merchantId !== merchant.id) {
      return next(new AppError("Forbidden: You do not own this shop", 403, "FORBIDDEN"));
    }

    next();
  } catch (err) {
    next(err);
  }
}
