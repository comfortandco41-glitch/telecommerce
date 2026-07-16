import { prisma } from "../db/client";
import { supabase } from "../db/supabaseClient";

/**
 * Runs a task to clean up storage resources:
 * 1. Deletes chat history (SupportMessage) older than 30 days.
 * 2. Deletes bank receipts (Supabase Storage files & URL references) older than 30 days.
 */
export async function runStorageCleanup(): Promise<void> {
  try {
    console.log("[CleanupService] Starting storage cleanup...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Clean up support chat messages older than 30 days
    const chatCleanup = await prisma.supportMessage.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });
    if (chatCleanup.count > 0) {
      console.log(`[CleanupService] Deleted ${chatCleanup.count} support messages older than 30 days.`);
    }

    // 2. Clean up bank transfer receipts older than 30 days
    const oldOrders = await prisma.order.findMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        bankScreenshotUrl: { not: null },
      },
      select: {
        id: true,
        bankScreenshotUrl: true,
      },
    });

    if (oldOrders.length > 0) {
      console.log(`[CleanupService] Found ${oldOrders.length} receipts older than 30 days to remove.`);
      
      const pathsToDelete: string[] = [];
      const orderIdsToUpdate: string[] = [];

      for (const order of oldOrders) {
        if (order.bankScreenshotUrl) {
          // Extract the storage path (part after the /receipts/ bucket name)
          // URL format: https://.../storage/v1/object/public/receipts/shopId/receipts/filename.jpg
          const match = order.bankScreenshotUrl.match(/\/receipts\/(.+)$/);
          if (match && match[1]) {
            // Decode URI components (e.g. %20 -> spaces) in case characters are encoded
            pathsToDelete.push(decodeURIComponent(match[1]));
          }
          orderIdsToUpdate.push(order.id);
        }
      }

      if (pathsToDelete.length > 0) {
        // Supabase .remove() expects an array of relative paths
        const { error } = await supabase.storage.from("receipts").remove(pathsToDelete);
        if (error) {
          console.error("[CleanupService] Failed to delete receipt files from Supabase Storage:", error.message);
        } else {
          console.log(`[CleanupService] Successfully deleted ${pathsToDelete.length} receipt files from Supabase Storage.`);
        }
      }

      if (orderIdsToUpdate.length > 0) {
        const updateResult = await prisma.order.updateMany({
          where: {
            id: { in: orderIdsToUpdate },
          },
          data: {
            bankScreenshotUrl: null,
          },
        });
        console.log(`[CleanupService] Nullified bankScreenshotUrl in database for ${updateResult.count} orders.`);
      }
    }

    console.log("[CleanupService] Storage cleanup finished.");
  } catch (err: any) {
    console.error("[CleanupService] Storage cleanup execution error:", err.message);
  }
}

/**
 * Starts the interval scheduler to execute the cleanup task every 24 hours.
 */
export function startCleanupScheduler(): void {
  // Execute immediately on startup
  runStorageCleanup();

  // Schedule to run every 24 hours
  setInterval(() => {
    runStorageCleanup();
  }, 24 * 60 * 60 * 1000);
}
