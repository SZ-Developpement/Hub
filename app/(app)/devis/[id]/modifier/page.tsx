import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { QuoteForm } from "@/components/quotes/quote-form";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { toISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { listClientOptions } from "@/lib/server/clients";
import { listCatalogOptions } from "@/lib/server/documents";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier le devis" };

export default async function EditQuotePage({ params }: PageProps<"/devis/[id]/modifier">) {
  const { id } = await params;
  const ctx = await getAppContext();
  const quote = await db.quote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!quote) notFound();
  // Seul un brouillon se modifie.
  if (quote.status !== "DRAFT") redirect(`/devis/${id}`);

  const [clients, catalog] = await Promise.all([
    listClientOptions(ctx.organizationId, quote.clientId),
    listCatalogOptions(ctx.organizationId),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title={`Modifier ${quote.number}`}
        back={{ href: `/devis/${id}`, label: quote.number }}
      />
      <QuoteForm
        quoteId={id}
        number={quote.number}
        clients={clients}
        catalog={catalog}
        defaultPaymentTermDays={ctx.settings.paymentTermDays}
        vatMention={ctx.settings.vatMention}
        defaultValues={{
          clientId: quote.clientId,
          title: quote.title,
          issueDate: toISO(quote.issueDate),
          validUntil: toISO(quote.validUntil),
          lines: quote.lines.map((line) => ({
            serviceId: line.serviceId,
            categoryId: line.categoryId,
            label: line.label,
            description: line.description,
            quantityMilli: line.quantityMilli,
            unit: line.unit,
            unitPriceCents: line.unitPriceCents,
          })),
          discountType: quote.discountType,
          discountValue: quote.discountValue,
          depositRateBp: quote.depositRateBp,
          notes: quote.notes,
          terms: quote.terms,
        }}
      />
    </PageContainer>
  );
}
