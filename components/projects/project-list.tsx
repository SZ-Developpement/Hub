"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectFormDialog } from "./project-form-dialog";
import ProjectMiniCard, { ProjectMiniCardProps } from "./project-mini-card";

type ClientOption = { id: string; name: string };

export function ProjectList({
  projects,
  clients,
}: {
  projects: ProjectMiniCardProps[];
  clients: ClientOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold">Projets</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos projets et suivez leur progression.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau projet
        </Button>
      </div>

      <ProjectFormDialog open={open} onOpenChange={setOpen} clients={clients} />

      <div className="grid grid-cols-4 gap-4">
        {projects.length === 0 && (
          <p className="text-center h-20 flex items-center justify-center text-muted-foreground text-sm col-span-full">
            Aucun projet pour le moment.
          </p>
        )}

        {projects.map((project) => (
          <ProjectMiniCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
