"use client";

import {
  CheckIcon,
  CopyIcon,
  EllipsisIcon,
  FileTextIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  convertPreQuoteToQuote,
  deletePreQuote,
  duplicatePreQuote,
  setPreQuoteStatus,
} from "@/app/(app)/pre-devis/actions";
import { PdfButton } from "@/components/documents/pdf-button";
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
import type { PreQuoteStatus } from "@/generated/prisma/enums";
import { useAction } from "@/hooks/use-action";

export function PreQuoteActions({
  preQuote,
}: {
  preQuote: { id: string; number: string; status: PreQuoteStatus; hasQuotes: boolean };
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { id, status } = preQuote;

  const setStatus = (next: PreQuoteStatus, success: string) =>
    run(() => setPreQuoteStatus({ id, status: next }), { success });

  const convert = () =>
    run(() => convertPreQuoteToQuote({ id }), {
      success: "Devis créé à partir du pré-devis",
      onSuccess: ({ quoteId }) => router.push(`/devis/${quoteId}/modifier`),
    });

  return (
    <>
      <PdfButton href={`/api/pdf/pre-quote/${id}`} />

      {status === "DRAFT" ? (
        <>
          <Button asChild variant="outline">
            <Link href={`/pre-devis/${id}/modifier`}>
              <PencilIcon data-icon="inline-start" />
              Modifier
            </Link>
          </Button>
          <Button disabled={pending} onClick={() => setStatus("SENT", "Pré-devis marqué comme envoyé")}>
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
            onClick={() => setStatus("DECLINED", "Pré-devis marqué comme refusé")}
          >
            <XIcon data-icon="inline-start" />
            Refusé
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setStatus("ACCEPTED", "Pré-devis marqué comme accepté")}
          >
            <CheckIcon data-icon="inline-start" />
            Accepté
          </Button>
        </>
      ) : null}

      {status === "SENT" || status === "ACCEPTED" ? (
        <Button disabled={pending} onClick={convert}>
          <FileTextIcon data-icon="inline-start" />
          Convertir en devis
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
            {status === "DRAFT" ? (
              <DropdownMenuItem onSelect={convert}>
                <FileTextIcon />
                Convertir en devis
              </DropdownMenuItem>
            ) : null}
            {status === "SENT" || status === "DECLINED" ? (
              <DropdownMenuItem onSelect={() => setStatus("DRAFT", "Pré-devis remis en brouillon")}>
                <Undo2Icon />
                Remettre en brouillon
              </DropdownMenuItem>
            ) : null}
            {status === "ACCEPTED" ? (
              <DropdownMenuItem onSelect={() => setStatus("SENT", "Acceptation annulée")}>
                <Undo2Icon />
                Annuler l&apos;acceptation
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={() =>
                run(() => duplicatePreQuote({ id }), {
                  success: "Pré-devis dupliqué",
                  onSuccess: (copy) => router.push(`/pre-devis/${copy.id}/modifier`),
                })
              }
            >
              <CopyIcon />
              Dupliquer
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {!preQuote.hasQuotes ? (
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

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer le pré-devis ${preQuote.number} ?`}
        description="Cette action est définitive."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() =>
          run(() => deletePreQuote({ id }), {
            success: "Pré-devis supprimé",
            onSuccess: () => router.push("/pre-devis"),
          })
        }
      />
    </>
  );
}
