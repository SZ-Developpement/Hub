"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EllipsisIcon, PaperclipIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  deleteExpense,
  deleteExpenseCategory,
  saveExpense,
  saveExpenseCategory,
} from "@/app/(app)/comptabilite/actions";
import { CategoryManager, type ManagedCategory } from "@/components/shared/category-manager";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DateField,
  MoneyField,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/shared/form-fields";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import { formatFileSize } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { expenseSchema, type ExpenseValues } from "@/lib/validation/accounting";

const RECEIPT_ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export type ExpenseCategoryOption = { id: string; name: string };

function ExpenseDialog({
  expense,
  receiptName,
  categories,
  today,
  open,
  onOpenChange,
}: {
  expense: ExpenseValues | null;
  /** Nom du justificatif déjà enregistré, le cas échéant. */
  receiptName: string | null;
  categories: ExpenseCategoryOption[];
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pending, run } = useAction();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const form = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense ?? {
      id: null,
      date: today,
      supplier: "",
      label: "",
      categoryId: categories[0]?.id ?? "",
      amountCents: 0,
      method: "CARD",
      notes: "",
    },
  });

  function onSubmit(values: ExpenseValues) {
    const data = new FormData();
    data.set("data", JSON.stringify(values));
    if (file) data.set("receipt", file);
    else if (removeReceipt) data.set("removeReceipt", "1");

    run(() => saveExpense(data), {
      success: expense ? "Dépense enregistrée" : "Dépense ajoutée",
      onSuccess: () => onOpenChange(false),
    });
  }

  const currentReceipt = file ? file.name : removeReceipt ? null : receiptName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle>
          <DialogDescription>
            Suivi personnel : en micro-entreprise, les dépenses ne sont pas déductibles du chiffre
            d&apos;affaires.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <DateField control={form.control} name="date" label="Date" max={today} />
              <MoneyField control={form.control} name="amountCents" label="Montant TTC" />
            </div>
            <TextField control={form.control} name="supplier" label="Fournisseur" autoFocus={!expense} />
            <TextField control={form.control} name="label" label="Objet" placeholder="Facultatif" />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                control={form.control}
                name="categoryId"
                label="Catégorie"
                options={categories.map((category) => ({ value: category.id, label: category.name }))}
              />
              <SelectField
                control={form.control}
                name="method"
                label="Moyen de paiement"
                options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>

            <Field>
              <FieldLabel htmlFor="expense-receipt">Justificatif</FieldLabel>
              <input
                ref={fileInput}
                id="expense-receipt"
                type="file"
                accept={RECEIPT_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  if (selected) {
                    setFile(selected);
                    setRemoveReceipt(false);
                  }
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  <PaperclipIcon data-icon="inline-start" />
                  {currentReceipt ? "Remplacer" : "Joindre un fichier"}
                </Button>
                {currentReceipt ? (
                  <span className="flex min-w-0 items-center gap-1 text-sm">
                    <span className="truncate">{currentReceipt}</span>
                    {file ? (
                      <span className="shrink-0 text-muted-foreground">({formatFileSize(file.size)})</span>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Retirer le justificatif"
                      onClick={() => {
                        setFile(null);
                        setRemoveReceipt(true);
                      }}
                    >
                      <XIcon />
                    </Button>
                  </span>
                ) : null}
              </div>
              <FieldDescription>PDF, PNG, JPG ou WebP — 4 Mo maximum.</FieldDescription>
            </Field>

            <TextareaField control={form.control} name="notes" label="Notes" rows={2} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {expense ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewExpenseButton({
  categories,
  today,
}: {
  categories: ExpenseCategoryOption[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={categories.length === 0}>
        <PlusIcon data-icon="inline-start" />
        Nouvelle dépense
      </Button>
      {open ? (
        <ExpenseDialog
          expense={null}
          receiptName={null}
          categories={categories}
          today={today}
          open
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}

export function ExpenseMenu({
  expense,
  receiptName,
  categories,
  today,
}: {
  expense: ExpenseValues & { id: string };
  receiptName: string | null;
  categories: ExpenseCategoryOption[];
  today: string;
}) {
  const { pending, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Actions sur la dépense" disabled={pending}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <PencilIcon />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2Icon />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editing ? (
        <ExpenseDialog
          expense={expense}
          receiptName={receiptName}
          categories={categories}
          today={today}
          open
          onOpenChange={setEditing}
        />
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer cette dépense ?"
        description="La dépense et son justificatif seront définitivement supprimés."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => run(() => deleteExpense({ id: expense.id }), { success: "Dépense supprimée" })}
      />
    </>
  );
}

export function ExpenseCategoriesButton({ categories }: { categories: ManagedCategory[] }) {
  return (
    <CategoryManager
      title="Catégories de dépenses"
      description="Elles ventilent vos dépenses sur le tableau de bord et dans les exports."
      categories={categories}
      actions={{ save: saveExpenseCategory, remove: deleteExpenseCategory }}
      itemLabel={(count) => `${count} dépense${count > 1 ? "s" : ""}`}
      deleteDescription="Une catégorie utilisée par des dépenses ne peut pas être supprimée."
    />
  );
}
