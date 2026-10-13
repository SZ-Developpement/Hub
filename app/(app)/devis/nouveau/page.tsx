import type { Metadata } from "next";

import { QuoteForm } from "@/components/quotes/quote-form";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { addDays, toISO, today } from "@/lib/dates";
import { param } from "@/lib/list-params";
import { listClientOptions } from "@/lib/server/clients";
import { listCatalogOptions } from "@/lib/server/documents";
import { getAppContext } from "@/lib/session";
import { EMPTY_LINE } from "@/lib/validation/documents";

export const metadata: Metadata = { title: "Nouveau devis" };

export default async function NewQuotePage({ searchParams }: PageProps<"/devis/nouveau">) {
  const ctx = await getAppContext();
  const [clients, catalog, query] = await Promise.all([
    listClientOptions(ctx.organizationId),
    listCatalogOptions(ctx.organizationId),
    searchParams,
  ]);
  const requestedClient = param(query, "client");
  const todayDate = today();
  const { settings } = ctx;

  return (
    <PageContainer>
      <PageHeader title="Nouveau devis" back={{ href: "/devis", label: "Devis" }} />
      <QuoteForm
        clients={clients}
        catalog={catalog}
        defaultPaymentTermDays={settings.paymentTermDays}
        vatMention={settings.vatMention}
        defaultValues={{
          clientId: clients.some((client) => client.id === requestedClient) ? (requestedClient ?? "") : "",
          title: "",
          issueDate: toISO(todayDate),
          validUntil: toISO(addDays(todayDate, settings.quoteValidityDays)),
          lines: [{ ...EMPTY_LINE }],
          discountType: "NONE",
          discountValue: 0,
          depositRateBp: settings.quoteDefaultDepositRateBp,
          notes: settings.quoteDefaultNotes,
          terms: settings.quoteDefaultTerms,
        }}
      />
    </PageContainer>
  );
}
