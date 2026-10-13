"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

import { createInvoice, updateInvoice } from "@/app/(app)/factures/actions";
import { ClientSelect, type ClientChoice } from "@/components/documents/client-select";
import { LineItemsEditor, type CatalogChoice } from "@/components/documents/line-items-editor";
import { DiscountFields, TotalsSummary } from "@/components/documents/totals";
import {
  DateField,
  FormField,
  IntegerField,
  TextareaField,
  TextField,
} from "@/components/shared/form-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { addDays, isValidISODate, toDate, toISO } from "@/lib/dates";
import { invoiceSchema, type InvoiceValues } from "@/lib/validation/documents";

export function InvoiceForm({
  invoiceId,
  defaultValues,
  clients,
  catalog,
  defaultPaymentTermDays,
  vatMention,
  deposits = [],
  notice,
}: {
  invoiceId?: string;
  defaultValues: InvoiceValues;
  clients: ClientChoice[];
  catalog: CatalogChoice[];
  defaultPaymentTermDays: number;
  vatMention: string;
  /** Acomptes déduits (facture de solde) — non modifiables ici. */
  deposits?: { label: string; amountCents: number }[];
  /** Rappel du contexte : facture d'acompte, de solde… */
  notice?: string;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const form = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
  });

  // L'échéance suit la date d'émission et le délai de paiement ; elle reste modifiable ensuite.
  const [issueDate, paymentTermDays] = useWatch({
    control: form.control,
    name: ["issueDate", "paymentTermDays"],
  });
  const lastTerms = useRef({ issueDate, paymentTermDays });
  useEffect(() => {
    const last = lastTerms.current;
    // Rien au montage : l'échéance enregistrée (peut-être ajustée à la main) est conservée.
    if (last.issueDate === issueDate && last.paymentTermDays === paymentTermDays) return;
    lastTerms.current = { issueDate, paymentTermDays };
    if (!isValidISODate(issueDate) || typeof paymentTermDays !== "number") return;
    form.setValue("dueDate", toISO(addDays(toDate(issueDate), paymentTermDays)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [issueDate, paymentTermDays, form]);

  function onClientChange(client: ClientChoice) {
    form.setValue("paymentTermDays", client.paymentTermDays ?? defaultPaymentTermDays, {
      shouldDirty: true,
    });
  }

  function onSubmit(values: InvoiceValues) {
    if (invoiceId) {
      run(() => updateInvoice({ id: invoiceId, ...values }), {
        success: "Brouillon enregistré",
        onSuccess: () => router.push(`/factures/${invoiceId}`),
        onError: (result) => applyFieldErrors(form, result),
      });
      return;
    }
    run(() => createInvoice(values), {
      success: "Facture créée en brouillon",
      onSuccess: ({ id }) => router.push(`/factures/${id}`),
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
        {notice ? (
          <Alert>
            <InfoIcon />
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

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
                    onChange={(clientId, client) => {
                      field.onChange(clientId);
                      onClientChange(client);
                    }}
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
                placeholder="Ex. : développement de l'espace client"
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
            <CardDescription>
              La date d&apos;émission définitive est confirmée au moment d&apos;émettre la facture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-3">
                <DateField control={form.control} name="issueDate" label="Date d'émission" />
                <IntegerField
                  control={form.control}
                  name="paymentTermDays"
                  label="Délai de paiement"
                  suffix="jours"
                  min={0}
                  max={120}
                />
                <DateField control={form.control} name="dueDate" label="Échéance" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  control={form.control}
                  name="serviceStart"
                  label="Date de prestation"
                  description="Mention obligatoire : date ou début de la période de réalisation."
                  clearable
                />
                <DateField
                  control={form.control}
                  name="serviceEnd"
                  label="Fin de prestation"
                  description="À renseigner pour une période."
                  clearable
                />
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
            <CardTitle>Notes et conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextareaField control={form.control} name="notes" label="Notes" />
              <TextareaField control={form.control} name="terms" label="Conditions" rows={4} />
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-16">
        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <DiscountFields form={form} />
            <TotalsSummary
              control={form.control}
              deposits={deposits}
              finalLabel="Net à payer"
              vatMention={vatMention}
            />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {invoiceId ? "Enregistrer le brouillon" : "Créer le brouillon"}
          </Button>
          <Button asChild variant="outline">
            <Link href={invoiceId ? `/factures/${invoiceId}` : "/factures"}>Annuler</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Un brouillon n&apos;a pas de numéro et reste modifiable. Le numéro définitif est attribué
          à l&apos;émission.
        </p>
      </div>
    </form>
  );
}
