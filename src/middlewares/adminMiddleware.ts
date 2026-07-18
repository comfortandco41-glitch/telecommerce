import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "superbot-admin-secret-key-2026";

export function adminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const secretHeader = req.headers["x-admin-secret"];

  if (!secretHeader || secretHeader !== ADMIN_SECRET) {
    return next(new AppError("Unauthorized Admin Access", 401, "UNAUTHORIZED"));
  }

  next();
}
