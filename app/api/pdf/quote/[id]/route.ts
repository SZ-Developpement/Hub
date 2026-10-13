import { db } from "@/lib/db";
import { buildQuoteDocument } from "@/lib/documents/build";
import { loadAssets, renderQuotePdf } from "@/lib/pdf/render";
import { notFoundResponse, pdfResponse, unauthorized } from "@/lib/server/http";
import { getOptionalContext } from "@/lib/session";

export async function GET(request: Request, { params }: RouteContext<"/api/pdf/quote/[id]">) {
  const ctx = await getOptionalContext();
  if (!ctx) return unauthorized();

  const { id } = await params;
  const quote = await db.quote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { client: true, lines: { orderBy: { position: "asc" } } },
  });
  if (!quote) return notFoundResponse();

  const document = buildQuoteDocument(quote, ctx.settings);
  const pdf = await renderQuotePdf(document, await loadAssets(ctx.organizationId, document.style));
  return pdfResponse(pdf, `Devis-${quote.number}.pdf`, request);
}
