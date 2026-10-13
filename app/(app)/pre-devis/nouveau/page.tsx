import type { Metadata } from "next";

import { PreQuoteForm } from "@/components/pre-quotes/pre-quote-form";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { todayISO } from "@/lib/dates";
import { param } from "@/lib/list-params";
import { listClientOptions } from "@/lib/server/clients";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Nouveau pré-devis" };

export default async function NewPreQuotePage({ searchParams }: PageProps<"/pre-devis/nouveau">) {
  const ctx = await getAppContext();
  const clients = await listClientOptions(ctx.organizationId);
  const requestedClient = param(await searchParams, "client");

  return (
    <PageContainer size="narrow">
      <PageHeader title="Nouveau pré-devis" back={{ href: "/pre-devis", label: "Pré-devis" }} />
      <PreQuoteForm
        clients={clients}
        defaultPaymentTermDays={ctx.settings.paymentTermDays}
        defaultValues={{
          clientId: clients.some((client) => client.id === requestedClient) ? (requestedClient ?? "") : "",
          title: "",
          issueDate: todayISO(),
          need: "",
          items: [{ label: "", description: "", daysMilli: 0 }],
          dailyRateCents: null,
          priceMinCents: 0,
          priceMaxCents: 0,
          notes: "",
        }}
      />
    </PageContainer>
  );
}
