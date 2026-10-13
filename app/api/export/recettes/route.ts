import { PaymentMethod } from "@/generated/prisma/enums";
import { csvMoney, toCsv } from "@/lib/csv";
import { toISO, today } from "@/lib/dates";
import { buildSeller, buildStyle } from "@/lib/documents/build";
import { formatDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { renderReceiptsBookPdf } from "@/lib/pdf/render";
import { listReceipts } from "@/lib/server/accounting";
import { exportRange } from "@/lib/server/export-range";
import { csvResponse, pdfResponse, unauthorized } from "@/lib/server/http";
import { getOptionalContext } from "@/lib/session";

/** Livre des recettes d'une période, en CSV ou en PDF (`?format=pdf`). */
export async function GET(request: Request) {
  const ctx = await getOptionalContext();
  if (!ctx) return unauthorized();

  const params = new URL(request.url).searchParams;
  const { from, to } = exportRange(params, today());
  const method = Object.values(PaymentMethod).find((value) => value === params.get("mode"));

  const { rows, totalCents } = await listReceipts(ctx.organizationId, { from, to, method });
  const suffix = `${toISO(from)}_${toISO(to)}`;

  if (params.get("format") === "pdf") {
    const pdf = await renderReceiptsBookPdf({
      seller: buildSeller(ctx.settings),
      style: buildStyle(ctx.settings),
      from: toISO(from),
      to: toISO(to),
      receipts: rows,
      totalCents,
    });
    return pdfResponse(pdf, `Livre-des-recettes_${suffix}.pdf`, request);
  }

  const csv = toCsv(
    [
      "Date d'encaissement",
      "Client",
      "Référence de la facture",
      "Nature",
      "Montant",
      "Mode de règlement",
      "Référence du règlement",
    ],
    rows.map((receipt) => [
      formatDate(receipt.paidOn),
      receipt.invoice.client.name,
      receipt.invoice.number,
      receipt.amountCents < 0 ? "Remboursement" : "Prestation de services",
      csvMoney(receipt.amountCents),
      PAYMENT_METHOD_LABELS[receipt.method],
      receipt.reference,
    ]),
  );
  return csvResponse(csv, `Livre-des-recettes_${suffix}.csv`);
}
