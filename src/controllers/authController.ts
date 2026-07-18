import { Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { MerchantRepository } from "../repositories/merchantRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { AppError } from "../errors/appError";
import { z } from "zod";
import { sendPasswordResetEmail } from "../services/emailService";

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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
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

export async function handleForgotPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = forgotPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid inputs", 400, "BAD_REQUEST", parse.error.format()));
    }

    const { email } = parse.data;
    const merchant = await merchantRepo.getByEmail(email);

    if (merchant) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await merchantRepo.setResetToken(email, resetToken, expiresAt);
      await sendPasswordResetEmail(email, resetToken);
    }

    res.status(200).json({
      success: true,
      message: "If an account with that email exists, password reset instructions have been sent.",
    });
  } catch (err) {
    next(err);
  }
}

export async function handleResetPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = resetPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid inputs", 400, "BAD_REQUEST", parse.error.format()));
    }

    const { token, newPassword } = parse.data;
    const merchant = await merchantRepo.getByResetToken(token);

    if (!merchant || !merchant.resetTokenExpiresAt) {
      return next(new AppError("Invalid or expired reset token", 400, "BAD_REQUEST"));
    }

    if (merchant.resetTokenExpiresAt < new Date()) {
      return next(new AppError("Reset token has expired", 400, "EXPIRED_TOKEN"));
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await merchantRepo.updatePasswordAndClearToken(merchant.id, passwordHash);

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (err) {
    next(err);
  }
}
