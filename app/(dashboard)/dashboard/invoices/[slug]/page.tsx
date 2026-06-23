import { notFound } from "next/navigation";
import Link from "next/link";
import { getInvoiceBySlug } from "@/server/actions/invoices";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceDetailActions } from "@/components/invoices/invoice-detail-actions";
import { getReadableType } from "@/lib/utils/type-invoice";
import StepsInvoice from "@/components/invoices/invoice-steps";
import InvoiceDate from "@/components/invoices/invoice-date";
import { DataCard, InfosCard } from "@/components/card/infosCard";
import { LetterAvatar } from "@/components/ui/LetterAvatar";
import { Copy, Download, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { InternesCard } from "@/components/card/InternesCard";
import InvoicePrestations from "@/components/invoices/invoice-prestations";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const invoice = await getInvoiceBySlug(slug);

  if (!invoice) notFound();

  return (
    <div className="flex flex-col gap-8">
      {/* Header Project */}
      <div className="flex flex-row items-start justify-between">
        {/* Information Project */}
        <div className="flex flex-col gap-2 items-start">
          {/* Project Title and Status */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {invoice.number}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
            <p className="text-sm font-medium text-muted-foreground">
              {getReadableType(invoice.type)}
            </p>
          </div>

          {/* Client Name */}
          {invoice.client && (
            <p className="flex items-center gap-1.5 text-sm ">
              Client :{" "}
              <Link
                className="hover:underline font-bold"
                href={`/dashboard/clients/${invoice.client.slug}`}
              >
                {invoice.client.firstName} {invoice.client.lastName}
              </Link>
            </p>
          )}
        </div>
        {/* Actions */}
        <InvoiceDetailActions invoice={invoice} />
      </div>

      <StepsInvoice statut={invoice.status} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-5">
        {/* Partie Gauche */}
        <div className="flex flex-col gap-5">
          <InvoiceDate
            dateEmission={invoice.issuedAt.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            dateEchéance={invoice.dueAt?.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            projetAssocié={invoice.project?.name || "Non spécifié"}
          />

          <InvoicePrestations invoice={invoice} />

          {/* Notes internes */}
          {invoice.notes && <InternesCard text={invoice.notes} />}
        </div>

        {/* Partie Droite */}
        <div className="flex flex-col gap-5">
          {/* Informations sur le client */}
          {invoice.client && (
            <InfosCard title="Client">
              <div className="flex items-center gap-3 mb-2">
                <LetterAvatar
                  name={`${invoice.client.firstName} ${invoice.client.lastName}`}
                  size="md"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {invoice.client.firstName} {invoice.client.lastName}
                  </p>
                  {
                    <p className="text-xs text-muted-foreground">
                      {invoice.client.company || "Aucune société"}
                    </p>
                  }
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {invoice.client.email}
              </p>
              <Link
                href={`/dashboard/clients/${invoice.client.slug}`}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
              >
                Voir la fiche client
                <ExternalLink size={11} />
              </Link>
            </InfosCard>
          )}

          {/* Montant total TTC */}
          <Card className="flex flex-col items-center justify-center gap-2 px-5 py-5 text-center">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Montant total TTC
            </p>
            <p className="text-3xl font-bold text-foreground">
              {invoice.totalTTC.toLocaleString("fr-FR")} €
            </p>
            <InvoiceStatusBadge status={invoice.status} />
          </Card>

          {/* Actions */}
          <InfosCard title="Actions" className="px-4 flex flex-col gap-2">
            <div className="w-full flex flex-row items-center justify-start gap-1.5 text-sm text-medium hover:bg-muted/70 transition-colors rounded-md px-4 py-2 cursor-pointer">
              <Copy size={14} />
              Dupliquer
            </div>

            <div className="w-full flex flex-row items-center justify-start gap-1.5 text-sm text-medium hover:bg-muted/70 transition-colors rounded-md px-4 py-2 cursor-pointer">
              <Download size={14} />
              Exporter en PDF
            </div>
          </InfosCard>

          {/* Metadonnées */}
          <InfosCard title="Métadonnées" className="flex flex-col gap-3">
            <DataCard
              title="Numéro"
              code={invoice.slug || "Slug non disponible"}
            />

            <DataCard
              title="Type"
              value={getReadableType(invoice.type) || "Type non spécifié"}
            />

            {invoice.dueAt && (
              <DataCard
                title="Émis le"
                value={
                  invoice.dueAt.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }) || "Date non disponible"
                }
              />
            )}

            {invoice.issuedAt && (
              <DataCard
                title="Échéance le"
                value={
                  invoice.issuedAt.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }) || "Date non disponible"
                }
              />
            )}
          </InfosCard>
        </div>
      </div>
    </div>
  );
}
