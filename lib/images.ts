import "server-only";

import sharp from "sharp";

import { AppError } from "@/lib/errors";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/svg+xml"] as const;
export const RECEIPT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type ImagePreset = "logo" | "signature" | "favicon" | "avatar";

const PRESETS: Record<
  ImagePreset,
  { width: number; height: number; fit: "inside" | "cover" | "contain" }
> = {
  logo: { width: 800, height: 400, fit: "inside" },
  signature: { width: 600, height: 300, fit: "inside" },
  favicon: { width: 128, height: 128, fit: "contain" },
  avatar: { width: 256, height: 256, fit: "cover" },
};

export type ProcessedImage = {
  buffer: Buffer;
  contentType: "image/png";
  width: number;
  height: number;
};

export function assertUpload(file: File, allowed: readonly string[]): void {
  if (file.size === 0) throw new AppError("Le fichier est vide.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("Le fichier dépasse la taille maximale de 4 Mo.");
  }
  if (!allowed.includes(file.type)) {
    throw new AppError("Ce format de fichier n'est pas accepté.");
  }
}

/**
 * Redimensionne et normalise une image en PNG.
 *
 * Tout est rastérisé, SVG compris : les PDF n'acceptent que du bitmap, et cela évite
 * de servir un SVG arbitraire (potentiellement actif) depuis notre origine.
 */
export async function processImage(input: Buffer, preset: ImagePreset): Promise<ProcessedImage> {
  const { width, height, fit } = PRESETS[preset];
  try {
    const { data, info } = await sharp(input, { density: 300, limitInputPixels: 50_000_000 })
      .rotate()
      .resize({
        width,
        height,
        fit,
        withoutEnlargement: fit === "inside",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, contentType: "image/png", width: info.width, height: info.height };
  } catch {
    throw new AppError("Image illisible. Utilisez un fichier PNG, JPG ou SVG valide.");
  }
}
