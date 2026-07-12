import { prisma } from "../db/client";
import { Category } from "@prisma/client";

export class CategoryRepository {
  async create(shopId: string, data: { name: string; description?: string }): Promise<Category> {
    return prisma.category.create({
      data: {
        shopId,
        name: data.name,
        description: data.description,
      },
    });
  }

  async listByShopId(shopId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: { shopId },
      orderBy: { name: "asc" },
    });
  }

  async listActiveByShopId(shopId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: { shopId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async getById(shopId: string, id: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { id, shopId },
    });
  }

  async update(
    _shopId: string,
    id: string,
    data: { name?: string; description?: string; isActive?: boolean }
  ): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      },
    });
  }
}
