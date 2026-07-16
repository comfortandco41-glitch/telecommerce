import { Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { MerchantRepository } from "../repositories/merchantRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { AppError } from "../errors/appError";
import { z } from "zod";
import { supabase } from "../db/supabaseClient";

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

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6),
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

    // Sign up with Supabase Auth (automatically sends confirmation template in the background)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      return next(new AppError(signUpError.message, 400, "BAD_REQUEST"));
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

export async function handleVerifyOtp(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = verifyOtpSchema.safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid inputs", 400, "BAD_REQUEST", parse.error.format()));
    }

    const { email, code } = parse.data;

    // Verify OTP with Supabase
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (error) {
      return next(new AppError(error.message || "Invalid or expired verification code", 400, "BAD_REQUEST"));
    }

    const merchant = await merchantRepo.getByEmail(email);
    if (!merchant) {
      return next(new AppError("Merchant profile not found", 404, "NOT_FOUND"));
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

    // Validate credentials using Supabase Auth
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Fallback to local PostgreSQL password check for backward compatibility
      const merchant = await merchantRepo.getByEmail(email);
      if (!merchant) {
        return next(new AppError(signInError.message || "Invalid email or password", 401, "UNAUTHORIZED"));
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
      return;
    }

    const merchant = await merchantRepo.getByEmail(email);
    if (!merchant) {
      return next(new AppError("Merchant database profile not found", 404, "NOT_FOUND"));
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

export async function handleForgotPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = forgotPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid email", 400, "BAD_REQUEST", parse.error.format()));
    }

    const { email } = parse.data;

    const merchant = await merchantRepo.getByEmail(email);
    if (!merchant) {
      return next(new AppError("Email is not registered", 404, "NOT_FOUND"));
    }

    // Trigger recovery OTP code sent to user email
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      return next(new AppError(error.message, 400, "BAD_REQUEST"));
    }

    res.status(200).json({
      success: true,
      message: "Password reset code sent to your registered email.",
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

    const { email, code, newPassword } = parse.data;

    // Verify recovery OTP
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });

    if (otpError) {
      return next(new AppError(otpError.message || "Invalid or expired recovery code", 400, "BAD_REQUEST"));
    }

    // Update password in Supabase
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return next(new AppError(updateError.message || "Failed to update password", 400, "BAD_REQUEST"));
    }

    const merchant = await merchantRepo.getByEmail(email);
    if (!merchant) {
      return next(new AppError("Merchant database profile not found", 404, "NOT_FOUND"));
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await merchantRepo.updatePassword(merchant.id, passwordHash);

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now log in.",
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
