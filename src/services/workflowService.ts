import { prisma } from "../db/client";
import { telegramClient } from "./telegramClient";

export class WorkflowService {
  async trigger(shopId: string, triggerEvent: string, payload: any): Promise<void> {
    try {
      console.log(`Workflow trigger fired: ${triggerEvent} for shop ${shopId}`);

      // Query active workflows matching the trigger
      const workflows = await prisma.workflow.findMany({
        where: { shopId, trigger: triggerEvent, isActive: true },
      });

      if (!workflows || !Array.isArray(workflows)) {
        return;
      }

      for (const wf of workflows) {
        console.log(`Executing workflow: ${wf.name} (${wf.id}) for trigger ${triggerEvent}`);
        try {
          const config = wf.config as any;

          if (wf.action === "SEND_TELEGRAM_NOTIFICATION") {
            const shop = await prisma.shop.findUnique({ where: { id: shopId } });
            const botToken = payload.botToken || shop?.botToken;
            
            if (botToken && config.chatId) {
              let text = config.messageTemplate || `Workflow Notification: Event ${triggerEvent}`;
              text = text
                .replace("{{orderId}}", payload.orderId || "")
                .replace("{{amount}}", payload.amount || "")
                .replace("{{customerName}}", payload.customerName || "");

              await telegramClient.sendMessage(botToken, config.chatId, text);
            }
          } else if (wf.action === "SEND_WEBHOOK") {
            if (config.url) {
              const res = await fetch(config.url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                console.error(`Outbound workflow webhook execution failed: ${res.status}`);
              }
            }
          }
        } catch (err: any) {
          console.error(`Error executing workflow action ${wf.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error(`Workflow broker error:`, err.message);
    }
  }
}
export const workflowService = new WorkflowService();
