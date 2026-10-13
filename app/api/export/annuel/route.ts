import { today } from "@/lib/dates";
import { buildSeller, buildStyle } from "@/lib/documents/build";
import { renderAnnualReportPdf } from "@/lib/pdf/render";
import { getAnnualSummary } from "@/lib/server/accounting";
import { exportYear } from "@/lib/server/export-range";
import { pdfResponse, unauthorized } from "@/lib/server/http";
import { getOptionalContext } from "@/lib/session";

/** Récapitulatif annuel (recettes, dépenses, cotisations) en PDF. */
export async function GET(request: Request) {
  const ctx = await getOptionalContext();
  if (!ctx) return unauthorized();

  const todayDate = today();
  const year =
    exportYear(new URL(request.url).searchParams, todayDate) ?? todayDate.getUTCFullYear();

  const summary = await getAnnualSummary(ctx.organizationId, ctx.settings, year, todayDate);
  const pdf = await renderAnnualReportPdf({
    seller: buildSeller(ctx.settings),
    style: buildStyle(ctx.settings),
    summary,
  });
  return pdfResponse(pdf, `Recapitulatif-annuel_${year}.pdf`, request);
}
