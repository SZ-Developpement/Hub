"use client";

import {
  BanknoteIcon,
  BellRingIcon,
  CopyIcon,
  EllipsisIcon,
  FileMinusIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteInvoice,
  deletePaymentAction,
  deleteReminderAction,
  duplicateInvoiceAction,
} from "@/app/(app)/factures/actions";
import { PdfButton } from "@/components/documents/pdf-button";
import {
  CreditNoteDialog,
  IssueDialog,
  PaymentDialog,
  ReminderDialog,
} from "@/components/invoices/invoice-dialogs";
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
import type { InvoiceStatus, InvoiceType, PaymentMethod } from "@/generated/prisma/enums";
import { useAction } from "@/hooks/use-action";

export type InvoiceActionsProps = {
  invoice: {
    id: string;
    number: string | null;
    type: InvoiceType;
    status: InvoiceStatus;
    netCents: number;
    /** Reste dû ; négatif = trop-perçu. */
    dueCents: number;
    creditableCents: number;
    issueDate: string;
  };
  /** Numéro et date minimale pour l'émission (brouillons). */
  issue: { nextNumber: string; minDate: string | null };
  /** Date minimale d'un avoir : dernière pièce de la série des avoirs, ou la facture. */
  creditNoteMinDate: string;
  nextReminderLevel: number;
  defaultMethod: PaymentMethod;
  today: string;
};

type OpenDialog = "issue" | "payment" | "reminder" | "credit" | "delete" | null;

export function InvoiceActions({
  invoice,
  issue,
  creditNoteMinDate,
  nextReminderLevel,
  defaultMethod,
  today,
}: InvoiceActionsProps) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const toggle = (name: Exclude<OpenDialog, null>) => (open: boolean) => setDialog(open ? name : null);

  const isDraft = invoice.status === "DRAFT";
  const isCreditNote = invoice.type === "CREDIT_NOTE";
  const number = invoice.number ?? "";
  const canPay = !isDraft && !isCreditNote && invoice.dueCents !== 0;
  const canRemind = !isDraft && !isCreditNote && invoice.dueCents > 0;
  const canCredit = !isDraft && !isCreditNote && invoice.creditableCents > 0;

  return (
    <>
      <PdfButton href={`/api/pdf/invoice/${invoice.id}`} label={isDraft ? "Aperçu" : "PDF"} />

      {isDraft ? (
        <>
          <Button asChild variant="outline">
            <Link href={`/factures/${invoice.id}/modifier`}>
              <PencilIcon data-icon="inline-start" />
              Modifier
            </Link>
          </Button>
          <Button onClick={() => setDialog("issue")}>
            <SendIcon data-icon="inline-start" />
            Émettre la facture
          </Button>
        </>
      ) : null}

      {canRemind ? (
        <Button variant="outline" onClick={() => setDialog("reminder")}>
          <BellRingIcon data-icon="inline-start" />
          Relance
        </Button>
      ) : null}
      {canPay ? (
        <Button onClick={() => setDialog("payment")}>
          <BanknoteIcon data-icon="inline-start" />
          {invoice.dueCents < 0 ? "Enregistrer un remboursement" : "Enregistrer un paiement"}
        </Button>
      ) : null}

      {!isCreditNote ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Autres actions" disabled={pending}>
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              {canCredit ? (
                <DropdownMenuItem onSelect={() => setDialog("credit")}>
                  <FileMinusIcon />
                  Créer un avoir
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onSelect={() =>
                  run(() => duplicateInvoiceAction({ id: invoice.id }), {
                    success: "Facture dupliquée en brouillon",
                    onSuccess: (copy) => router.push(`/factures/${copy.id}/modifier`),
                  })
                }
              >
                <CopyIcon />
                Dupliquer
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {isDraft ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                  <Trash2Icon />
                  Supprimer le brouillon
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {dialog === "issue" ? (
        <IssueDialog
          invoiceId={invoice.id}
          netCents={invoice.netCents}
          nextNumber={issue.nextNumber}
          minDate={issue.minDate}
          today={today}
          open
          onOpenChange={toggle("issue")}
        />
      ) : null}
      {dialog === "payment" ? (
        <PaymentDialog
          invoiceId={invoice.id}
          number={number}
          dueCents={invoice.dueCents}
          defaultMethod={defaultMethod}
          today={today}
          open
          onOpenChange={toggle("payment")}
        />
      ) : null}
      {dialog === "reminder" ? (
        <ReminderDialog
          invoiceId={invoice.id}
          number={number}
          nextLevel={nextReminderLevel}
          today={today}
          open
          onOpenChange={toggle("reminder")}
        />
      ) : null}
      {dialog === "credit" ? (
        <CreditNoteDialog
          invoiceId={invoice.id}
          number={number}
          creditableCents={invoice.creditableCents}
          minDate={creditNoteMinDate}
          today={today}
          open
          onOpenChange={toggle("credit")}
        />
      ) : null}
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={toggle("delete")}
        title="Supprimer ce brouillon ?"
        description="Un brouillon n'a pas de numéro : sa suppression ne crée aucun trou dans la numérotation."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() =>
          run(() => deleteInvoice({ id: invoice.id }), {
            success: "Brouillon supprimé",
            onSuccess: () => router.push("/factures"),
          })
        }
      />
    </>
  );
}

/** Bouton de suppression d'un paiement ou d'une relance, dans les tableaux de la fiche facture. */
export function DeleteEntryButton({
  kind,
  id,
  label,
}: {
  kind: "payment" | "reminder";
  id: string;
  label: string;
}) {
  const { pending, run } = useAction();
  const isPayment = kind === "payment";

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={label} disabled={pending}>
          <Trash2Icon />
        </Button>
      }
      title={isPayment ? "Supprimer ce paiement ?" : "Supprimer cette relance ?"}
      description={
        isPayment
          ? "Le solde de la facture et le livre des recettes seront recalculés. À n'utiliser que pour corriger une erreur de saisie."
          : "La relance sera retirée de l'historique de la facture."
      }
      confirmLabel="Supprimer"
      destructive
      onConfirm={() =>
        run(() => (isPayment ? deletePaymentAction({ id }) : deleteReminderAction({ id })), {
          success: isPayment ? "Paiement supprimé" : "Relance supprimée",
        })
      }
    />
  );
}
