import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { toISO, toISOOrNull } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatRate } from "@/lib/format";
import { listClientOptions } from "@/lib/server/clients";
import { listCatalogOptions } from "@/lib/server/documents";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier la facture" };

export default async function EditInvoicePage({ params }: PageProps<"/factures/[id]/modifier">) {
  const { id } = await params;
  const ctx = await getAppContext();
  const invoice = await db.invoice.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      lines: { orderBy: { position: "asc" } },
      quote: { select: { number: true } },
      deductedDeposits: {
        where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
        orderBy: { issueDate: "asc" },
        select: { number: true, netCents: true, creditedCents: true },
      },
    },
  });
  if (!invoice) notFound();
  // Une facture émise est verrouillée : seul un brouillon se modifie.
  if (invoice.status !== "DRAFT") redirect(`/factures/${id}`);

  const [clients, catalog] = await Promise.all([
    listClientOptions(ctx.organizationId, invoice.clientId),
    listCatalogOptions(ctx.organizationId),
  ]);

  const notice =
    invoice.type === "DEPOSIT"
      ? `Facture d'acompte${invoice.depositRateBp ? ` de ${formatRate(invoice.depositRateBp)}` : ""} sur le devis ${invoice.quote?.number ?? ""}.`
      : invoice.type === "BALANCE"
        ? `Facture de solde du devis ${invoice.quote?.number ?? ""} : les acomptes déjà émis sont déduits automatiquement.`
        : invoice.quote
          ? `Facture issue du devis ${invoice.quote.number}.`
          : undefined;

  return (
    <PageContainer>
      <PageHeader
        title="Modifier le brouillon"
        back={{ href: `/factures/${id}`, label: "Facture en brouillon" }}
      />
      <InvoiceForm
        invoiceId={id}
        clients={clients}
        catalog={catalog}
        defaultPaymentTermDays={ctx.settings.paymentTermDays}
        vatMention={ctx.settings.vatMention}
        notice={notice}
        deposits={invoice.deductedDeposits.map((deposit) => ({
          label: `Acompte ${deposit.number}`,
          amountCents: deposit.netCents - deposit.creditedCents,
        }))}
        defaultValues={{
          clientId: invoice.clientId,
          title: invoice.title,
          issueDate: toISO(invoice.issueDate),
          paymentTermDays: invoice.paymentTermDays,
          dueDate: toISO(invoice.dueDate),
          serviceStart: toISOOrNull(invoice.serviceStart),
          serviceEnd: toISOOrNull(invoice.serviceEnd),
          lines: invoice.lines.map((line) => ({
            serviceId: line.serviceId,
            categoryId: line.categoryId,
            label: line.label,
            description: line.description,
            quantityMilli: line.quantityMilli,
            unit: line.unit,
            unitPriceCents: line.unitPriceCents,
          })),
          discountType: invoice.discountType,
          discountValue: invoice.discountValue,
          notes: invoice.notes,
          terms: invoice.terms,
        }}
      />
    </PageContainer>
  );
}
