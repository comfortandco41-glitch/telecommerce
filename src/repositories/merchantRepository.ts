import { prisma } from "../db/client";
import { Merchant } from "@prisma/client";

export class MerchantRepository {
  async getByEmail(email: string): Promise<Merchant | null> {
    return prisma.merchant.findUnique({
      where: { email },
    });
  }

  async getById(id: string): Promise<Merchant | null> {
    return prisma.merchant.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<Merchant> {
    const trialExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return prisma.merchant.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        subscriptionStatus: "TRIAL",
        subscriptionExpiresAt: trialExpiry,
      },
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<Merchant> {
    return prisma.merchant.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async setResetToken(
    email: string,
    resetToken: string,
    resetTokenExpiresAt: Date
  ): Promise<Merchant | null> {
    return prisma.merchant.update({
      where: { email },
      data: { resetToken, resetTokenExpiresAt },
    });
  }

  async getByResetToken(resetToken: string): Promise<Merchant | null> {
    return prisma.merchant.findFirst({
      where: { resetToken },
    });
  }

  async updatePasswordAndClearToken(
    id: string,
    passwordHash: string
  ): Promise<Merchant> {
    return prisma.merchant.update({
      where: { id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });
  }
}
