import { prisma } from "../db/client";
import { Product } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export class ProductRepository {
  async create(
    shopId: string,
    data: {
      categoryId: string;
      name: string;
      description: string;
      price: number;
      stock: number;
      images?: string[];
    }
  ): Promise<Product> {
    return prisma.product.create({
      data: {
        shopId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: new Decimal(data.price),
        stock: data.stock,
        images: data.images || [],
      },
    });
  }

  async listByShopId(shopId: string): Promise<Product[]> {
    return prisma.product.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listActiveByShopId(shopId: string): Promise<Product[]> {
    return prisma.product.findMany({
      where: { shopId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async listActiveByCategoryId(shopId: string, categoryId: string): Promise<Product[]> {
    return prisma.product.findMany({
      where: { shopId, categoryId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async getById(shopId: string, id: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: { id, shopId },
    });
  }

  async update(
    _shopId: string,
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      images?: string[];
      isActive?: boolean;
    }
  ): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: data.price !== undefined ? new Decimal(data.price) : undefined,
        stock: data.stock,
        images: data.images,
        isActive: data.isActive,
      },
    });
  }

  async delete(_shopId: string, id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id },
    });
  }
}
