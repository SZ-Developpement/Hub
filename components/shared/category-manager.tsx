"use client";

import { CheckIcon, PencilIcon, TagsIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/action";

export type ManagedCategory = { id: string; name: string; count: number };

type CategoryActions = {
  save: (input: { id: string | null; name: string }) => Promise<ActionResult<unknown>>;
  remove: (input: { id: string }) => Promise<ActionResult<unknown>>;
};

function CategoryRow({
  category,
  actions,
  itemLabel,
  deleteDescription,
}: {
  category: ManagedCategory;
  actions: CategoryActions;
  itemLabel: (count: number) => string;
  deleteDescription: string;
}) {
  const { pending, run } = useAction();
  const [name, setName] = useState(category.name);
  const [editing, setEditing] = useState(false);

  function cancel() {
    setName(category.name);
    setEditing(false);
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) return cancel();
    run(() => actions.save({ id: category.id, name: trimmed }), {
      success: "Catégorie renommée",
      onSuccess: () => setEditing(false),
    });
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-2">
        <Input
          autoFocus
          value={name}
          maxLength={60}
          aria-label="Nom de la catégorie"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
            if (event.key === "Escape") cancel();
          }}
        />
        <Button size="icon-sm" variant="ghost" aria-label="Valider" disabled={pending} onClick={save}>
          <CheckIcon />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Annuler" onClick={cancel}>
          <XIcon />
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{itemLabel(category.count)}</span>
      <Button size="icon-sm" variant="ghost" aria-label="Renommer" onClick={() => setEditing(true)}>
        <PencilIcon />
      </Button>
      <ConfirmDialog
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label="Supprimer la catégorie" disabled={pending}>
            <Trash2Icon />
          </Button>
        }
        title={`Supprimer la catégorie « ${category.name} » ?`}
        description={deleteDescription}
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => run(() => actions.remove({ id: category.id }), { success: "Catégorie supprimée" })}
      />
    </li>
  );
}

/** Bouton ouvrant la gestion d'une liste de catégories (ajout, renommage, suppression). */
export function CategoryManager({
  title,
  description,
  categories,
  actions,
  itemLabel,
  deleteDescription,
}: {
  title: string;
  description: string;
  categories: ManagedCategory[];
  actions: CategoryActions;
  /** Libellé du compteur, ex. « 3 prestations ». */
  itemLabel: (count: number) => string;
  deleteDescription: string;
}) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    run(() => actions.save({ id: null, name: trimmed }), {
      success: "Catégorie ajoutée",
      onSuccess: () => setName(""),
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <TagsIcon data-icon="inline-start" />
        Catégories
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {categories.length > 0 ? (
            <ul className="max-h-72 divide-y overflow-y-auto">
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  actions={actions}
                  itemLabel={itemLabel}
                  deleteDescription={deleteDescription}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucune catégorie.
            </p>
          )}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              add();
            }}
          >
            <Input
              value={name}
              maxLength={60}
              placeholder="Nouvelle catégorie"
              aria-label="Nom de la nouvelle catégorie"
              onChange={(event) => setName(event.target.value)}
            />
            <Button type="submit" disabled={pending || !name.trim()}>
              Ajouter
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
