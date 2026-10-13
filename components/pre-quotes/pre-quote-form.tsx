"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalculatorIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import { createPreQuote, updatePreQuote } from "@/app/(app)/pre-devis/actions";
import { ClientSelect, type ClientChoice } from "@/components/documents/client-select";
import {
  DateField,
  FormField,
  MoneyField,
  TextareaField,
  TextField,
} from "@/components/shared/form-fields";
import { QuantityInput } from "@/components/shared/number-inputs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { formatMoney, formatQuantity } from "@/lib/format";
import { lineTotalCents } from "@/lib/money";
import { preQuoteSchema, type PreQuoteValues } from "@/lib/validation/documents";

/** Arrondit un montant (centimes) à la cinquantaine d'euros. */
function roundTo50(cents: number, direction: "down" | "up"): number {
  const step = 5000;
  return (direction === "down" ? Math.floor(cents / step) : Math.ceil(cents / step)) * step;
}

export function PreQuoteForm({
  preQuoteId,
  defaultValues,
  clients,
  defaultPaymentTermDays,
}: {
  preQuoteId?: string;
  defaultValues: PreQuoteValues;
  clients: ClientChoice[];
  defaultPaymentTermDays: number;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const form = useForm<PreQuoteValues>({
    resolver: zodResolver(preQuoteSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" });
  const dailyRateCents = useWatch({ control: form.control, name: "dailyRateCents" });

  const totalDaysMilli = (items ?? []).reduce((sum, item) => sum + (item?.daysMilli || 0), 0);
  const baseCents = lineTotalCents(totalDaysMilli, dailyRateCents ?? 0);

  function suggestRange() {
    form.setValue("priceMinCents", roundTo50(baseCents * 0.9, "down"), { shouldDirty: true });
    form.setValue("priceMaxCents", roundTo50(baseCents * 1.2, "up"), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function onSubmit(values: PreQuoteValues) {
    if (preQuoteId) {
      run(() => updatePreQuote({ id: preQuoteId, ...values }), {
        success: "Pré-devis enregistré",
        onSuccess: () => router.push(`/pre-devis/${preQuoteId}`),
        onError: (result) => applyFieldErrors(form, result),
      });
      return;
    }
    run(() => createPreQuote(values), {
      success: "Pré-devis créé",
      onSuccess: ({ id }) => router.push(`/pre-devis/${id}`),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client et objet</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
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
              <DateField control={form.control} name="issueDate" label="Date" />
            </div>
            <TextField
              control={form.control}
              name="title"
              label="Objet"
              placeholder="Ex. : application de prise de rendez-vous"
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Besoin du client</CardTitle>
          <CardDescription>Le contexte et l&apos;objectif, tels que le client les a formulés.</CardDescription>
        </CardHeader>
        <CardContent>
          <TextareaField control={form.control} name="need" rows={4} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalités et estimation</CardTitle>
          <CardDescription>
            Une ligne par fonctionnalité, avec la charge estimée en jours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_7rem_2rem] sm:items-start"
            >
              <div className="space-y-2">
                <Controller
                  control={form.control}
                  name={`items.${index}.label`}
                  render={({ field: input, fieldState }) => (
                    <Input
                      {...input}
                      placeholder="Fonctionnalité"
                      aria-label={`Fonctionnalité ${index + 1}`}
                      aria-invalid={fieldState.invalid}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field: input }) => (
                    <Input
                      {...input}
                      placeholder="Précisions (facultatif)"
                      aria-label={`Précisions sur la fonctionnalité ${index + 1}`}
                      className="text-sm"
                    />
                  )}
                />
              </div>
              <Controller
                control={form.control}
                name={`items.${index}.daysMilli`}
                render={({ field: input }) => (
                  <QuantityInput
                    value={input.value}
                    onChange={(value) => input.onChange(value ?? 0)}
                    onBlur={input.onBlur}
                    suffix="j"
                    aria-label={`Jours estimés pour la fonctionnalité ${index + 1}`}
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Supprimer la fonctionnalité"
                onClick={() => remove(index)}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ label: "", description: "", daysMilli: 0 })}
            >
              <PlusIcon data-icon="inline-start" />
              Ajouter une fonctionnalité
            </Button>
            <p className="text-sm text-muted-foreground">
              Charge totale :{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatQuantity(totalDaysMilli)} jour{totalDaysMilli > 1000 ? "s" : ""}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fourchette de prix</CardTitle>
          <CardDescription>
            Indiquez un TJM pour calculer une fourchette (−10 % / +20 % autour de la charge estimée),
            ou saisissez-la directement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[12rem_auto] sm:items-end">
              <MoneyField
                control={form.control}
                name="dailyRateCents"
                label="TJM de référence"
                nullable
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={baseCents <= 0}
                  onClick={suggestRange}
                >
                  <CalculatorIcon data-icon="inline-start" />
                  Calculer la fourchette
                </Button>
                {baseCents > 0 ? (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    Base : {formatMoney(baseCents)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField control={form.control} name="priceMinCents" label="Prix minimum HT" />
              <MoneyField control={form.control} name="priceMaxCents" label="Prix maximum HT" />
            </div>
            <TextareaField
              control={form.control}
              name="notes"
              label="Notes"
              description="Hypothèses, exclusions, délais… Imprimées sur le pré-devis."
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={preQuoteId ? `/pre-devis/${preQuoteId}` : "/pre-devis"}>Annuler</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {preQuoteId ? "Enregistrer" : "Créer le pré-devis"}
        </Button>
      </div>
    </form>
  );
}
