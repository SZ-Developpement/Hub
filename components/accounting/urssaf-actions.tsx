"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EllipsisIcon, Undo2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { declareUrssaf, payUrssaf, reopenUrssaf } from "@/app/(app)/comptabilite/actions";
import { DatePicker } from "@/components/shared/date-picker";
import { DateField, MoneyField } from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { UrssafStatus } from "@/generated/prisma/enums";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { formatMoney } from "@/lib/format";
import { declareUrssafSchema, type DeclareUrssafValues } from "@/lib/validation/accounting";

function DeclareDialog({
  declaration,
  today,
  onClose,
}: {
  declaration: UrssafActionsProps["declaration"];
  today: string;
  onClose: () => void;
}) {
  const { pending, run } = useAction();
  const form = useForm<DeclareUrssafValues>({
    resolver: zodResolver(declareUrssafSchema),
    defaultValues: {
      id: declaration.id,
      // L'URSSAF attend un chiffre d'affaires arrondi à l'euro.
      declaredRevenueCents: Math.round(declaration.revenueCents / 100) * 100,
      contributionsCents: Math.round(declaration.estimatedCents / 100) * 100,
      declaredOn: today,
    },
  });

  function onSubmit(values: DeclareUrssafValues) {
    run(() => declareUrssaf(values), {
      success: "Déclaration enregistrée",
      onSuccess: onClose,
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déclaration {declaration.label}</DialogTitle>
          <DialogDescription>
            Reportez ici ce que vous avez déclaré sur le site de l&apos;URSSAF. Ces montants sont
            figés : ils ne bougeront plus si un taux ou un paiement est modifié ensuite.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <MoneyField
              control={form.control}
              name="declaredRevenueCents"
              label="Chiffre d'affaires déclaré"
              description={`Encaissé sur la période : ${formatMoney(declaration.revenueCents)}.`}
            />
            <MoneyField
              control={form.control}
              name="contributionsCents"
              label="Cotisations à payer"
              description={`Estimation de l'application : ${formatMoney(declaration.estimatedCents)}. Saisissez le montant calculé par l'URSSAF.`}
            />
            <DateField
              control={form.control}
              name="declaredOn"
              label="Date de la déclaration"
              max={today}
              className="max-w-56"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
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

export type UrssafActionsProps = {
  declaration: {
    id: string;
    label: string;
    status: UrssafStatus;
    revenueCents: number;
    estimatedCents: number;
  };
  today: string;
};

export function UrssafActions({ declaration, today }: UrssafActionsProps) {
  const { pending, run } = useAction();
  const [dialog, setDialog] = useState<"declare" | "pay" | null>(null);
  const [paidOn, setPaidOn] = useState<string | null>(today);

  return (
    <div className="flex items-center justify-end gap-1">
      {declaration.status === "TO_DECLARE" ? (
        <Button size="sm" variant="outline" onClick={() => setDialog("declare")}>
          Déclarer
        </Button>
      ) : null}
      {declaration.status === "DECLARED" ? (
        <Button size="sm" variant="outline" onClick={() => setDialog("pay")}>
          Marquer payé
        </Button>
      ) : null}
      {declaration.status !== "TO_DECLARE" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Autres actions" disabled={pending}>
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onSelect={() =>
                run(() => reopenUrssaf({ id: declaration.id }), { success: "Période rouverte" })
              }
            >
              <Undo2Icon />
              Rouvrir la période
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {dialog === "declare" ? (
        <DeclareDialog declaration={declaration} today={today} onClose={() => setDialog(null)} />
      ) : null}

      <Dialog open={dialog === "pay"} onOpenChange={(open) => setDialog(open ? "pay" : null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Paiement des cotisations</DialogTitle>
            <DialogDescription>Période {declaration.label}.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="urssaf-paid-on">Date du paiement</FieldLabel>
            <DatePicker id="urssaf-paid-on" value={paidOn} onChange={setPaidOn} max={today} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={pending || !paidOn}
              onClick={() =>
                run(() => payUrssaf({ id: declaration.id, paidOn: paidOn ?? today }), {
                  success: "Paiement enregistré",
                  onSuccess: () => setDialog(null),
                })
              }
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
