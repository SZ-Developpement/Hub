import "server-only";

import type { InvoiceStatus, InvoiceType } from "@/generated/prisma/enums";

type QuoteInvoice = {
  type: InvoiceType;
  status: InvoiceStatus;
  netCents: number;
  creditedCents: number;
  balanceInvoiceId: string | null;
};

export type QuoteInvoicing = {
  /** Montant facturé (hors brouillons), avoirs déduits. */
  invoicedCents: number;
  /** Acomptes émis, avoirs déduits. */
  depositedCents: number;
  /** Acomptes émis pas encore repris par une facture de solde. */
  pendingDepositCents: number;
  remainingCents: number;
  hasDraftDeposit: boolean;
  /** Une facture totale ou de solde existe déjà (brouillon compris). */
  hasFinalInvoice: boolean;
  canInvoiceFull: boolean;
  canInvoiceDeposit: boolean;
  canInvoiceBalance: boolean;
};

/**
 * État de facturation d'un devis, déduit de ses factures. Sert à la fois à l'affichage
 * et aux contrôles de conversion — une seule source de vérité pour les deux.
 */
export function quoteInvoicing(totalCents: number, invoices: QuoteInvoice[]): QuoteInvoicing {
  const active = invoices.filter(
    (invoice) => invoice.type !== "CREDIT_NOTE" && invoice.status !== "CANCELLED",
  );
  const issued = active.filter((invoice) => invoice.status !== "DRAFT");
  const effective = (invoice: QuoteInvoice) => invoice.netCents - invoice.creditedCents;

  const issuedDeposits = issued.filter((invoice) => invoice.type === "DEPOSIT");
  const invoicedCents = issued.reduce((sum, invoice) => sum + effective(invoice), 0);
  const depositedCents = issuedDeposits.reduce((sum, invoice) => sum + effective(invoice), 0);
  const pendingDepositCents = issuedDeposits
    .filter((invoice) => invoice.balanceInvoiceId === null)
    .reduce((sum, invoice) => sum + effective(invoice), 0);

  const hasDraftDeposit = active.some(
    (invoice) => invoice.type === "DEPOSIT" && invoice.status === "DRAFT",
  );
  const hasFinalInvoice = active.some(
    (invoice) => invoice.type === "STANDARD" || invoice.type === "BALANCE",
  );

  return {
    invoicedCents,
    depositedCents,
    pendingDepositCents,
    remainingCents: Math.max(totalCents - invoicedCents, 0),
    hasDraftDeposit,
    hasFinalInvoice,
    canInvoiceFull: active.length === 0,
    canInvoiceDeposit: !hasFinalInvoice && depositedCents < totalCents,
    canInvoiceBalance: !hasFinalInvoice && !hasDraftDeposit && pendingDepositCents > 0,
  };
}
