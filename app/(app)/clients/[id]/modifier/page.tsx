import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier le client" };

export default async function EditClientPage({ params }: PageProps<"/clients/[id]/modifier">) {
  const { id } = await params;
  const ctx = await getAppContext();
  const client = await db.client.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!client) notFound();

  return (
    <PageContainer size="narrow">
      <PageHeader
        title={`Modifier ${client.name}`}
        back={{ href: `/clients/${client.id}`, label: client.name }}
      />
      <ClientForm
        clientId={client.id}
        defaultPaymentTermDays={ctx.settings.paymentTermDays}
        defaultValues={{
          type: client.type,
          name: client.name,
          siret: client.siret,
          vatNumber: client.vatNumber,
          contactName: client.contactName,
          contactRole: client.contactRole,
          email: client.email,
          phone: client.phone,
          addressLine1: client.addressLine1,
          addressLine2: client.addressLine2,
          postalCode: client.postalCode,
          city: client.city,
          country: client.country,
          paymentTermDays: client.paymentTermDays,
          notes: client.notes,
        }}
      />
    </PageContainer>
  );
}
