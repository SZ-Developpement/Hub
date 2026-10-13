"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { removeDocumentImage, saveCompany, uploadDocumentImage } from "@/app/(app)/parametres/actions";
import { DateField, SelectField, TextField } from "@/components/shared/form-fields";
import { ImageUpload } from "@/components/settings/image-upload";
import { SaveBar, SettingsSection } from "@/components/settings/section";
import { FieldGroup } from "@/components/ui/field";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { LEGAL_FORMS } from "@/lib/labels";
import { companySchema, type CompanyValues } from "@/lib/validation/settings";

export function CompanyForm({
  defaultValues,
  signatureUrl,
}: {
  defaultValues: CompanyValues;
  signatureUrl: string | null;
}) {
  const { pending, run } = useAction();
  const form = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues,
  });

  // Conserve une forme juridique personnalisée déjà enregistrée dans la liste.
  const legalForms = [...new Set([...LEGAL_FORMS, defaultValues.legalForm].filter(Boolean))];

  function onSubmit(values: CompanyValues) {
    run(() => saveCompany(values), {
      success: "Informations de l'entreprise enregistrées",
      onSuccess: () => form.reset(values),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <SettingsSection
        title="Entreprise"
        description="Ces informations figurent sur tous vos devis et factures."
      >
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="companyName" label="Nom commercial" />
            <SelectField
              control={form.control}
              name="legalForm"
              label="Forme juridique"
              options={legalForms.map((value) => ({ value, label: value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              control={form.control}
              name="siret"
              label="SIRET"
              inputMode="numeric"
              placeholder="14 chiffres"
              description="Laissez vide tant qu'il n'est pas attribué : la mention « SIRET en cours d'attribution » sera imprimée."
              className="sm:col-span-2"
            />
            <TextField control={form.control} name="apeCode" label="Code APE" placeholder="6201Z" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="vatNumber"
              label="N° de TVA intracommunautaire"
              description="Facultatif en franchise en base de TVA."
            />
            <DateField
              control={form.control}
              name="activityStartDate"
              label="Début d'activité"
              description="Sert au prorata du plafond la première année et au calendrier URSSAF."
              clearable
            />
          </div>
        </FieldGroup>
      </SettingsSection>

      <SettingsSection title="Adresse et contact">
        <FieldGroup>
          <TextField control={form.control} name="addressLine1" label="Adresse" autoComplete="address-line1" />
          <TextField
            control={form.control}
            name="addressLine2"
            label="Complément d'adresse"
            autoComplete="address-line2"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField control={form.control} name="postalCode" label="Code postal" autoComplete="postal-code" />
            <TextField control={form.control} name="city" label="Ville" autoComplete="address-level2" />
            <TextField control={form.control} name="country" label="Pays" autoComplete="country-name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField control={form.control} name="email" label="E-mail" type="email" />
            <TextField control={form.control} name="phone" label="Téléphone" type="tel" />
            <TextField control={form.control} name="website" label="Site web" placeholder="szdev.fr" />
          </div>
        </FieldGroup>
      </SettingsSection>

      <SettingsSection
        title="Votre identité"
        description="Nom, fonction et signature apposés sur les documents. Pour un entrepreneur individuel, le nom suivi de « EI » est une mention obligatoire."
      >
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField control={form.control} name="ownerFirstName" label="Prénom" />
            <TextField control={form.control} name="ownerLastName" label="Nom" />
            <TextField control={form.control} name="ownerTitle" label="Fonction" placeholder="Fondateur" />
          </div>
          <ImageUpload
            label="Signature"
            description="PNG, JPG ou SVG — 4 Mo max. Un fond transparent donne le meilleur rendu."
            imageUrl={signatureUrl}
            uploadedMessage="Signature enregistrée"
            onUpload={(file) => {
              const data = new FormData();
              data.set("kind", "SIGNATURE");
              data.set("file", file);
              return uploadDocumentImage(data);
            }}
            onRemove={() => removeDocumentImage({ kind: "SIGNATURE" })}
          />
        </FieldGroup>
      </SettingsSection>

      <SettingsSection
        title="Coordonnées bancaires"
        description="Imprimées sur les factures pour les règlements par virement."
      >
        <FieldGroup>
          <TextField
            control={form.control}
            name="iban"
            label="IBAN"
            placeholder="FR76 …"
            className="font-mono"
            spellCheck={false}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="bic" label="BIC" spellCheck={false} />
            <TextField control={form.control} name="bankName" label="Banque" />
          </div>
        </FieldGroup>
      </SettingsSection>

      <SaveBar pending={pending} dirty={form.formState.isDirty} onReset={() => form.reset()} />
    </form>
  );
}
