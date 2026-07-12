import { WebhookRepository } from "../repositories/webhookRepository";

export class WebhookService {
  private webhookRepo = new WebhookRepository();

  async processUpdate(shopId: string, payload: Record<string, unknown>): Promise<void> {
    const updateId = BigInt(payload.update_id as number | string | bigint);
    try {
      console.log(`Processing update ${updateId} in background for shop ${shopId}...`);
      
      // Base payload schema verification for Telegram updates
      if (!payload.message && !payload.callback_query) {
        throw new Error("Invalid payload: Update does not contain message or callback_query.");
      }

      // Success processing: mark WebhookLog as processed = true
      await this.webhookRepo.markProcessed(updateId, true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Error processing webhook update ${updateId}:`, errMsg);
      
      // Error processing: mark WebhookLog as processed = false and record error
      await this.webhookRepo.markProcessed(updateId, false, errMsg);
    }
  }
}
