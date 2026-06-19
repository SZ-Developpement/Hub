import { notFound } from "next/navigation";
import { getClientBySlug } from "@/server/actions/clients";
import { ClientDetailActions } from "@/components/clients/client-detail-actions";
import { LetterAvatar } from "@/components/ui/LetterAvatar";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { formatPhoneNumber } from "@/lib/utils/format-phone";
import { DataCard, InfosCard, KV } from "@/components/card/infosCard";
import { InternesCard } from "@/components/card/InternesCard";
import HistoriqueCard from "@/components/clients/components/historique";
import { ClientProjectsCard } from "@/components/clients/components/TabsProjects";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);

  if (!client) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header Client */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <LetterAvatar
            name={`${client.firstName} ${client.lastName}`}
            size="2xl"
          />
          <div className="flex flex-col gap-1">
            {/* Name and Status */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {client.firstName} {client.lastName}
              </h1>
              <ClientStatusBadge status={client.status} />
            </div>

            {/* Company */}
            <p className="text-sm text-muted-foreground">
              {client.company || "Aucune société"}
            </p>

            {/* Contact Information */}
            <div className="flex items-center gap-4">
              {/* Email */}
              {client.email && (
                <Link
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <Mail size={13} />
                  {client.email}
                </Link>
              )}

              {/* Téléphone */}
              {client.phone && (
                <Link
                  href={`tel:${client.phone}`}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <Phone size={13} />
                  {formatPhoneNumber(client.phone)}
                </Link>
              )}
            </div>
          </div>
        </div>

        <ClientDetailActions client={client} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-5">
        {/* Partie Gauche */}
        <div className="flex flex-col gap-5">
          <ClientProjectsCard projects={client.projects} />

          <HistoriqueCard />
        </div>

        {/* Partie Droite */}
        <div className="flex flex-col gap-5">
          <InfosCard title="Coordonnées" className="flex flex-col gap-0">
            <KV label="Prénom" value={client.firstName} />
            <KV label="Nom" value={client.lastName} />
            <KV label="Entreprise" value={client.company || "Aucune société"} />
            {client.email && (
              <KV
                label="Email"
                value={client.email}
                href={`mailto:${client.email}`}
              />
            )}
            {client.phone && (
              <KV
                label="Téléphone"
                value={formatPhoneNumber(client.phone)}
                href={`tel:${client.phone}`}
              />
            )}
          </InfosCard>

          {client.notes && <InternesCard text={client.notes} />}

          {/* Metadonnées */}
          <InfosCard title="Métadonnées" className="flex flex-col gap-3">
            <DataCard
              title="Créé le"
              value={
                client.createdAt.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }) || "Date non disponible"
              }
            />

            <DataCard
              title="Modifié le"
              value={
                client.updatedAt.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }) || "Date non disponible"
              }
            />

            <DataCard
              title="Slug"
              code={client.slug || "Slug non disponible"}
            />
          </InfosCard>
        </div>
      </div>
    </div>
  );
}
