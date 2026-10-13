"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  addReminderAction,
  createCreditNoteAction,
  issueInvoiceAction,
  recordPaymentAction,
} from "@/app/(app)/factures/actions";
import { DatePicker } from "@/components/shared/date-picker";
import {
  DateField,
  MoneyField,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/shared/form-fields";
import { MoneyInput } from "@/components/shared/number-inputs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { formatDate, formatMoney } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  REMINDER_CHANNEL_LABELS,
  REMINDER_LEVEL_LABELS,
  REMINDER_LEVELS,
} from "@/lib/labels";
import {
  creditNoteSchema,
  paymentSchema,
  reminderSchema,
  type CreditNoteValues,
  type PaymentValues,
  type ReminderValues,
} from "@/lib/validation/documents";

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

function Footer({
  pending,
  label,
  onCancel,
  destructive = false,
}: {
  pending: boolean;
  label: string;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        Annuler
      </Button>
      <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {label}
      </Button>
    </DialogFooter>
  );
}

// ───────────────────────────── Émission ─────────────────────────────

export function IssueDialog({
  invoiceId,
  netCents,
  nextNumber,
  minDate,
  today,
  open,
  onOpenChange,
}: DialogProps & {
  invoiceId: string;
  netCents: number;
  /** Numéro qui sera attribué (indicatif tant que la facture n'est pas émise). */
  nextNumber: string;
  /** Date de la dernière facture émise : la nouvelle ne peut pas la précéder. */
  minDate: string | null;
  today: string;
}) {
  const { pending, run } = useAction();
  const [issueDate, setIssueDate] = useState<string | null>(
    minDate && minDate > today ? minDate : today,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Émettre la facture</DialogTitle>
          <DialogDescription>
            Elle recevra le numéro <span className="font-medium text-foreground">{nextNumber}</span>{" "}
            pour un net à payer de{" "}
            <span className="font-medium text-foreground">{formatMoney(netCents)}</span>.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!issueDate) return;
            run(() => issueInvoiceAction({ id: invoiceId, issueDate }), {
              onSuccess: ({ number }) => {
                onOpenChange(false);
                // Le numéro définitif vient du serveur.
                toast.success(`Facture ${number} émise`);
              },
            });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="issue-date">Date d&apos;émission</FieldLabel>
              <DatePicker
                id="issue-date"
                value={issueDate}
                onChange={setIssueDate}
                min={minDate ?? undefined}
              />
              <FieldDescription>
                {minDate
                  ? `Au plus tôt le ${formatDate(minDate)}, date de la dernière facture émise : la numérotation est chronologique. `
                  : ""}
                Si aucune date de prestation n&apos;est renseignée, la date d&apos;émission est retenue.
              </FieldDescription>
            </Field>
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>
                Une facture émise est définitive : elle ne peut plus être modifiée ni supprimée.
                Seul un avoir permet de la corriger. Son PDF est archivé tel quel.
              </AlertDescription>
            </Alert>
            <Footer pending={pending || !issueDate} label="Émettre" onCancel={() => onOpenChange(false)} />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Paiement ─────────────────────────────

export function PaymentDialog({
  invoiceId,
  number,
  dueCents,
  defaultMethod,
  today,
  open,
  onOpenChange,
}: DialogProps & {
  invoiceId: string;
  number: string;
  /** Reste dû ; négatif en cas de trop-perçu (le dialogue enregistre alors un remboursement). */
  dueCents: number;
  defaultMethod: PaymentMethod;
  today: string;
}) {
  const refund = dueCents < 0;
  const { pending, run } = useAction();
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId,
      paidOn: today,
      amountCents: dueCents,
      method: defaultMethod,
      reference: "",
      note: "",
    },
  });

  function onSubmit(values: PaymentValues) {
    run(() => recordPaymentAction(values), {
      success: refund ? "Remboursement enregistré" : "Paiement enregistré",
      onSuccess: () => onOpenChange(false),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{refund ? "Enregistrer un remboursement" : "Enregistrer un paiement"}</DialogTitle>
          <DialogDescription>
            Facture {number} —{" "}
            {refund
              ? `trop-perçu à rembourser : ${formatMoney(-dueCents)}`
              : `reste dû : ${formatMoney(dueCents)}`}
            . Un paiement partiel est possible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <DateField control={form.control} name="paidOn" label="Date" max={today} />
              <Controller
                control={form.control}
                name="amountCents"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="payment-amount">
                      {refund ? "Montant remboursé" : "Montant encaissé"}
                    </FieldLabel>
                    <MoneyInput
                      id="payment-amount"
                      // Un remboursement se saisit en positif et s'enregistre en négatif.
                      value={refund ? -field.value : field.value}
                      onChange={(value) => field.onChange(refund ? -(value ?? 0) : (value ?? 0))}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                control={form.control}
                name="method"
                label="Mode de règlement"
                options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <TextField
                control={form.control}
                name="reference"
                label="Référence"
                placeholder="N° de chèque, libellé…"
              />
            </div>
            <TextField control={form.control} name="note" label="Note" />
            <Footer pending={pending} label="Enregistrer" onCancel={() => onOpenChange(false)} />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Relance ─────────────────────────────

export function ReminderDialog({
  invoiceId,
  number,
  nextLevel,
  today,
  open,
  onOpenChange,
}: DialogProps & { invoiceId: string; number: string; nextLevel: number; today: string }) {
  const { pending, run } = useAction();
  const form = useForm<ReminderValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { invoiceId, sentOn: today, level: nextLevel, channel: "EMAIL", note: "" },
  });

  function onSubmit(values: ReminderValues) {
    run(() => addReminderAction(values), {
      success: "Relance consignée",
      onSuccess: () => onOpenChange(false),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Consigner une relance</DialogTitle>
          <DialogDescription>
            Gardez la trace des relances faites pour la facture {number}. L&apos;application
            n&apos;envoie aucun message au client.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <DateField control={form.control} name="sentOn" label="Date" max={today} />
              <SelectField
                control={form.control}
                name="channel"
                label="Canal"
                options={Object.entries(REMINDER_CHANNEL_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <Controller
              control={form.control}
              name="level"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Niveau</FieldLabel>
                  <RadioGroup
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                    className="grid grid-cols-2 gap-2"
                  >
                    {REMINDER_LEVELS.map((level) => (
                      <Field key={level} orientation="horizontal">
                        <RadioGroupItem id={`level-${level}`} value={String(level)} />
                        <FieldLabel htmlFor={`level-${level}`} className="font-normal">
                          {REMINDER_LEVEL_LABELS[level]}
                        </FieldLabel>
                      </Field>
                    ))}
                  </RadioGroup>
                </Field>
              )}
            />
            <TextareaField
              control={form.control}
              name="note"
              label="Note"
              placeholder="Réponse du client, date de paiement promise…"
              rows={2}
            />
            <Footer pending={pending} label="Consigner" onCancel={() => onOpenChange(false)} />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Avoir ─────────────────────────────

export function CreditNoteDialog({
  invoiceId,
  number,
  creditableCents,
  minDate,
  today,
  open,
  onOpenChange,
}: DialogProps & {
  invoiceId: string;
  number: string;
  /** Montant encore créditable (net − avoirs déjà émis). */
  creditableCents: number;
  minDate: string;
  today: string;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const form = useForm<CreditNoteValues>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: {
      invoiceId,
      mode: "FULL",
      amountCents: 0,
      label: "",
      reason: "",
      issueDate: minDate > today ? minDate : today,
    },
  });
  const mode = useWatch({ control: form.control, name: "mode" });

  function onSubmit(values: CreditNoteValues) {
    run(() => createCreditNoteAction(values), {
      success: "Avoir émis",
      onSuccess: ({ id }) => {
        onOpenChange(false);
        router.push(`/factures/${id}`);
      },
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un avoir</DialogTitle>
          <DialogDescription>
            Sur la facture {number}. Montant créditable : {formatMoney(creditableCents)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              control={form.control}
              name="mode"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                  <Field orientation="horizontal">
                    <RadioGroupItem id="credit-full" value="FULL" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <FieldLabel htmlFor="credit-full">Annulation totale</FieldLabel>
                      <FieldDescription>
                        Avoir de {formatMoney(creditableCents)} : la facture est entièrement annulée.
                      </FieldDescription>
                    </div>
                  </Field>
                  <Field orientation="horizontal">
                    <RadioGroupItem id="credit-partial" value="PARTIAL" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <FieldLabel htmlFor="credit-partial">Avoir partiel</FieldLabel>
                      <FieldDescription>Remise après coup, erreur de prix, prestation réduite…</FieldDescription>
                    </div>
                  </Field>
                </RadioGroup>
              )}
            />
            {mode === "PARTIAL" ? (
              <div className="grid grid-cols-2 gap-4">
                <MoneyField control={form.control} name="amountCents" label="Montant à créditer" />
                <TextField control={form.control} name="label" label="Libellé de la ligne" placeholder="Facultatif" />
              </div>
            ) : null}
            <div className="grid grid-cols-[12rem_minmax(0,1fr)] gap-4">
              <DateField control={form.control} name="issueDate" label="Date de l'avoir" min={minDate} />
              <TextField
                control={form.control}
                name="reason"
                label="Motif"
                placeholder="Imprimé sur l'avoir"
              />
            </div>
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>
                L&apos;avoir est émis immédiatement avec un numéro définitif. Si la facture a déjà
                été réglée, pensez à enregistrer le remboursement.
              </AlertDescription>
            </Alert>
            <Footer pending={pending} label="Émettre l'avoir" onCancel={() => onOpenChange(false)} />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
