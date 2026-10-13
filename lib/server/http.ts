import "server-only";

/** Réponse HTTP pour un PDF : affichage dans le navigateur, ou téléchargement avec `?download`. */
export function pdfResponse(pdf: Buffer, fileName: string, request: Request): Response {
  const download = new URL(request.url).searchParams.has("download");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function csvResponse(csv: string, fileName: string): Response {
  // BOM UTF-8 : sans lui, Excel lit les accents de travers.
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export const unauthorized = () => new Response("Non authentifié", { status: 401 });
export const notFoundResponse = () => new Response("Introuvable", { status: 404 });
