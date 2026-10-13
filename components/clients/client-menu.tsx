"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  EllipsisIcon,
  FilePlusIcon,
  LightbulbIcon,
  PencilIcon,
  ReceiptTextIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { archiveClient, deleteClient, restoreClient } from "@/app/(app)/clients/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAction } from "@/hooks/use-action";

export function ClientMenu({
  client,
  redirectAfterDelete = false,
}: {
  client: { id: string; name: string; archived: boolean; hasDocuments: boolean };
  /** Sur la fiche client : revenir à la liste après suppression. */
  redirectAfterDelete?: boolean;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions pour ${client.name}`} disabled={pending}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href={`/clients/${client.id}/modifier`}>
                <PencilIcon />
                Modifier
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {!client.archived ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href={`/pre-devis/nouveau?client=${client.id}`}>
                    <LightbulbIcon />
                    Nouveau pré-devis
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/devis/nouveau?client=${client.id}`}>
                    <FilePlusIcon />
                    Nouveau devis
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/factures/nouveau?client=${client.id}`}>
                    <ReceiptTextIcon />
                    Nouvelle facture
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {client.archived ? (
              <DropdownMenuItem
                onSelect={() => run(() => restoreClient({ id: client.id }), { success: "Client restauré" })}
              >
                <ArchiveRestoreIcon />
                Restaurer
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() => run(() => archiveClient({ id: client.id }), { success: "Client archivé" })}
              >
                <ArchiveIcon />
                Archiver
              </DropdownMenuItem>
            )}
            {!client.hasDocuments ? (
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer ${client.name} ?`}
        description="Ce client n'a aucun document. La suppression est définitive."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() =>
          run(() => deleteClient({ id: client.id }), {
            success: "Client supprimé",
            onSuccess: () => {
              if (redirectAfterDelete) router.push("/clients");
            },
          })
        }
      />
    </>
  );
}
