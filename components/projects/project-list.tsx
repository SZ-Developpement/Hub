// components/projects/project-list.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectStatusBadge } from "./project-status-badge";
import { ProjectStatus } from "@/generated/prisma/client";
import { ProjectFormDialog } from "./project-form-dialog";

type ProjectListItem = {
  id: string;
  slug: string;
  name: string;
  status: ProjectStatus;
  client: { name: string } | null;
};

type ClientOption = { id: string; name: string };

export function ProjectList({
  projects,
  clients,
}: {
  projects: ProjectListItem[];
  clients: ClientOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)} className="mb-4 gap-2">
        <Plus className="h-4 w-4" />
        Nouveau projet
      </Button>

      <ProjectFormDialog open={open} onOpenChange={setOpen} clients={clients} />

      <div className="grid gap-2">
        {projects.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucun projet pour le moment.
          </p>
        )}

        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.slug}`}
            className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted transition-colors"
          >
            <div>
              <p className="font-medium">{project.name}</p>
              {project.client && (
                <p className="text-sm text-muted-foreground">
                  {project.client.name}
                </p>
              )}
            </div>
            <ProjectStatusBadge status={project.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
