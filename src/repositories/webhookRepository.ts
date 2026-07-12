import { prisma } from "../db/client";
import { WebhookLog } from "@prisma/client";

export class WebhookRepository {
  async logWebhook(updateId: bigint, shopId: string, payload: unknown): Promise<WebhookLog> {
    return prisma.webhookLog.create({
      data: {
        updateId,
        shopId,
        payload: payload as any,
      },
    });
  }

  async markProcessed(
    updateId: bigint,
    isProcessed: boolean,
    errorMessage: string | null = null
  ): Promise<WebhookLog> {
    return prisma.webhookLog.update({
      where: { updateId },
      data: {
        isProcessed,
        errorMessage,
      },
    });
  }

  async getByUpdateId(updateId: bigint): Promise<WebhookLog | null> {
    return prisma.webhookLog.findUnique({
      where: { updateId },
    });
  }
}
