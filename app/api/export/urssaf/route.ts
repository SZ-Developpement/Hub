import { csvMoney, toCsv } from "@/lib/csv";
import { today, utcDate } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { URSSAF_STATUS_LABELS } from "@/lib/labels";
import { declarationAmounts, listUrssafDeclarations } from "@/lib/server/accounting";
import { exportYear } from "@/lib/server/export-range";
import { csvResponse, unauthorized } from "@/lib/server/http";
import { getOptionalContext } from "@/lib/session";
import { periodLabel } from "@/lib/urssaf-periods";

/** Déclarations URSSAF — toutes, ou celles d'une année avec `?annee=` — en CSV. */
export async function GET(request: Request) {
  const ctx = await getOptionalContext();
  if (!ctx) return unauthorized();

  const year = exportYear(new URL(request.url).searchParams, today());
  const declarations = await listUrssafDeclarations(
    ctx.organizationId,
    year ? { from: utcDate(year, 0, 1), to: utcDate(year, 11, 31) } : {},
  );

  const csv = toCsv(
    [
      "Période",
      "Début",
      "Fin",
      "CA encaissé",
      "CA déclaré",
      "Cotisations",
      "Nature du montant",
      "Échéance",
      "Statut",
      "Déclaré le",
      "Payé le",
    ],
    [...declarations].reverse().map((row) => [
      periodLabel(row.periodStart, row.periodEnd),
      formatDate(row.periodStart),
      formatDate(row.periodEnd),
      csvMoney(row.revenueCents),
      row.declaredRevenueCents === null ? "" : csvMoney(row.declaredRevenueCents),
      csvMoney(declarationAmounts(row).contributionsCents),
      row.status === "TO_DECLARE" ? "Estimation" : "Déclaré",
      formatDate(row.dueDate),
      URSSAF_STATUS_LABELS[row.status],
      row.declaredOn ? formatDate(row.declaredOn) : "",
      row.paidOn ? formatDate(row.paidOn) : "",
    ]),
  );
  return csvResponse(csv, year ? `Cotisations-URSSAF_${year}.csv` : "Cotisations-URSSAF.csv");
}
