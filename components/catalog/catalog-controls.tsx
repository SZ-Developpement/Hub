"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";

import {
  archiveService,
  deleteCategory,
  deleteService,
  restoreService,
  saveCategory,
} from "@/app/(app)/catalogue/actions";
import { ServiceDialog, type CategoryOption } from "@/components/catalog/service-dialog";
import { CategoryManager, type ManagedCategory } from "@/components/shared/category-manager";
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
import type { ServiceValues } from "@/lib/validation/catalog";

export function NewServiceButton({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        Nouvelle prestation
      </Button>
      {open ? <ServiceDialog service={null} categories={categories} open onOpenChange={setOpen} /> : null}
    </>
  );
}

export function ServiceMenu({
  service,
  categories,
  archived,
  used,
}: {
  service: ServiceValues & { id: string };
  categories: CategoryOption[];
  archived: boolean;
  /** Vrai si la prestation figure dans au moins un document. */
  used: boolean;
}) {
  const { pending, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions pour ${service.name}`} disabled={pending}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <PencilIcon />
              Modifier
            </DropdownMenuItem>
            {archived ? (
              <DropdownMenuItem
                onSelect={() =>
                  run(() => restoreService({ id: service.id }), { success: "Prestation restaurée" })
                }
              >
                <ArchiveRestoreIcon />
                Restaurer
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() =>
                  run(() => archiveService({ id: service.id }), { success: "Prestation archivée" })
                }
              >
                <ArchiveIcon />
                Archiver
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {!used ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {editing ? (
        <ServiceDialog service={service} categories={categories} open onOpenChange={setEditing} />
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer « ${service.name} » ?`}
        description="Cette prestation n'a jamais été utilisée. La suppression est définitive."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => run(() => deleteService({ id: service.id }), { success: "Prestation supprimée" })}
      />
    </>
  );
}

export function CategoriesButton({ categories }: { categories: ManagedCategory[] }) {
  return (
    <CategoryManager
      title="Catégories de prestations"
      description="Elles servent à ventiler votre chiffre d'affaires par type de prestation sur le tableau de bord."
      categories={categories}
      actions={{ save: saveCategory, remove: deleteCategory }}
      itemLabel={(count) => `${count} prestation${count > 1 ? "s" : ""}`}
      deleteDescription="Ses prestations ne sont pas supprimées : elles deviennent « sans catégorie »."
    />
  );
}
