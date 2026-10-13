"use client";

import {
  CalendarPlusIcon,
  CheckIcon,
  CopyIcon,
  EllipsisIcon,
  PencilIcon,
  ReceiptTextIcon,
  SendIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  convertQuoteToInvoice,
  deleteQuote,
  duplicateQuote,
  extendQuote,
  setQuoteStatus,
} from "@/app/(app)/devis/actions";
import { PdfButton } from "@/components/documents/pdf-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DatePicker } from "@/components/shared/date-picker";
import { PercentInput } from "@/components/shared/number-inputs";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import type { QuoteStatus } from "@/generated/prisma/enums";
import { useAction } from "@/hooks/use-action";
import { formatMoney } from "@/lib/format";
import { applyRate } from "@/lib/money";

type Mode = "FULL" | "DEPOSIT" | "BALANCE";

export type QuoteActionsProps = {
  quote: {
    id: string;
    number: string;
    status: QuoteStatus;
    totalCents: number;
    depositRateBp: number;
    hasInvoices: boolean;
  };
  invoicing: {
    canInvoiceFull: boolean;
    canInvoiceDeposit: boolean;
    canInvoiceBalance: boolean;
    hasDraftDeposit: boolean;
    pendingDepositCents: number;
  };
  today: string;
  defaultValidUntil: string;
};

function InvoiceDialog({
  quote,
  invoicing,
  open,
  onOpenChange,
}: Pick<QuoteActionsProps, "quote" | "invoicing"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const initialMode: Mode = invoicing.canInvoiceBalance
    ? "BALANCE"
    : invoicing.canInvoiceFull
      ? "FULL"
      : "DEPOSIT";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [rate, setRate] = useState<number | null>(quote.depositRateBp || 3000);

  const options: { value: Mode; label: string; description: string; enabled: boolean }[] = [
    {
      value: "FULL",
      label: "Facture totale",
      description: `Reprend toutes les lignes du devis : ${formatMoney(quote.totalCents)}.`,
      enabled: invoicing.canInvoiceFull,
    },
    {
      value: "DEPOSIT",
      label: "Facture d'acompte",
      description: "Un pourcentage du devis, à régler avant ou pendant la prestation.",
      enabled: invoicing.canInvoiceDeposit,
    },
    {
      value: "BALANCE",
      label: "Facture de solde",
      description: invoicing.canInvoiceBalance
        ? `Toutes les lignes, moins ${formatMoney(invoicing.pendingDepositCents)} d'acomptes déjà facturés.`
        : invoicing.hasDraftDeposit
          ? "Émettez d'abord la facture d'acompte en brouillon."
          : "Disponible après l'émission d'une facture d'acompte.",
      enabled: invoicing.canInvoiceBalance,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Facturer le devis {quote.number}</DialogTitle>
          <DialogDescription>
            La facture est créée en brouillon : vous pourrez la relire et l&apos;ajuster avant de
            l&apos;émettre.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={mode} onValueChange={(value) => setMode(value as Mode)} className="gap-3">
          {options.map((option) => (
            <Field key={option.value} orientation="horizontal" data-disabled={!option.enabled}>
              <RadioGroupItem
                id={`mode-${option.value}`}
                value={option.value}
                disabled={!option.enabled}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <FieldLabel htmlFor={`mode-${option.value}`}>{option.label}</FieldLabel>
                <FieldDescription>{option.description}</FieldDescription>
              </div>
            </Field>
          ))}
        </RadioGroup>

        {mode === "DEPOSIT" ? (
          <Field className="max-w-64">
            <FieldLabel htmlFor="deposit-rate">Pourcentage de l&apos;acompte</FieldLabel>
            <PercentInput id="deposit-rate" value={rate} onChange={setRate} />
            <FieldDescription>
              Soit {formatMoney(applyRate(quote.totalCents, rate ?? 0))} HT.
            </FieldDescription>
          </Field>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={pending || (mode === "DEPOSIT" && !rate)}
            onClick={() =>
              run(
                () =>
                  convertQuoteToInvoice({
                    id: quote.id,
                    mode,
                    depositRateBp: mode === "DEPOSIT" ? (rate ?? 0) : 10_000,
                  }),
                {
                  success: "Facture créée en brouillon",
                  onSuccess: ({ invoiceId }) => router.push(`/factures/${invoiceId}`),
                },
              )
            }
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Créer la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuoteActions({ quote, invoicing, today, defaultValidUntil }: QuoteActionsProps) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [dialog, setDialog] = useState<"invoice" | "extend" | "delete" | null>(null);
  const [validUntil, setValidUntil] = useState<string | null>(defaultValidUntil);
  const { id, status } = quote;

  const setStatus = (next: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED", success: string) =>
    run(() => setQuoteStatus({ id, status: next }), { success });

  const canInvoice =
    (status === "SENT" || status === "ACCEPTED") &&
    (invoicing.canInvoiceFull || invoicing.canInvoiceDeposit || invoicing.canInvoiceBalance);

  return (
    <>
      <PdfButton href={`/api/pdf/quote/${id}`} />

      {status === "DRAFT" ? (
        <>
          <Button asChild variant="outline">
            <Link href={`/devis/${id}/modifier`}>
              <PencilIcon data-icon="inline-start" />
              Modifier
            </Link>
          </Button>
          <Button disabled={pending} onClick={() => setStatus("SENT", "Devis marqué comme envoyé")}>
            <SendIcon data-icon="inline-start" />
            Marquer comme envoyé
          </Button>
        </>
      ) : null}

      {status === "SENT" ? (
        <>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setStatus("DECLINED", "Devis marqué comme refusé")}
          >
            <XIcon data-icon="inline-start" />
            Refusé
          </Button>
          <Button disabled={pending} onClick={() => setStatus("ACCEPTED", "Devis marqué comme accepté")}>
            <CheckIcon data-icon="inline-start" />
            Accepté
          </Button>
        </>
      ) : null}

      {status === "ACCEPTED" && canInvoice ? (
        <Button disabled={pending} onClick={() => setDialog("invoice")}>
          <ReceiptTextIcon data-icon="inline-start" />
          Facturer
        </Button>
      ) : null}

      {status === "EXPIRED" ? (
        <Button disabled={pending} onClick={() => setDialog("extend")}>
          <CalendarPlusIcon data-icon="inline-start" />
          Prolonger la validité
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Autres actions" disabled={pending}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            {status === "SENT" && canInvoice ? (
              <DropdownMenuItem onSelect={() => setDialog("invoice")}>
                <ReceiptTextIcon />
                Facturer
              </DropdownMenuItem>
            ) : null}
            {status === "SENT" ? (
              <DropdownMenuItem onSelect={() => setDialog("extend")}>
                <CalendarPlusIcon />
                Prolonger la validité
              </DropdownMenuItem>
            ) : null}
            {(status === "SENT" || status === "DECLINED" || status === "EXPIRED") &&
            !quote.hasInvoices ? (
              <DropdownMenuItem onSelect={() => setStatus("DRAFT", "Devis remis en brouillon")}>
                <Undo2Icon />
                Remettre en brouillon
              </DropdownMenuItem>
            ) : null}
            {status === "ACCEPTED" && !quote.hasInvoices ? (
              <DropdownMenuItem onSelect={() => setStatus("SENT", "Acceptation annulée")}>
                <Undo2Icon />
                Annuler l&apos;acceptation
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={() =>
                run(() => duplicateQuote({ id }), {
                  success: "Devis dupliqué",
                  onSuccess: (copy) => router.push(`/devis/${copy.id}/modifier`),
                })
              }
            >
              <CopyIcon />
              Dupliquer
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {!quote.hasInvoices ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog === "invoice" ? (
        <InvoiceDialog
          quote={quote}
          invoicing={invoicing}
          open
          onOpenChange={(open) => setDialog(open ? "invoice" : null)}
        />
      ) : null}

      <Dialog open={dialog === "extend"} onOpenChange={(open) => setDialog(open ? "extend" : null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Prolonger la validité</DialogTitle>
            <DialogDescription>
              Le devis {quote.number} repassera au statut « envoyé » jusqu&apos;à cette date.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="valid-until">Nouvelle date de validité</FieldLabel>
            <DatePicker id="valid-until" value={validUntil} onChange={setValidUntil} min={today} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={pending || !validUntil}
              onClick={() =>
                run(() => extendQuote({ id, validUntil: validUntil ?? today }), {
                  success: "Validité prolongée",
                  onSuccess: () => setDialog(null),
                })
              }
            >
              Prolonger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title={`Supprimer le devis ${quote.number} ?`}
        description="Cette action est définitive. Son numéro ne sera pas réattribué."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() =>
          run(() => deleteQuote({ id }), {
            success: "Devis supprimé",
            onSuccess: () => router.push("/devis"),
          })
        }
      />
    </>
  );
}
