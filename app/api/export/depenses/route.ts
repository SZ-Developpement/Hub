import { csvMoney, toCsv } from "@/lib/csv";
import { toISO, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { exportRange } from "@/lib/server/export-range";
import { csvResponse, unauthorized } from "@/lib/server/http";
import { getOptionalContext } from "@/lib/session";

/** Dépenses d'une période, en CSV. */
export async function GET(request: Request) {
  const ctx = await getOptionalContext();
  if (!ctx) return unauthorized();

  const { from, to } = exportRange(new URL(request.url).searchParams, today());
  const expenses = await db.expense.findMany({
    where: { organizationId: ctx.organizationId, date: { gte: from, lte: to } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { category: { select: { name: true } } },
  });

  const csv = toCsv(
    [
      "Date",
      "Fournisseur",
      "Objet",
      "Catégorie",
      "Montant TTC",
      "Moyen de paiement",
      "Justificatif",
      "Notes",
    ],
    expenses.map((expense) => [
      formatDate(expense.date),
      expense.supplier,
      expense.label,
      expense.category.name,
      csvMoney(expense.amountCents),
      PAYMENT_METHOD_LABELS[expense.method],
      expense.receiptFileId ? "Oui" : "Non",
      expense.notes,
    ]),
  );
  return csvResponse(csv, `Depenses_${toISO(from)}_${toISO(to)}.csv`);
}
