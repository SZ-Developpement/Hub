import {
  Users,
  BriefcaseBusiness,
  CheckCheck,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "./components/StatsCard";
import { CardDash } from "./components/CardDash";
import { LetterAvatar } from "../ui/LetterAvatar";
import { ProjectStatusBadge } from "../projects/project-status-badge";
import type { DashboardStats } from "@/server/actions/dashboard";

function formatChange(change: number | null): string {
  if (change === null) return "0%";
  return `${change > 0 ? "+" : ""}${change}%`;
}

export default function Overview({ stats }: { stats: DashboardStats }) {
  const statCards = [
    {
      title: "Total clients",
      value: stats.totalClients.toString(),
      icon: Users,
      text: "au total",
    },
    {
      title: "Nouveaux clients",
      value: `+${stats.newClientsThisMonth}`,
      icon: Users,
      pourcentage: formatChange(stats.newClientsChange),
      text: "vs mois dernier",
    },
    {
      title: "Projets en cours",
      value: stats.inProgressCount.toString(),
      icon: BriefcaseBusiness,
      pourcentage: formatChange(stats.inProgressChange),
      text: "vs mois dernier",
    },
    {
      title: "Projets terminés",
      value: stats.completedCount.toString(),
      icon: CheckCheck,
      pourcentage: formatChange(stats.completedChange),
      text: "vs mois dernier",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            pourcentage={stat.pourcentage ?? undefined}
            text={stat.text}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-5">
        <CardDash
          title="Aperçu des données"
          description="Voici un aperçu des données importantes pour votre entreprise."
          className="flex flex-col h-full justify-center items-center gap-1"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Graphique de données
          </p>
          <p className="text-xs text-muted-foreground">Disponible en Phase 2</p>
        </CardDash>

        <CardDash
          title="Derniers clients ajoutés"
          description={`${stats.recentClients.length} client(s) récent(s)`}
          className="flex flex-col gap-4"
        >
          {stats.recentClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun client pour le moment.
            </p>
          ) : (
            stats.recentClients.map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.slug}`}
                className="flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-4">
                  <LetterAvatar
                    initials={client.name.substring(0, 2)}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {client.name}
                    </p>
                    {client.company && (
                      <p className="text-xs text-muted-foreground truncate">
                        {client.company}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardDash>
      </div>

      <CardDash
        title="Projets en cours"
        description={`${stats.activeProjects.length} projet(s) actif(s)`}
        className="flex flex-col gap-2 px-4"
      >
        {stats.activeProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucun projet en cours.
          </p>
        ) : (
          stats.activeProjects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.slug}`}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
            >
              <div className="flex flex-row items-center gap-4 flex-1 min-w-0">
                <div className="flex flex-col gap-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-foreground truncate">
                      {project.name}
                    </p>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  {project.client && (
                    <p className="text-xs text-muted-foreground">
                      {project.client.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {project.endDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays size={11} />
                    {project.endDate.toLocaleDateString("fr-FR")}
                  </span>
                )}
                <ChevronRight
                  size={14}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </div>
            </Link>
          ))
        )}
      </CardDash>
    </div>
  );
}
