"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClientFormDialog } from "./client-form-dialog";
import ClientMiniCard, { ClientMiniCardProps } from "./client-mini-card";

export function ClientList({ clients }: { clients: ClientMiniCardProps[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos clients et suivez leurs projets.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau client
        </Button>
      </div>

      <ClientFormDialog open={open} onOpenChange={setOpen} />

      <div className="grid grid-cols-4 gap-4">
        {clients.length === 0 && (
          <p className="text-center h-20 flex items-center justify-center text-muted-foreground text-sm col-span-full">
            Aucun client pour le moment.
          </p>
        )}

        {clients.map((client) => (
          <ClientMiniCard key={client.id} client={client} />
        ))}
      </div>
    </div>
  );
}
