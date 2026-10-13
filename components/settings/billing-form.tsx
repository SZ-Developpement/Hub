"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import { saveBilling } from "@/app/(app)/parametres/actions";
import {
  IntegerField,
  MoneyField,
  SwitchField,
  TextareaField,
  TextField,
} from "@/components/shared/form-fields";
import { SaveBar, SettingsSection } from "@/components/settings/section";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { billingSchema, type BillingValues } from "@/lib/validation/settings";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export function BillingForm({ defaultValues }: { defaultValues: BillingValues }) {
  const { pending, run } = useAction();
  const form = useForm<BillingValues>({
    resolver: zodResolver(billingSchema),
    defaultValues,
  });
  const recoveryFeeEnabled = useWatch({ control: form.control, name: "recoveryFeeEnabled" });

  function onSubmit(values: BillingValues) {
    run(() => saveBilling(values), {
      success: "Paramètres de facturation enregistrés",
      onSuccess: () => form.reset(values),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <SettingsSection
        title="TVA"
        description="En franchise en base, aucune TVA n'est facturée et la mention ci-dessous est obligatoire."
      >
        <FieldGroup>
          <TextField control={form.control} name="vatMention" label="Mention de TVA" />
          <TextField
            control={form.control}
            name="operationNature"
            label="Nature des opérations"
            description="Mention obligatoire : livraison de biens, prestation de services, ou les deux."
          />
        </FieldGroup>
      </SettingsSection>

      <SettingsSection title="Conditions de paiement" description="Appliquées par défaut aux nouveaux devis et factures.">
        <FieldGroup>
          <IntegerField
            control={form.control}
            name="paymentTermDays"
            label="Délai de paiement"
            suffix="jours"
            min={0}
            max={120}
            description="0 = paiement à réception. Peut être ajusté par client et par facture."
            className="max-w-56"
          />
          <Controller
            control={form.control}
            name="acceptedPaymentMethods"
            render={({ field, fieldState }) => (
              <FieldSet data-invalid={fieldState.invalid}>
                <FieldLegend variant="label">Moyens de paiement acceptés</FieldLegend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {METHODS.map((method) => (
                    <Field key={method} orientation="horizontal">
                      <Checkbox
                        id={`method-${method}`}
                        checked={field.value.includes(method)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...field.value, method]
                              : field.value.filter((value) => value !== method),
                          )
                        }
                      />
                      <FieldLabel htmlFor={`method-${method}`} className="font-normal">
                        {PAYMENT_METHOD_LABELS[method]}
                      </FieldLabel>
                    </Field>
                  ))}
                </div>
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </FieldSet>
            )}
          />
          <TextField
            control={form.control}
            name="earlyPaymentDiscountText"
            label="Escompte pour paiement anticipé"
            description="Mention obligatoire entre professionnels, même en l'absence d'escompte."
          />
        </FieldGroup>
      </SettingsSection>

      <SettingsSection
        title="Retard de paiement"
        description="Mentions obligatoires sur les factures adressées à des professionnels."
      >
        <FieldGroup>
          <TextareaField control={form.control} name="latePenaltyText" label="Pénalités de retard" />
          <SwitchField
            control={form.control}
            name="recoveryFeeEnabled"
            label="Indemnité forfaitaire de recouvrement"
            description="Imprimée uniquement pour les clients professionnels."
          />
          {recoveryFeeEnabled ? (
            <MoneyField
              control={form.control}
              name="recoveryFeeCents"
              label="Montant de l'indemnité"
              description="Fixé par décret à 40 € ; à ajuster si le montant légal évolue."
              className="max-w-56"
            />
          ) : null}
        </FieldGroup>
      </SettingsSection>

      <SettingsSection title="Mentions complémentaires">
        <TextareaField
          control={form.control}
          name="legalMentions"
          label="Texte libre"
          description="Imprimé en bas des devis et factures : assurance professionnelle, médiateur de la consommation, etc."
          rows={4}
        />
      </SettingsSection>

      <SaveBar pending={pending} dirty={form.formState.isDirty} onReset={() => form.reset()} />
    </form>
  );
}
