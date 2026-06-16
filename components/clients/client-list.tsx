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
    <div>
      <Button onClick={() => setOpen(true)} className="mb-4 gap-2">
        <Plus className="h-4 w-4" />
        Nouveau client
      </Button>

      <ClientFormDialog open={open} onOpenChange={setOpen} />

      <div className="grid gap-2">
        {clients.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucun client pour le moment.
          </p>
        )}

        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.slug}`}
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
