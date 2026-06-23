"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, ClipboardList } from "lucide-react";
import { InvoiceItemRow, type InvoiceItemValue } from "./invoice-item-row";
import { createInvoice, updateInvoice } from "@/server/actions/invoices";
import type { InvoiceType } from "@/generated/prisma/client";

type ClientOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; clientId: string | null };

type InvoiceFormProps = {
  clients: ClientOption[];
  projects: ProjectOption[];
  vatApplicable: boolean;
  vatRate: number | null;
  paymentDelay: number;
  invoice?: {
    id: string;
    type: InvoiceType;
    clientId: string;
    projectId: string | null;
    issuedAt: Date;
    dueAt: Date | null;
    notes: string | null;
    items: InvoiceItemValue[];
  };
};

const emptyItem = (): InvoiceItemValue => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

export function InvoiceForm({
  clients,
  projects,
  vatApplicable,
  vatRate,
  paymentDelay,
  invoice,
}: InvoiceFormProps) {
  const router = useRouter();
  const isEditing = Boolean(invoice);

  const [type, setType] = useState<InvoiceType>(invoice?.type ?? "QUOTE");
  const [clientId, setClientId] = useState(invoice?.clientId ?? "");
  const [projectId, setProjectId] = useState(invoice?.projectId ?? "");
  const [items, setItems] = useState<InvoiceItemValue[]>(
    invoice?.items ?? [emptyItem()],
  );
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Filtre les projets selon le client sélectionné
  const filteredProjects = clientId
    ? projects.filter((p) => p.clientId === clientId)
    : projects;

  // Calculs des totaux
  const totalHT = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const vatAmount = vatApplicable ? totalHT * ((vatRate ?? 20) / 100) : 0;
  const totalTTC = totalHT + vatAmount;

  function handleItemChange(
    index: number,
    field: keyof InvoiceItemValue,
    value: string | number,
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function handleAddItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setErrors({});

    const values = {
      type,
      clientId,
      projectId: projectId || "",
      issuedAt: formData.get("issuedAt") as string,
      dueAt: formData.get("dueAt") as string,
      notes: formData.get("notes") as string,
      items,
    };

    const result = isEditing
      ? await updateInvoice(invoice!.id, values)
      : await createInvoice(values);

    if (result.error) {
      setErrors(result.error as Record<string, string[]>);
      setPending(false);
      return;
    }

    router.push("/dashboard/invoices");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-8">
      {/* Type : Devis ou Facture */}
      <Field>
        <FieldLabel>Type de document</FieldLabel>
        <Tabs value={type} onValueChange={(v) => setType(v as InvoiceType)}>
          <TabsList>
            <TabsTrigger value="QUOTE" className="gap-2">
              <ClipboardList className="size-4" />
              Devis
            </TabsTrigger>
            <TabsTrigger value="INVOICE" className="gap-2">
              <FileText className="size-4" />
              Facture
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Field>

      {/* Client + Projet */}
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Client *</FieldLabel>
          <Select
            value={clientId}
            onValueChange={(v) => {
              setClientId(v);
              setProjectId(""); // reset le projet si on change de client
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.clientId && (
            <p className="text-xs text-destructive">{errors.clientId[0]}</p>
          )}
        </Field>

        <Field>
          <FieldLabel>Projet associé</FieldLabel>
          <Select
            value={projectId}
            onValueChange={setProjectId}
            disabled={!clientId || filteredProjects.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Aucun (optionnel)" />
            </SelectTrigger>
            <SelectContent>
              {filteredProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="issuedAt">Date d&apos;émission *</FieldLabel>
          <Input
            id="issuedAt"
            name="issuedAt"
            type="date"
            defaultValue={
              invoice
                ? toDateInputValue(invoice.issuedAt)
                : toDateInputValue(new Date())
            }
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="dueAt">
            Date d&apos;échéance
            <span className="text-xs text-muted-foreground">
              (délai standard : {paymentDelay} jours)
            </span>
          </FieldLabel>
          <Input
            id="dueAt"
            name="dueAt"
            type="date"
            defaultValue={invoice ? toDateInputValue(invoice.dueAt) : ""}
          />
        </Field>
      </div>

      {/* Lignes */}
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Description
          </p>
          <p className="text-xs font-medium text-muted-foreground">Quantité</p>
          <p className="text-xs font-medium text-muted-foreground">
            Prix unitaire HT
          </p>
          <p className="text-xs font-medium text-muted-foreground text-right">
            Total HT
          </p>
          <div />
        </div>

        {items.map((item, index) => (
          <InvoiceItemRow
            key={index}
            index={index}
            item={item}
            onChange={handleItemChange}
            onRemove={handleRemoveItem}
            canRemove={items.length > 1}
          />
        ))}

        {errors.items && (
          <p className="text-xs text-destructive">{errors.items[0]}</p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="gap-2"
        >
          <Plus className="size-4" />
          Ajouter une ligne
        </Button>
      </div>

      {/* Totaux */}
      <div className="border border-border rounded-xl p-4 space-y-2 bg-muted/30">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total HT</span>
          <span className="font-medium">{totalHT.toFixed(2)} €</span>
        </div>

        {vatApplicable ? (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              TVA ({vatRate ?? 20}%)
            </span>
            <span className="font-medium">{vatAmount.toFixed(2)} €</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            TVA non applicable, art. 293B du CGI
          </p>
        )}

        <div className="flex justify-between text-base font-bold border-t border-border pt-2">
          <span>Total TTC</span>
          <span>{totalTTC.toFixed(2)} €</span>
        </div>
      </div>

      {/* Notes */}
      <Field>
        <FieldLabel htmlFor="notes">Notes internes</FieldLabel>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Notes visibles uniquement en interne..."
          defaultValue={invoice?.notes ?? ""}
          className="resize-none"
          rows={3}
        />
      </Field>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/invoices")}
          disabled={pending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending
            ? isEditing
              ? "Modification..."
              : "Création..."
            : isEditing
              ? "Modifier"
              : "Créer"}
        </Button>
      </div>
    </form>
  );
}
