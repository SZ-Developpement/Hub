"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClientFormDialog } from "./client-form-dialog";

type ClientListItem = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  slug: string;
  _count: { projects: number };
};

export function ClientList({ clients }: { clients: ClientListItem[] }) {
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
          <Link
            key={client.id}
            href={`/dashboard/clients/${client.slug}`}
            className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted transition-colors"
          >
            <div>
              <p className="font-medium">{client.name}</p>
              {client.company && (
                <p className="text-sm text-muted-foreground">
                  {client.company}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {client._count.projects} projet(s)
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
