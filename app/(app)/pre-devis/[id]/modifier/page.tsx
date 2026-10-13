import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PreQuoteForm } from "@/components/pre-quotes/pre-quote-form";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { toISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { listClientOptions } from "@/lib/server/clients";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier le pré-devis" };

export default async function EditPreQuotePage({ params }: PageProps<"/pre-devis/[id]/modifier">) {
  const { id } = await params;
  const ctx = await getAppContext();
  const preQuote = await db.preQuote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!preQuote) notFound();
  // Seul un brouillon se modifie.
  if (preQuote.status !== "DRAFT") redirect(`/pre-devis/${id}`);

  const clients = await listClientOptions(ctx.organizationId, preQuote.clientId);

  return (
    <PageContainer size="narrow">
      <PageHeader
        title={`Modifier ${preQuote.number}`}
        back={{ href: `/pre-devis/${id}`, label: preQuote.number }}
      />
      <PreQuoteForm
        preQuoteId={id}
        clients={clients}
        defaultPaymentTermDays={ctx.settings.paymentTermDays}
        defaultValues={{
          clientId: preQuote.clientId,
          title: preQuote.title,
          issueDate: toISO(preQuote.issueDate),
          need: preQuote.need,
          items: preQuote.items.map((item) => ({
            label: item.label,
            description: item.description,
            daysMilli: item.daysMilli,
          })),
          dailyRateCents: preQuote.dailyRateCents,
          priceMinCents: preQuote.priceMinCents,
          priceMaxCents: preQuote.priceMaxCents,
          notes: preQuote.notes,
        }}
      />
    </PageContainer>
  );
}
