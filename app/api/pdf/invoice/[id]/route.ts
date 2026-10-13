import { notFoundResponse, pdfResponse, unauthorized } from "@/lib/server/http";
import { getInvoicePdf } from "@/lib/server/invoices";
import { getOptionalContext } from "@/lib/session";

/** PDF d'une facture ou d'un avoir : l'archive pour une pièce émise, un aperçu pour un brouillon. */
export async function GET(request: Request, { params }: RouteContext<"/api/pdf/invoice/[id]">) {
  const ctx = await getOptionalContext();
  if (!ctx) return unauthorized();

  const { id } = await params;
  const result = await getInvoicePdf(ctx, id);
  if (!result) return notFoundResponse();

  return pdfResponse(result.pdf, result.fileName, request);
}
