import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/auth/session";
import { getProjectBySlug } from "@/server/actions/projects";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectDetailActions } from "@/components/projects/project-detail-actions";
import { CalendarDays, ExternalLink } from "lucide-react";
import { DataCard, InfosCard } from "@/components/card/infosCard";
import { InternesCard } from "@/components/card/InternesCard";
import LivrablesCard from "@/components/projects/components/LivrablesCard";
import TeamCard from "@/components/projects/components/TeamCard";
import { LetterAvatar } from "@/components/ui/LetterAvatar";
import { Milestone, Timeline } from "@/components/projects/components/Timeline";

// Fake
const fakestep: Milestone[] = [
  { label: "Étape 1", date: "2023-01-01", status: "done" },
  { label: "Étape 2", date: "2023-02-01", status: "active" },
  { label: "Étape 3", date: "2023-03-01", status: "todo" },
];

const team: { name: string; role: string }[] = [
  { name: "Alexis De Jesus", role: "FOUNDER" },
  { name: "Thomas Bernard", role: "MEMBER" },
];

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, membership] = await Promise.all([
    getProjectBySlug(slug),
    getCurrentMembership(),
  ]);

  const canEdit = membership.role === "FOUNDER" || membership.role === "ADMIN";

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header Project */}
      <div className="flex flex-row items-start justify-between">
        {/* Information Project */}
        <div className="flex flex-col gap-2 items-start">
          {/* Project Title and Status */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} />
          </div>

          {/* Client Name */}
          {project.client && (
            <Link
              href={`/dashboard/clients/${project.client.slug}`}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              Client : {project.client.firstName} {project.client.lastName}
              <ExternalLink size={12} />
            </Link>
          )}

          {/* Project Dates */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {project.startDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} />
                Début :{" "}
                {project.startDate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
            {project.endDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} />
                Échéance :{" "}
                {project.endDate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Actions Project */}
        {canEdit && <ProjectDetailActions project={project} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-5">
        {/* Partie Gauche */}
        <div className="flex flex-col gap-5">
          {project.description && (
            <InfosCard title="Description">
              <p className=" text-sm">{project.description}</p>
            </InfosCard>
          )}

          {/* Jalons / Étapes */}
          <InfosCard title="Jalons / Étapes">
            <Timeline data={fakestep} />
          </InfosCard>

          {/* Notes internes */}
          {project.notes && <InternesCard text={project.notes} />}

          {/* Livrables */}
          <LivrablesCard />
        </div>

        {/* Partie Droite */}
        <div className="flex flex-col gap-5">
          {/* Équipe */}
          <InfosCard title="Équipe assignée" className="flex flex-col gap-3">
            {/* {project.teamMembers.map((member) => ( */}
            {team.map((member, index) => (
              <TeamCard
                key={member.name + index}
                name={member.name}
                role={member.role}
              />
            ))}
          </InfosCard>

          {/* Client */}
          {project.client && (
            <InfosCard title="Client">
              <div className="flex items-center gap-3 mb-2">
                <LetterAvatar
                  name={`${project.client.firstName} ${project.client.lastName}`}
                  size="md"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {project.client.firstName} {project.client.lastName}
                  </p>
                  {
                    <p className="text-xs text-muted-foreground">
                      {project.client.company || "Aucune société"}
                    </p>
                  }
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {project.client.email}
              </p>
              <Link
                href={`/dashboard/clients/${project.client.slug}`}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
              >
                Voir la fiche client
                <ExternalLink size={11} />
              </Link>
            </InfosCard>
          )}

          {/* Metadonnées */}
          <InfosCard title="Métadonnées" className="flex flex-col gap-3">
            <DataCard
              title="Créé le"
              value={
                project.createdAt.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }) || "Date non disponible"
              }
            />

            <DataCard
              title="Modifié le"
              value={
                project.updatedAt.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }) || "Date non disponible"
              }
            />

            <DataCard
              title="Slug"
              code={project.slug || "Slug non disponible"}
            />
          </InfosCard>
        </div>
      </div>
    </div>
  );
}
