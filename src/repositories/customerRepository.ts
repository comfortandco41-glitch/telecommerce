import { prisma } from "../db/client";
import { Customer } from "@prisma/client";

export class CustomerRepository {
  async getByTelegramId(shopId: string, telegramId: bigint): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: { shopId, telegramId },
    });
  }

  async getById(shopId: string, id: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: { id, shopId },
    });
  }

  async create(
    shopId: string,
    data: {
      telegramId: bigint;
      username?: string | null;
      firstName: string;
      lastName?: string | null;
    }
  ): Promise<Customer> {
    return prisma.customer.create({
      data: {
        shopId,
        telegramId: data.telegramId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        checkoutStep: "IDLE",
        cart: [],
      },
    });
  }

  async update(
    _shopId: string,
    id: string,
    data: {
      username?: string | null;
      firstName?: string;
      lastName?: string | null;
      phone?: string | null;
      address?: string | null;
      checkoutStep?: string;
      cart?: any;
    }
  ): Promise<Customer> {
    return prisma.customer.update({
      where: { id },
      data: {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
        checkoutStep: data.checkoutStep,
        cart: data.cart !== undefined ? data.cart : undefined,
      },
    });
  }

  async listByShopId(shopId: string): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
  }
}
