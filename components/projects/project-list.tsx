"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ChevronDown, FolderKanban, Funnel, Plus, Search } from "lucide-react";
import { ProjectFormDialog } from "./project-form-dialog";
import ProjectMiniCard, { ProjectMiniCardProps } from "./project-mini-card";

type ClientOption = { id: string; name: string };
type SortOption = "name" | "status" | "createdAt";

const sortLabels: Record<SortOption, string> = {
  name: "Nom du projet",
  status: "Statut",
  createdAt: "Date de création",
};

const statusOrder: Record<string, number> = {
  PLANNING: 0,
  IN_PROGRESS: 1,
  ON_HOLD: 2,
  COMPLETED: 3,
  CANCELLED: 4,
};

export function ProjectList({
  projects,
  clients,
}: {
  projects: ProjectMiniCardProps[];
  clients: ClientOption[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const filteredAndSorted = useMemo(() => {
    const filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(search.toLowerCase()),
    );

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          return statusOrder[a.status] - statusOrder[b.status];
        case "createdAt":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return 0;
      }
    });
  }, [projects, search, sortBy]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <FolderKanban />
            <h1 className="text-2xl font-bold">Projets</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gérez vos projets et suivez leur progression.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau projet
        </Button>
      </div>

      {/* Barre de recherche et menu de tri */}
      <div className="flex flex-row items-center gap-2">
        {/* Barre de recherche */}
        <InputGroup>
          <InputGroupInput
            placeholder="Chercher un projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>

        {/* Menu de tri */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Funnel />
              {sortLabels[sortBy]}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuGroup>
              {Object.entries(sortLabels).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setSortBy(value as SortOption)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog de formulaire */}
      <ProjectFormDialog open={open} onOpenChange={setOpen} clients={clients} />

      <div className="grid grid-cols-4 gap-4">
        {filteredAndSorted.length === 0 && (
          <p className="text-center h-20 flex items-center justify-center text-muted-foreground text-sm col-span-full">
            {search
              ? "Aucun projet ne correspond à votre recherche."
              : "Aucun projet pour le moment."}
          </p>
        )}

        {filteredAndSorted.map((project) => (
          <ProjectMiniCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
