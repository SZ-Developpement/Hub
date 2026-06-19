"use client";

import { useState, useMemo } from "react";
import { ChevronRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectStatus } from "@/generated/prisma/client";
import { LetterAvatar } from "@/components/ui/LetterAvatar";

type ClientProject = {
  id: string;
  slug: string;
  name: string;
  status: ProjectStatus;
  endDate: Date | null;
};

type TabKey = "all" | "active" | "completed";

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "active", label: "En cours" },
  { key: "completed", label: "Terminés" },
];

function isActive(status: ProjectStatus) {
  return (
    status === "PLANNING" || status === "IN_PROGRESS" || status === "ON_HOLD"
  );
}

// Fake
const assignee = "Alexis De Jesus";

export function ClientProjectsCard({
  projects,
}: {
  projects: ClientProject[];
}) {
  const [tab, setTab] = useState<TabKey>("all");

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter((p) => isActive(p.status)).length,
      completed: projects.filter((p) => p.status === "COMPLETED").length,
    }),
    [projects],
  );

  const visible = useMemo(() => {
    if (tab === "active") return projects.filter((p) => isActive(p.status));
    if (tab === "completed")
      return projects.filter((p) => p.status === "COMPLETED");
    return projects;
  }, [projects, tab]);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Projets</h3>
          <span className="text-xs text-muted-foreground">
            ({projects.length})
          </span>
        </div>

        <div className="flex border-b border-border px-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-0.5 py-3 text-sm border-b-2 mr-6 transition-colors ${
                tab === t.key
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.key
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col divide-y divide-border">
          {visible.map((proj) => (
            <Link
              key={proj.id}
              href={`/dashboard/projects/${proj.slug}`}
              className="w-full flex items-center flex-1 min-w-0 justify-between gap-3 px-5 py-4 hover:bg-accent transition-colors group "
            >
              {/* Infos Projet */}
              <div className="flex flex-col items-start gap-2">
                {/* Infos Projet and Status */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {proj.name}
                  </span>
                  <ProjectStatusBadge status={proj.status} />
                </div>

                {/* Other Info */}
                <div className="flex items-center gap-4">
                  {/* Assignee */}
                  {assignee && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <LetterAvatar name={assignee} size="xs" />
                      {assignee}
                    </span>
                  )}

                  {/* End Date */}
                  {proj.endDate && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={11} />
                        {proj.endDate.toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight
                size={14}
                className="text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors shrink-0"
              />
            </Link>
          ))}

          {visible.length === 0 && (
            <div className="h-20 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Aucun projet dans cette catégorie.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
