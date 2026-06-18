"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { ProjectFormDialog } from "./project-form-dialog";
import { getClientsForSelect } from "@/server/actions/projects";
import { ProjectStatus } from "@/generated/prisma/client";
import { DeleteProjectDialog } from "./delete-project-dialog";

type ClientOption = { id: string; name: string };

type ProjectDetailActionsProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    clientId: string | null;
    startDate: Date | null;
    endDate: Date | null;
  };
};

export function ProjectDetailActions({ project }: ProjectDetailActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  async function handleOpenEdit() {
    setLoadingClients(true);
    const data = await getClientsForSelect();
    setClients(data);
    setLoadingClients(false);
    setEditOpen(true);
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenEdit}
        disabled={loadingClients}
      >
        <Pencil className="h-4 w-4 mr-1" />
        {loadingClients ? "Chargement..." : "Modifier"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Supprimer
      </Button>

      {editOpen && (
        <ProjectFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          project={project}
          clients={clients}
        />
      )}
      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  );
}
