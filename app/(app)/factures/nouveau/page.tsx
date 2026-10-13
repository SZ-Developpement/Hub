import type { Metadata } from "next";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { addDays, toISO, today } from "@/lib/dates";
import { param } from "@/lib/list-params";
import { listClientOptions } from "@/lib/server/clients";
import { listCatalogOptions } from "@/lib/server/documents";
import { getAppContext } from "@/lib/session";
import { EMPTY_LINE } from "@/lib/validation/documents";

export const metadata: Metadata = { title: "Nouvelle facture" };

export default async function NewInvoicePage({ searchParams }: PageProps<"/factures/nouveau">) {
  const ctx = await getAppContext();
  const [clients, catalog, query] = await Promise.all([
    listClientOptions(ctx.organizationId),
    listCatalogOptions(ctx.organizationId),
    searchParams,
  ]);
  const { settings } = ctx;
  const client = clients.find((item) => item.id === param(query, "client"));
  const paymentTermDays = client?.paymentTermDays ?? settings.paymentTermDays;
  const todayDate = today();

  return (
    <PageContainer>
      <PageHeader
        title="Nouvelle facture"
        description="Pour facturer un devis accepté, passez plutôt par la fiche du devis."
        back={{ href: "/factures", label: "Factures" }}
      />
      <InvoiceForm
        clients={clients}
        catalog={catalog}
        defaultPaymentTermDays={settings.paymentTermDays}
        vatMention={settings.vatMention}
        defaultValues={{
          clientId: client?.id ?? "",
          title: "",
          issueDate: toISO(todayDate),
          paymentTermDays,
          dueDate: toISO(addDays(todayDate, paymentTermDays)),
          serviceStart: null,
          serviceEnd: null,
          lines: [{ ...EMPTY_LINE }],
          discountType: "NONE",
          discountValue: 0,
          notes: settings.invoiceDefaultNotes,
          terms: settings.invoiceDefaultTerms,
        }}
      />
    </PageContainer>
  );
}
