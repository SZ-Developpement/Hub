"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Send, CheckCircle, RefreshCw } from "lucide-react";
import {
  updateInvoiceStatus,
  deleteInvoice,
  convertQuoteToInvoice,
} from "@/server/actions/invoices";
import { InvoiceStatus, InvoiceType } from "@/generated/prisma/client";

type InvoiceDetailActionsProps = {
  invoice: {
    id: string;
    slug: string;
    type: InvoiceType;
    status: InvoiceStatus;
  };
};

export function InvoiceDetailActions({ invoice }: InvoiceDetailActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleStatus(status: "SENT" | "PAID" | "CANCELLED") {
    setPending(true);
    await updateInvoiceStatus(invoice.id, status);
    setPending(false);
    router.refresh();
  }

  async function handleConvert() {
    setPending(true);
    const result = await convertQuoteToInvoice(invoice.id);
    setPending(false);
    if (result.data) {
      router.push(`/dashboard/invoices/${result.data.slug}`);
    }
  }

  async function handleDelete() {
    setPending(true);
    await deleteInvoice(invoice.id);
    setPending(false);
    router.push("/dashboard/invoices");
  }

  return (
    <div className="flex items-center gap-2">
      {/* Modifier — seulement si brouillon */}
      {invoice.status === "DRAFT" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(`/dashboard/invoices/${invoice.slug}/edit`)
          }
          disabled={pending}
        >
          <Pencil className="size-4 mr-1" />
          Modifier
        </Button>
      )}

      {/* Marquer comme envoyé — si brouillon */}
      {invoice.status === "DRAFT" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStatus("SENT")}
          disabled={pending}
        >
          <Send className="size-4 mr-1" />
          Marquer envoyé
        </Button>
      )}

      {/* Marquer comme payé — si envoyé */}
      {invoice.status === "SENT" && invoice.type === "INVOICE" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStatus("PAID")}
          disabled={pending}
        >
          <CheckCircle className="size-4 mr-1" />
          Marquer payé
        </Button>
      )}

      {/* Convertir en facture — si devis envoyé */}
      {invoice.type === "QUOTE" && invoice.status === "SENT" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleConvert}
          disabled={pending}
        >
          <RefreshCw className="size-4 mr-1" />
          Convertir en facture
        </Button>
      )}

      {/* Supprimer — seulement si brouillon */}
      {invoice.status === "DRAFT" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          disabled={pending}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4 mr-1" />
          Supprimer
        </Button>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
