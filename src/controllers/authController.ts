import { Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { MerchantRepository } from "../repositories/merchantRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { AppError } from "../errors/appError";
import { z } from "zod";

const merchantRepo = new MerchantRepository();
const JWT_SECRET = process.env.JWT_SECRET || "local-jwt-secret-key-32-bytes-long";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function handleRegister(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid inputs", 400, "BAD_REQUEST", parse.error.format()));
    }

    const { email, password, name } = parse.data;

    // Check if email already registered locally
    const existing = await merchantRepo.getByEmail(email);
    if (existing) {
      return next(new AppError("Email is already registered", 400, "BAD_REQUEST"));
    }

    // Create the merchant locally with hashed password
    const passwordHash = await bcrypt.hash(password, 10);
    const merchant = await merchantRepo.create({ email, passwordHash, name });

    const token = jwt.sign({ id: merchant.id, email: merchant.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      success: true,
      message: "Merchant account registered successfully.",
      data: {
        token,
        merchant: {
          id: merchant.id,
          email: merchant.email,
          name: merchant.name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleLogin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid inputs", 400, "BAD_REQUEST", parse.error.format()));
    }

    const { email, password } = parse.data;

    // Validate credentials locally
    const merchant = await merchantRepo.getByEmail(email);
    if (!merchant) {
      return next(new AppError("Invalid email or password", 401, "UNAUTHORIZED"));
    }

    const isMatch = await bcrypt.compare(password, merchant.passwordHash);
    if (!isMatch) {
      return next(new AppError("Invalid email or password", 401, "UNAUTHORIZED"));
    }

    const token = jwt.sign({ id: merchant.id, email: merchant.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        merchant: {
          id: merchant.id,
          email: merchant.email,
          name: merchant.name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.merchant) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    res.status(200).json({
      success: true,
      data: {
        merchant: req.merchant,
      },
    });
  } catch (err) {
    next(err);
  }
}
