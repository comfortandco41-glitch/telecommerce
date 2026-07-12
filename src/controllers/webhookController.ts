import { Request, Response, NextFunction } from "express";
import { ShopRepository } from "../repositories/shopRepository";
import { WebhookRepository } from "../repositories/webhookRepository";
import { WebhookService } from "../services/webhookService";
import { ValidationError, NotFoundError, ForbiddenError } from "../errors/appError";
import crypto from "crypto";

export class WebhookController {
  private shopRepo = new ShopRepository();
  private webhookRepo = new WebhookRepository();
  private webhookService = new WebhookService();

  public handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shopId } = req.params;
      const payload = req.body;

      if (!shopId) {
        throw new ValidationError("shopId is required");
      }

      if (!payload || typeof payload !== "object") {
        throw new ValidationError("Invalid payload body");
      }

      const updateIdVal = payload.update_id;
      if (updateIdVal === undefined || updateIdVal === null) {
        throw new ValidationError("update_id is required in the payload");
      }

      // Convert updateId safely
      const updateId = BigInt(updateIdVal as string | number);

      // 1. Verify shop existence
      const shop = await this.shopRepo.getById(shopId);
      if (!shop) {
        throw new NotFoundError("Shop not found");
      }

      // 2. Security validation: Verify bot secret token header
      const secretTokenHeader = req.headers["x-telegram-bot-api-secret-token"];
      // Expected token derived deterministically using SHA-256 of the botToken
      const expectedToken = crypto.createHash("sha256").update(shop.botToken).digest("hex");

      if (!secretTokenHeader || secretTokenHeader !== expectedToken) {
        throw new ForbiddenError("Invalid X-Telegram-Bot-Api-Secret-Token");
      }

      // 3. Log webhook & enforce idempotency unique constraint check
      try {
        await this.webhookRepo.logWebhook(updateId, shopId, payload);
      } catch (err: any) {
        // Prisma code P2002: Unique constraint failed on WebhookLog.updateId
        if (err.code === "P2002") {
          console.log(`Duplicate update_id ${updateId} skipped (Idempotency Guard).`);
          res.status(200).json({ success: true, message: "Duplicate update ignored." });
          return;
        }
        throw err;
      }

      // 4. Dispatch async task to background process
      this.webhookService.processUpdate(shopId, payload).catch((error) => {
        console.error(`Background processing failed for update ${updateId}:`, error);
      });

      // 5. Instantly return HTTP 200 OK
      res.status(200).json({
        success: true,
        message: "Webhook update received and queued for processing.",
      });
    } catch (err) {
      next(err);
    }
  };
}
