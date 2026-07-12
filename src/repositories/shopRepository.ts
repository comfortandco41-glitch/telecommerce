import { prisma } from "../db/client";
import { Shop } from "@prisma/client";

export class ShopRepository {
  async getById(id: string): Promise<Shop | null> {
    return prisma.shop.findUnique({
      where: { id },
    });
  }

  async getByToken(botToken: string): Promise<Shop | null> {
    return prisma.shop.findUnique({
      where: { botToken },
    });
  }
}
