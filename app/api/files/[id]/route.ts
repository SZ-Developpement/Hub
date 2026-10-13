import { db } from "@/lib/db";
import { readFile } from "@/lib/server/files";
import { getOptionalContext } from "@/lib/session";

/**
 * Sert un fichier stocké (logo, signature, justificatif, PDF archivé).
 * Accès réservé aux membres de l'organisation propriétaire du fichier.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/files/[id]">) {
  const ctx = await getOptionalContext();
  if (!ctx) return new Response("Non authentifié", { status: 401 });

  const { id } = await params;
  const file = await db.storedFile.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!file) return new Response("Fichier introuvable", { status: 404 });

  const body = await readFile(file);
  if (!body) return new Response("Fichier introuvable", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  const fileName = encodeURIComponent(file.originalName ?? "fichier");

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${fileName}`,
      // Un fichier ne change jamais (un remplacement crée un nouvel identifiant).
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
