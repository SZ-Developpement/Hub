import type { Metadata } from "next";

import { ClientForm } from "@/components/clients/client-form";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { getAppContext } from "@/lib/session";
import { EMPTY_CLIENT } from "@/lib/validation/clients";

export const metadata: Metadata = { title: "Nouveau client" };

export default async function NewClientPage() {
  const { settings } = await getAppContext();

  return (
    <PageContainer size="narrow">
      <PageHeader title="Nouveau client" back={{ href: "/clients", label: "Clients" }} />
      <ClientForm defaultValues={EMPTY_CLIENT} defaultPaymentTermDays={settings.paymentTermDays} />
    </PageContainer>
  );
}
