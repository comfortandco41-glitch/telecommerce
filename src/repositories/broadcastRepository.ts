import { prisma } from "../db/client";
import { Broadcast, BroadcastStatus } from "@prisma/client";

export class BroadcastRepository {
  async create(
    shopId: string,
    data: {
      messageText: string;
      mediaUrl?: string | null;
      targetAudience?: string;
      scheduledAt?: Date | null;
    }
  ): Promise<Broadcast> {
    return prisma.broadcast.create({
      data: {
        shopId,
        messageText: data.messageText,
        mediaUrl: data.mediaUrl || null,
        targetAudience: data.targetAudience || "ALL",
        scheduledAt: data.scheduledAt || null,
        status: BroadcastStatus.PENDING,
      },
    });
  }

  async listByShopId(shopId: string): Promise<Broadcast[]> {
    return prisma.broadcast.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string): Promise<Broadcast | null> {
    return prisma.broadcast.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    data: {
      status?: BroadcastStatus;
      sentCount?: number;
      failedCount?: number;
      sentAt?: Date | null;
    }
  ): Promise<Broadcast> {
    return prisma.broadcast.update({
      where: { id },
      data: {
        status: data.status,
        sentCount: data.sentCount,
        failedCount: data.failedCount,
        sentAt: data.sentAt,
      },
    });
  }

  async countMonthlyBroadcastsByShop(shopId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { merchantId: true },
    });

    if (!shop) return 0;

    return prisma.broadcast.count({
      where: {
        shop: {
          merchantId: shop.merchantId,
        },
        createdAt: {
          gte: startOfMonth,
        },
      },
    });
  }
}
