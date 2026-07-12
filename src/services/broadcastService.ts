import { prisma } from "../db/client";
import { telegramClient } from "./telegramClient";
import { BroadcastRepository } from "../repositories/broadcastRepository";
import { BroadcastStatus } from "@prisma/client";

const broadcastRepo = new BroadcastRepository();

export class BroadcastService {
  async runBroadcast(shopId: string, broadcastId: string): Promise<void> {
    try {
      console.log(`Starting campaign runner for broadcast ${broadcastId}...`);

      // 1. Load details and verify PENDING status
      const broadcast = await broadcastRepo.getById(broadcastId);
      if (!broadcast || broadcast.status !== BroadcastStatus.PENDING) {
        return;
      }

      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
      });
      if (!shop) {
        throw new Error(`Shop with ID ${shopId} not found`);
      }

      // Update state to SENDING
      await broadcastRepo.update(broadcastId, { status: BroadcastStatus.SENDING });

      // 2. Fetch target audience subscribers
      const customers = await prisma.customer.findMany({
        where: { shopId },
      });

      console.log(`Campaign ${broadcastId} has ${customers.length} target customers`);

      let sentCount = 0;
      let failedCount = 0;

      // 3. Sequential dispatch loop with a 40ms pause (max 25 messages per second)
      for (const customer of customers) {
        try {
          // Pause to respect Telegram's rate-limiting
          await new Promise((resolve) => setTimeout(resolve, 40));

          // If broadcast has mediaUrl, we can send text containing link, or just standard message
          let text = broadcast.messageText;
          if (broadcast.mediaUrl) {
            text = `${broadcast.messageText}\n\n[Attachment](${broadcast.mediaUrl})`;
          }

          await telegramClient.sendMessage(
            shop.botToken,
            customer.telegramId.toString(),
            text
          );

          sentCount++;
        } catch (err: any) {
          console.error(`Failed to dispatch message to customer ${customer.id}:`, err.message);
          failedCount++;
        }
      }

      // 4. Update status to completed SENT or FAILED
      const finalStatus =
        sentCount === 0 && customers.length > 0
          ? BroadcastStatus.FAILED
          : BroadcastStatus.SENT;

      await broadcastRepo.update(broadcastId, {
        status: finalStatus,
        sentCount,
        failedCount,
        sentAt: new Date(),
      });

      console.log(
        `Campaign ${broadcastId} completed. Sent: ${sentCount}, Failed: ${failedCount}, Status: ${finalStatus}`
      );
    } catch (err: any) {
      console.error(`Broadcast campaign runner error for ${broadcastId}:`, err.message);
      await broadcastRepo.update(broadcastId, {
        status: BroadcastStatus.FAILED,
      });
    }
  }
}
