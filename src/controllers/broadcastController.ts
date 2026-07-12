import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { BroadcastRepository } from "../repositories/broadcastRepository";
import { BroadcastService } from "../services/broadcastService";
import { AppError } from "../errors/appError";
import { z } from "zod";

const broadcastRepo = new BroadcastRepository();
const broadcastService = new BroadcastService();

const createBroadcastSchema = z.object({
  messageText: z.string().min(5),
  mediaUrl: z.string().url().optional().nullable().or(z.literal("")),
  scheduledAt: z.string().datetime().optional().nullable().or(z.literal("")),
});

export async function handleGetBroadcasts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { shopId } = req.params;
  try {
    const list = await broadcastRepo.listByShopId(shopId);
    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateBroadcast(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { shopId } = req.params;
  try {
    const parse = createBroadcastSchema.safeParse(req.body);
    if (!parse.success) {
      return next(new AppError("Invalid input fields", 400, "BAD_REQUEST", parse.error.format()));
    }

    const { messageText, mediaUrl, scheduledAt } = parse.data;
    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    const broadcast = await broadcastRepo.create(shopId, {
      messageText,
      mediaUrl: mediaUrl || null,
      scheduledAt: parsedScheduledAt,
    });

    // If scheduledAt is empty or set to current/past time, trigger immediate delivery run
    if (!parsedScheduledAt || parsedScheduledAt <= new Date()) {
      broadcastService.runBroadcast(shopId, broadcast.id).catch((err) => {
        console.error("Background campaign run error:", err.message);
      });
    }

    res.status(201).json({
      success: true,
      data: broadcast,
    });
  } catch (err) {
    next(err);
  }
}
