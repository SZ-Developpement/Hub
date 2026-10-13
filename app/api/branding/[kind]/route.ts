import { brandInitials } from "@/lib/brand-initials";
import { getBranding } from "@/lib/branding";
import { readableOn } from "@/lib/color";
import { db } from "@/lib/db";
import { readFile } from "@/lib/server/files";

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Favicon par défaut : monogramme sur fond à la couleur d'accent. */
function defaultFavicon(appName: string, accentColor: string): string {
  const initials = escapeXml(brandInitials(appName).slice(0, 2));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${accentColor}"/>
  <text x="32" y="33" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="26" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${readableOn(accentColor)}">${initials}</text>
</svg>`;
}

/**
 * Logo et favicon de l'application. Route publique : la page de connexion en a besoin
 * avant toute authentification. Elle n'expose rien d'autre que ces deux images.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/branding/[kind]">) {
  const { kind } = await params;
  if (kind !== "logo" && kind !== "favicon") {
    return new Response("Introuvable", { status: 404 });
  }

  const branding = await getBranding();
  // L'URL est versionnée (?v=…) par les pages : la réponse peut alors être mise en cache indéfiniment.
  const versioned = new URL(request.url).searchParams.has("v");
  const cacheControl = versioned
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300";

  const fileId = kind === "logo" ? branding.logoFileId : branding.faviconFileId;
  if (fileId) {
    const file = await db.storedFile.findUnique({ where: { id: fileId } });
    const body = file ? await readFile(file) : null;
    if (file && body) {
      return new Response(new Uint8Array(body), {
        headers: {
          "Content-Type": file.contentType,
          "Cache-Control": cacheControl,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  }

  if (kind === "favicon") {
    return new Response(defaultFavicon(branding.appName, branding.accentColor), {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": cacheControl },
    });
  }
  return new Response("Introuvable", { status: 404 });
}
