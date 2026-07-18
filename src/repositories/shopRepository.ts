import { prisma } from "../db/client";
import { Shop } from "@prisma/client";

export class ShopRepository {
  async getById(id: string): Promise<Shop | null> {
    return prisma.shop.findUnique({
      where: { id },
    });
  }

  async getByIdWithMerchant(id: string) {
    return prisma.shop.findUnique({
      where: { id },
      include: { merchant: true },
    });
  }

  async getByToken(botToken: string): Promise<Shop | null> {
    return prisma.shop.findUnique({
      where: { botToken },
    });
  }

  async listByMerchantId(merchantId: string): Promise<Shop[]> {
    return prisma.shop.findMany({
      where: { merchantId },
    });
  }
}
