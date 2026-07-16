import sharp from "sharp";

/**
 * Compresses an image buffer (receipt or product image) to JPEG format.
 * Max dimension: 1280px (width or height, maintaining aspect ratio).
 * Quality: 75% (produces target size of ~100-150 KB).
 */
export async function compressReceiptImage(buffer: Buffer): Promise<{ data: Buffer; mimeType: string }> {
  try {
    const compressed = await sharp(buffer)
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 75,
        progressive: true,
      })
      .toBuffer();

    return {
      data: compressed,
      mimeType: "image/jpeg",
    };
  } catch (err: any) {
    console.error("Image compression failed, falling back to original buffer:", err.message);
    return {
      data: buffer,
      mimeType: "image/jpeg",
    };
  }
}
