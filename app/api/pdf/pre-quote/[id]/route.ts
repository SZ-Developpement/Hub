import { db } from "@/lib/db";
import { buildPreQuoteDocument } from "@/lib/documents/build";
import { loadAssets, renderPreQuotePdf } from "@/lib/pdf/render";
import { notFoundResponse, pdfResponse, unauthorized } from "@/lib/server/http";
import { getOptionalContext } from "@/lib/session";

export async function GET(request: Request, { params }: RouteContext<"/api/pdf/pre-quote/[id]">) {
  const ctx = await getOptionalContext();
  if (!ctx) return unauthorized();

  const { id } = await params;
  const preQuote = await db.preQuote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { client: true, items: { orderBy: { position: "asc" } } },
  });
  if (!preQuote) return notFoundResponse();

  const document = buildPreQuoteDocument(preQuote, ctx.settings);
  const pdf = await renderPreQuotePdf(document, await loadAssets(ctx.organizationId, document.style));
  return pdfResponse(pdf, `Pre-devis-${preQuote.number}.pdf`, request);
}
