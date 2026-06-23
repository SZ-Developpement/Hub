import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default async function NewInvoicePage() {
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  const [clients, projects, organization] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: membership.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: membership.organizationId },
      select: { id: true, name: true, clientId: true },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { vatApplicable: true, vatRate: true, paymentDelay: true },
    }),
  ]);

  return (
    <div className="w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Nouveau document</h1>
        <p className="text-sm text-muted-foreground">
          Créez un devis ou une facture pour un client.
        </p>
      </div>
      <InvoiceForm
        clients={clients}
        projects={projects}
        vatApplicable={organization?.vatApplicable ?? false}
        vatRate={organization?.vatRate ?? null}
        paymentDelay={organization?.paymentDelay ?? 30}
      />
    </div>
  );
}
