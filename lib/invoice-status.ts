import type { InvoiceStatus, InvoiceType } from "@/generated/prisma/enums";

export type InvoiceStatusInput = {
  type: InvoiceType;
  issued: boolean;
  netCents: number;
  paidCents: number;
  creditedCents: number;
  dueDate: Date;
};

/** Reste dû : net à payer − avoirs − paiements. Négatif = trop-perçu à rembourser. */
export function amountDueCents(invoice: {
  netCents: number;
  paidCents: number;
  creditedCents: number;
}): number {
  return invoice.netCents - invoice.creditedCents - invoice.paidCents;
}

/**
 * Statut d'une facture, entièrement déduit de ses montants et de son échéance.
 * C'est la seule fonction qui décide du statut : elle est rappelée après chaque
 * paiement, chaque avoir, et une fois par jour pour les passages en retard.
 */
export function computeInvoiceStatus(invoice: InvoiceStatusInput, today: Date): InvoiceStatus {
  if (!invoice.issued) return "DRAFT";
  if (invoice.type === "CREDIT_NOTE") return "ISSUED";

  const fullyCredited = invoice.netCents > 0 && invoice.creditedCents >= invoice.netCents;
  if (fullyCredited) return "CANCELLED";

  const due = amountDueCents(invoice);
  if (due <= 0) return "PAID";
  if (invoice.dueDate.getTime() < today.getTime()) return "OVERDUE";
  if (invoice.paidCents > 0) return "PARTIALLY_PAID";
  return "ISSUED";
}
