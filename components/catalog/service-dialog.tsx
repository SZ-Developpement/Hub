"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { saveService } from "@/app/(app)/catalogue/actions";
import { MoneyField, SelectField, TextareaField, TextField } from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { Unit } from "@/generated/prisma/enums";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { UNIT_LABELS } from "@/lib/labels";
import { serviceSchema, type ServiceValues } from "@/lib/validation/catalog";

export type CategoryOption = { id: string; name: string };

const UNITS = Object.keys(UNIT_LABELS) as Unit[];

export function ServiceDialog({
  service,
  categories,
  open,
  onOpenChange,
}: {
  /** Prestation à modifier ; `null` pour une création. */
  service: ServiceValues | null;
  categories: CategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pending, run } = useAction();
  const form = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service ?? {
      id: null,
      name: "",
      description: "",
      categoryId: null,
      unit: "FLAT",
      unitPriceCents: 0,
    },
  });

  function onSubmit(values: ServiceValues) {
    run(() => saveService(values), {
      success: service ? "Prestation enregistrée" : "Prestation ajoutée au catalogue",
      onSuccess: () => onOpenChange(false),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Modifier la prestation" : "Nouvelle prestation"}</DialogTitle>
          <DialogDescription>
            Une prestation du catalogue pré-remplit les lignes de vos devis et factures. Modifier
            son prix ne change pas les documents existants.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField control={form.control} name="name" label="Désignation" autoFocus />
            <TextareaField
              control={form.control}
              name="description"
              label="Description"
              description="Reprise sous la désignation dans les documents."
              rows={2}
            />
            <SelectField
              control={form.control}
              name="categoryId"
              label="Catégorie"
              emptyLabel="Sans catégorie"
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                control={form.control}
                name="unit"
                label="Unité"
                options={UNITS.map((unit) => ({ value: unit, label: UNIT_LABELS[unit] }))}
              />
              <MoneyField control={form.control} name="unitPriceCents" label="Prix unitaire HT" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {service ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
