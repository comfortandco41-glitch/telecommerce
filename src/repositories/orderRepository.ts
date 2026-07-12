import { prisma } from "../db/client";
import { Order } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export class OrderRepository {
  async createOrderTransaction(
    shopId: string,
    customerId: string,
    data: {
      totalAmount: number;
      deliveryAddress: string;
      deliveryPhone: string;
      bankScreenshotUrl: string;
      items: Array<{ productId: string; quantity: number; priceAtPurchase: number }>;
    }
  ): Promise<Order> {
    return prisma.$transaction(async (tx) => {
      // 1. Create the Order record
      const order = await tx.order.create({
        data: {
          shopId,
          customerId,
          status: "PENDING_VERIFICATION",
          totalAmount: new Decimal(data.totalAmount),
          deliveryAddress: data.deliveryAddress,
          deliveryPhone: data.deliveryPhone,
          bankScreenshotUrl: data.bankScreenshotUrl,
        },
      });

      // 2. Iterate items to insert OrderItems and decrement stock count
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }

        // Create OrderItem row
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: new Decimal(item.priceAtPurchase),
          },
        });

        // Decrement catalog stock levels
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return order;
    });
  }

  async getById(shopId: string, id: string): Promise<Order | null> {
    return prisma.order.findFirst({
      where: { id, shopId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });
  }

  async listByShopId(shopId: string): Promise<Order[]> {
    return prisma.order.findMany({
      where: { shopId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(_shopId: string, id: string, status: any): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data: { status },
    });
  }
}
