import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { prisma } from "../db/client";
import { AppError } from "../errors/appError";
import { supabase } from "../db/supabaseClient";

export async function handleUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { shopId } = req.params;
  const { fileName, fileData } = req.body;

  try {
    if (!req.merchant) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!fileName || !fileData) {
      return next(new AppError("fileName and fileData (base64) are required", 400, "BAD_REQUEST"));
    }

    // Verify shop ownership
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, merchantId: req.merchant.id },
    });
    if (!shop) {
      return next(new AppError("Shop not found or access denied", 404, "NOT_FOUND"));
    }

    // Parse base64 string
    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let mimeType = "image/jpeg";

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], "base64");
    } else {
      // Direct raw base64 string
      buffer = Buffer.from(fileData, "base64");
    }

    // Validate size (200KB limit)
    if (buffer.length > 200 * 1024) {
      return next(new AppError("File size exceeds 200KB limit", 400, "BAD_REQUEST"));
    }

    // Upload to Supabase Storage receipts bucket
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${shopId}/products/${Date.now()}-${cleanFileName}`;
    const { error } = await supabase.storage.from("receipts").upload(storagePath, buffer, {
      contentType: mimeType,
    });

    if (error) {
      return next(new AppError(`Supabase Storage upload failed: ${error.message}`, 500, "INTERNAL_SERVER_ERROR"));
    }

    const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(storagePath);

    res.status(200).json({
      success: true,
      data: {
        url: urlData.publicUrl,
        size: buffer.length,
      },
    });
  } catch (err) {
    next(err);
  }
}
