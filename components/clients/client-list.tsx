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
import { ChevronDown, Funnel, Plus, Search, UsersRound } from "lucide-react";
import { ClientFormDialog } from "./client-form-dialog";
import ClientMiniCard, { ClientMiniCardProps } from "./client-mini-card";

type SortOption = "name" | "projectCount" | "createdAt";

const sortLabels: Record<SortOption, string> = {
  name: "Nom du client",
  projectCount: "Nombre de projets",
  createdAt: "Date de création",
};

export function ClientList({ clients }: { clients: ClientMiniCardProps[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const filteredAndSorted = useMemo(() => {
    const filtered = clients.filter((client) =>
      client.name.toLowerCase().includes(search.toLowerCase()),
    );

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "projectCount":
          return b._count.projects - a._count.projects;
        case "createdAt":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return 0;
      }
    });
  }, [clients, search, sortBy]);

  return (
    <div className="flex flex-col gap-4">
      {/* Titre de la section */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <UsersRound />
            <h1 className="text-2xl font-bold">Clients</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gérez vos clients et suivez leurs projets.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau client
        </Button>
      </div>

      {/* Barre de recherche et menu de tri */}
      <div className="flex flex-row items-center gap-2">
        {/* Barre de recherche */}
        <InputGroup>
          <InputGroupInput
            placeholder="Chercher un client..."
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
      <ClientFormDialog open={open} onOpenChange={setOpen} />

      <div className="grid grid-cols-4 gap-4">
        {filteredAndSorted.length === 0 && (
          <p className="text-center h-20 flex items-center justify-center text-muted-foreground text-sm col-span-full">
            {search
              ? "Aucun client ne correspond à votre recherche."
              : "Aucun client pour le moment."}
          </p>
        )}

        {filteredAndSorted.map((client) => (
          <ClientMiniCard key={client.id} client={client} />
        ))}
      </div>
    </div>
  );
}
