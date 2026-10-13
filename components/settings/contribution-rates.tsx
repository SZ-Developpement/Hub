"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { deleteContributionRate, saveContributionRate } from "@/app/(app)/parametres/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DateField, PercentField, TextField } from "@/components/shared/form-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { formatDate, formatRate } from "@/lib/format";
import {
  contributionRateSchema,
  type ContributionRateValues,
} from "@/lib/validation/settings";

export type ContributionRateRow = {
  id: string;
  effectiveFrom: string;
  socialRateBp: number;
  cfpRateBp: number;
  incomeTaxRateBp: number;
  note: string;
};

function RateDialog({
  rate,
  today,
  open,
  onOpenChange,
}: {
  rate: ContributionRateRow | null;
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pending, run } = useAction();
  const form = useForm<ContributionRateValues>({
    resolver: zodResolver(contributionRateSchema),
    defaultValues: rate ?? {
      id: null,
      effectiveFrom: today,
      socialRateBp: 0,
      cfpRateBp: 0,
      incomeTaxRateBp: 0,
      note: "",
    },
  });

  function onSubmit(values: ContributionRateValues) {
    run(() => saveContributionRate(values), {
      success: "Taux enregistré",
      onSuccess: () => onOpenChange(false),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rate ? "Modifier le taux" : "Nouveau taux"}</DialogTitle>
          <DialogDescription>
            Le taux s&apos;applique aux encaissements à partir de sa date d&apos;effet, jusqu&apos;au
            taux suivant.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <DateField control={form.control} name="effectiveFrom" label="Date d'effet" />
            <PercentField
              control={form.control}
              name="socialRateBp"
              label="Cotisations sociales"
              description="Taux global URSSAF de votre activité (taux réduit pendant l'ACRE)."
            />
            <div className="grid grid-cols-2 gap-4">
              <PercentField
                control={form.control}
                name="cfpRateBp"
                label="Formation professionnelle"
                description="CFP."
              />
              <PercentField
                control={form.control}
                name="incomeTaxRateBp"
                label="Versement libératoire"
                description="0 si non souscrit."
              />
            </div>
            <TextField control={form.control} name="note" label="Note" placeholder="Ex. : taux 2026, ACRE…" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ContributionRates({
  rates,
  today,
}: {
  rates: ContributionRateRow[];
  today: string;
}) {
  const { run } = useAction();
  const [editing, setEditing] = useState<ContributionRateRow | "new" | null>(null);
  // Taux en vigueur : le plus récent dont la date d'effet est passée (liste triée par date décroissante).
  const currentId = rates.find((rate) => rate.effectiveFrom <= today)?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taux de cotisations</CardTitle>
        <CardDescription>
          Aucun taux n&apos;est fixé par l&apos;application : saisissez ceux communiqués par
          l&apos;URSSAF, et ajoutez une ligne à chaque changement. Les périodes passées restent
          calculées avec le taux qui s&apos;appliquait alors.
        </CardDescription>
        <CardAction>
          <Button type="button" size="sm" onClick={() => setEditing("new")}>
            <PlusIcon data-icon="inline-start" />
            Ajouter un taux
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rates.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun taux configuré : les cotisations estimées resteront à 0 € tant que vous n&apos;en
            aurez pas ajouté.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date d&apos;effet</TableHead>
                  <TableHead className="text-right">Cotisations</TableHead>
                  <TableHead className="text-right">CFP</TableHead>
                  <TableHead className="text-right">Vers. libératoire</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDate(rate.effectiveFrom)}
                      {rate.id === currentId ? (
                        <StatusBadge tone="success" className="ml-2">
                          En vigueur
                        </StatusBadge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatRate(rate.socialRateBp)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRate(rate.cfpRateBp)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(rate.incomeTaxRateBp)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatRate(rate.socialRateBp + rate.cfpRateBp + rate.incomeTaxRateBp)}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">{rate.note}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Modifier le taux"
                          onClick={() => setEditing(rate)}
                        >
                          <PencilIcon />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Supprimer le taux">
                              <Trash2Icon />
                            </Button>
                          }
                          title="Supprimer ce taux ?"
                          description="Les estimations de cotisations seront recalculées avec les taux restants. Les déclarations déjà enregistrées ne changent pas."
                          confirmLabel="Supprimer"
                          destructive
                          onConfirm={() =>
                            run(() => deleteContributionRate({ id: rate.id }), { success: "Taux supprimé" })
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {editing ? (
        <RateDialog
          key={editing === "new" ? "new" : editing.id}
          rate={editing === "new" ? null : editing}
          today={today}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
    </Card>
  );
}
