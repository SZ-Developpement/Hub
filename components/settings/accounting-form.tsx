"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { saveAccounting } from "@/app/(app)/parametres/actions";
import { IntegerField, MoneyField, SelectField } from "@/components/shared/form-fields";
import { SaveBar, SettingsSection } from "@/components/settings/section";
import { FieldGroup } from "@/components/ui/field";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { URSSAF_PERIODICITY_LABELS } from "@/lib/labels";
import { accountingSchema, type AccountingValues } from "@/lib/validation/settings";

export function AccountingForm({ defaultValues }: { defaultValues: AccountingValues }) {
  const { pending, run } = useAction();
  const form = useForm<AccountingValues>({
    resolver: zodResolver(accountingSchema),
    defaultValues,
  });

  function onSubmit(values: AccountingValues) {
    run(() => saveAccounting(values), {
      success: "Paramètres comptables enregistrés",
      onSuccess: () => form.reset(values),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <SettingsSection title="Déclarations URSSAF">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="urssafPeriodicity"
              label="Périodicité de déclaration"
              description="Les périodes déjà déclarées ne sont pas modifiées."
              options={(["MONTHLY", "QUARTERLY"] as const).map((value) => ({
                value,
                label: URSSAF_PERIODICITY_LABELS[value],
              }))}
            />
            <IntegerField
              control={form.control}
              name="urssafReminderDays"
              label="Rappel avant échéance"
              suffix="jours"
              min={0}
              max={60}
            />
          </div>
        </FieldGroup>
      </SettingsSection>

      <SettingsSection
        title="Plafond de chiffre d'affaires"
        description="Seuil au-delà duquel le régime micro-entrepreneur ne s'applique plus. Les plafonds sont révisés régulièrement : vérifiez la valeur en vigueur pour votre activité."
      >
        <FieldGroup>
          <MoneyField
            control={form.control}
            name="revenueCeilingCents"
            label="Plafond annuel"
            className="max-w-64"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <IntegerField
              control={form.control}
              name="ceilingWarningPct"
              label="Seuil d'alerte"
              suffix="%"
              min={1}
              max={100}
              description="Première alerte sur le tableau de bord."
            />
            <IntegerField
              control={form.control}
              name="ceilingCriticalPct"
              label="Seuil critique"
              suffix="%"
              min={1}
              max={100}
            />
          </div>
        </FieldGroup>
      </SettingsSection>

      <SettingsSection
        title="Franchise en base de TVA"
        description="Au-delà du seuil de base, la TVA devient applicable l'année suivante ; au-delà du seuil majoré, dès le dépassement. Mettez 0 pour ne pas suivre ces seuils."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField control={form.control} name="vatThresholdCents" label="Seuil de base" />
          <MoneyField control={form.control} name="vatUpperThresholdCents" label="Seuil majoré" />
        </div>
      </SettingsSection>

      <SettingsSection title="Alertes commerciales">
        <IntegerField
          control={form.control}
          name="quoteExpiryAlertDays"
          label="Devis proches de l'expiration"
          suffix="jours"
          min={0}
          max={60}
          description="Signale les devis envoyés dont la validité se termine dans ce délai."
          className="max-w-64"
        />
      </SettingsSection>

      <SaveBar pending={pending} dirty={form.formState.isDirty} onReset={() => form.reset()} />
    </form>
  );
}
