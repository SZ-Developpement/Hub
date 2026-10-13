"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { createQuote, updateQuote } from "@/app/(app)/devis/actions";
import { ClientSelect, type ClientChoice } from "@/components/documents/client-select";
import { LineItemsEditor, type CatalogChoice } from "@/components/documents/line-items-editor";
import { DiscountFields, TotalsSummary } from "@/components/documents/totals";
import {
  DateField,
  FormField,
  PercentField,
  TextareaField,
  TextField,
} from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { quoteSchema, type QuoteValues } from "@/lib/validation/documents";

export function QuoteForm({
  quoteId,
  number,
  preQuoteId = null,
  defaultValues,
  clients,
  catalog,
  defaultPaymentTermDays,
  vatMention,
}: {
  quoteId?: string;
  number?: string;
  preQuoteId?: string | null;
  defaultValues: QuoteValues;
  clients: ClientChoice[];
  catalog: CatalogChoice[];
  defaultPaymentTermDays: number;
  vatMention: string;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const form = useForm<QuoteValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues,
  });

  function onSubmit(values: QuoteValues) {
    if (quoteId) {
      run(() => updateQuote({ id: quoteId, ...values }), {
        success: "Devis enregistré",
        onSuccess: () => router.push(`/devis/${quoteId}`),
        onError: (result) => applyFieldErrors(form, result),
      });
      return;
    }
    run(() => createQuote({ ...values, preQuoteId }), {
      success: "Devis créé",
      onSuccess: ({ id }) => router.push(`/devis/${id}`),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client et objet</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <FormField control={form.control} name="clientId" label="Client">
                {({ field, fieldState, id }) => (
                  <ClientSelect
                    id={id}
                    value={field.value}
                    onChange={(clientId) => field.onChange(clientId)}
                    clients={clients}
                    defaultPaymentTermDays={defaultPaymentTermDays}
                    invalid={fieldState.invalid}
                  />
                )}
              </FormField>
              <TextField
                control={form.control}
                name="title"
                label="Objet"
                placeholder="Ex. : refonte du site vitrine"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField control={form.control} name="issueDate" label="Date du devis" />
                <DateField control={form.control} name="validUntil" label="Valable jusqu'au" />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prestations</CardTitle>
          </CardHeader>
          <CardContent>
            <LineItemsEditor form={form} catalog={catalog} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <PercentField
                control={form.control}
                name="depositRateBp"
                label="Acompte à la commande"
                description="Imprimé sur le devis. 0 pour ne pas demander d'acompte."
                className="max-w-56"
              />
              <TextareaField control={form.control} name="notes" label="Notes" />
              <TextareaField control={form.control} name="terms" label="Conditions" rows={4} />
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-16">
        <Card>
          <CardHeader>
            <CardTitle>{number ? `Devis ${number}` : "Récapitulatif"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <DiscountFields form={form} />
            <TotalsSummary control={form.control} finalLabel="Total HT" vatMention={vatMention} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {quoteId ? "Enregistrer" : "Créer le devis"}
          </Button>
          <Button asChild variant="outline">
            <Link href={quoteId ? `/devis/${quoteId}` : "/devis"}>Annuler</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
