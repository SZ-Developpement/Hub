import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { ThemeMode } from "@/generated/prisma/enums";
import { isHexColor } from "@/lib/color";
import { db } from "@/lib/db";

export const BRANDING_TAG = "branding";

export type Branding = {
  appName: string;
  accentColor: string;
  theme: ThemeMode;
  logoFileId: string | null;
  faviconFileId: string | null;
};

export const DEFAULT_BRANDING: Branding = {
  appName: "SZ Dev",
  accentColor: "#dc2626",
  theme: "DARK",
  logoFileId: null,
  faviconFileId: null,
};

/**
 * Identité visuelle de l'application (nom, couleur d'accent, thème, logo).
 *
 * Mise en cache et intégrée au squelette statique de chaque page : la couleur d'accent
 * est appliquée dès le premier octet, sans flash. Invalidée par `updateTag(BRANDING_TAG)`
 * à l'enregistrement des paramètres d'apparence.
 */
export async function getBranding(): Promise<Branding> {
  "use cache";
  cacheTag(BRANDING_TAG);

  try {
    const settings = await db.settings.findFirst({
      orderBy: { createdAt: "asc" },
      select: {
        appName: true,
        accentColor: true,
        theme: true,
        appLogoFileId: true,
        faviconFileId: true,
      },
    });
    cacheLife("max");
    if (!settings) return DEFAULT_BRANDING;
    return {
      appName: settings.appName || DEFAULT_BRANDING.appName,
      accentColor: isHexColor(settings.accentColor)
        ? settings.accentColor
        : DEFAULT_BRANDING.accentColor,
      theme: settings.theme,
      logoFileId: settings.appLogoFileId,
      faviconFileId: settings.faviconFileId,
    };
  } catch (error) {
    // Base injoignable (par exemple au build) : valeurs par défaut, réessai rapide.
    console.warn(
      "Identité visuelle par défaut, base injoignable :",
      error instanceof Error ? error.message : error,
    );
    cacheLife("minutes");
    return DEFAULT_BRANDING;
  }
}
