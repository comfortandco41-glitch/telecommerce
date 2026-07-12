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
    return prisma.merchant.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
      },
    });
  }
}
