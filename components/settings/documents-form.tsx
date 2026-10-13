"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";

import { removeDocumentImage, saveDocuments, uploadDocumentImage } from "@/app/(app)/parametres/actions";
import { ColorField } from "@/components/shared/color-field";
import {
  FormField,
  IntegerField,
  PercentField,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
} from "@/components/shared/form-fields";
import { ImageUpload } from "@/components/settings/image-upload";
import { PdfPreview } from "@/components/settings/pdf-preview";
import { SaveBar, SettingsSection } from "@/components/settings/section";
import { FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DocumentKind } from "@/generated/prisma/enums";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { DOC_FONT_LABELS, DOCUMENT_KIND_LABELS, YEAR_FORMAT_LABELS } from "@/lib/labels";
import { DOCUMENT_KINDS, formatDocumentNumber } from "@/lib/numbering";
import {
  documentsSchema,
  type DocumentPreviewValues,
  type DocumentsValues,
} from "@/lib/validation/settings";

const SEPARATORS = [
  { value: "-", label: "Tiret ( - )" },
  { value: "/", label: "Barre ( / )" },
  { value: ".", label: "Point ( . )" },
  { value: "", label: "Aucun" },
];

const PREVIEW_LABELS: Record<DocumentKind, string> = {
  INVOICE: "Facture",
  QUOTE: "Devis",
  PRE_QUOTE: "Pré-devis",
  CREDIT_NOTE: "Avoir",
};

const DISPLAY_OPTIONS = [
  { name: "docShowLogo", label: "Logo", description: "Sinon, le nom commercial est imprimé à la place." },
  { name: "docShowSignature", label: "Signature", description: "L'image importée dans l'onglet Entreprise." },
  { name: "docShowOwnerName", label: "Nom et fonction du signataire" },
  { name: "docShowIban", label: "Coordonnées bancaires (IBAN / BIC)", description: "Sur les factures uniquement." },
  { name: "docShowEmail", label: "E-mail" },
  { name: "docShowPhone", label: "Téléphone" },
  { name: "docShowWebsite", label: "Site web" },
] as const;

function NumberingRow({
  control,
  kind,
  year,
}: {
  control: Control<DocumentsValues>;
  kind: DocumentKind;
  year: number;
}) {
  const values = useWatch({ control, name: `numbering.${kind}` });
  const preview = formatDocumentNumber(
    {
      prefix: (values?.prefix ?? "").toUpperCase(),
      separator: values?.separator ?? "-",
      yearFormat: values?.yearFormat ?? "YYYY",
      digits: Math.min(Math.max(values?.digits ?? 4, 2), 8),
    },
    year,
    values?.nextNumber ?? 1,
  );

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{DOCUMENT_KIND_LABELS[kind]}</p>
        <p className="text-sm text-muted-foreground">
          Prochain numéro : <span className="font-mono font-medium text-foreground">{preview}</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <TextField
          control={control}
          name={`numbering.${kind}.prefix`}
          label="Préfixe"
          className="uppercase"
          maxLength={10}
        />
        <FormField control={control} name={`numbering.${kind}.separator`} label="Séparateur">
          {({ field, id }) => (
            <Select
              value={field.value === "" ? "none" : String(field.value)}
              onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
            >
              <SelectTrigger id={id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEPARATORS.map((separator) => (
                  <SelectItem key={separator.value || "none"} value={separator.value || "none"}>
                    {separator.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <SelectField
          control={control}
          name={`numbering.${kind}.yearFormat`}
          label="Année"
          options={(["YYYY", "YY", "NONE"] as const).map((value) => ({
            value,
            label: YEAR_FORMAT_LABELS[value],
          }))}
        />
        <IntegerField control={control} name={`numbering.${kind}.digits`} label="Chiffres" min={2} max={8} />
        <IntegerField control={control} name={`numbering.${kind}.nextNumber`} label="Prochain n°" min={1} />
      </div>
    </div>
  );
}

export function DocumentsForm({
  defaultValues,
  logoFileId,
  signatureFileId,
  year,
}: {
  defaultValues: DocumentsValues;
  logoFileId: string | null;
  signatureFileId: string | null;
  year: number;
}) {
  const { pending, run } = useAction();
  const form = useForm<DocumentsValues>({
    resolver: zodResolver(documentsSchema),
    defaultValues,
  });
  const [previewKind, setPreviewKind] = useState<DocumentKind>("INVOICE");
  const values = useWatch({ control: form.control }) as DocumentsValues;

  function onSubmit(submitted: DocumentsValues) {
    run(() => saveDocuments(submitted), {
      success: "Paramètres des documents enregistrés",
      onSuccess: () => form.reset(submitted),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  const numbering = values.numbering[previewKind];
  const isQuote = previewKind === "QUOTE";
  const previewRequest: DocumentPreviewValues = {
    kind: previewKind,
    number: formatDocumentNumber(
      { ...numbering, prefix: numbering.prefix.toUpperCase(), digits: Math.min(Math.max(numbering.digits, 2), 8) },
      year,
      numbering.nextNumber || 1,
    ),
    notes: previewKind === "PRE_QUOTE" ? "" : isQuote ? values.quoteDefaultNotes : values.invoiceDefaultNotes,
    terms: previewKind === "PRE_QUOTE" ? "" : isQuote ? values.quoteDefaultTerms : values.invoiceDefaultTerms,
    docPrimaryColor: values.docPrimaryColor,
    docFont: values.docFont,
    docShowLogo: values.docShowLogo,
    docShowSignature: values.docShowSignature,
    docShowOwnerName: values.docShowOwnerName,
    docShowIban: values.docShowIban,
    docShowEmail: values.docShowEmail,
    docShowPhone: values.docShowPhone,
    docShowWebsite: values.docShowWebsite,
    docHeaderText: values.docHeaderText,
    docFooterText: values.docFooterText,
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] xl:items-start"
    >
      <div className="space-y-6">
        <SettingsSection
          title="Identité visuelle"
          description="Indépendante de l'apparence de l'application : vos documents gardent leur propre charte."
        >
          <FieldGroup>
            <ImageUpload
              label="Logo des documents"
              description="PNG, JPG ou SVG — 4 Mo max. Redimensionné automatiquement."
              imageUrl={logoFileId ? `/api/files/${logoFileId}` : null}
              uploadedMessage="Logo enregistré"
              onUpload={(file) => {
                const data = new FormData();
                data.set("kind", "DOCUMENT_LOGO");
                data.set("file", file);
                return uploadDocumentImage(data);
              }}
              onRemove={() => removeDocumentImage({ kind: "DOCUMENT_LOGO" })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField control={form.control} name="docPrimaryColor" label="Couleur principale" />
              <SelectField
                control={form.control}
                name="docFont"
                label="Police"
                options={Object.entries(DOC_FONT_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
          </FieldGroup>
        </SettingsSection>

        <SettingsSection
          title="Informations affichées"
          description="Les mentions légales obligatoires (identité, SIRET, adresse) sont toujours imprimées."
        >
          <FieldGroup className="gap-4">
            {DISPLAY_OPTIONS.map((option) => (
              <SwitchField
                key={option.name}
                control={form.control}
                name={option.name}
                label={option.label}
                description={"description" in option ? option.description : undefined}
              />
            ))}
          </FieldGroup>
        </SettingsSection>

        <SettingsSection title="En-tête et pied de page">
          <FieldGroup>
            <TextareaField
              control={form.control}
              name="docHeaderText"
              label="Texte d'en-tête"
              description="Sous le logo : slogan, spécialité…"
              rows={2}
            />
            <TextareaField
              control={form.control}
              name="docFooterText"
              label="Texte de pied de page"
              description="Au-dessus de la ligne d'identité légale, sur chaque page."
              rows={2}
            />
          </FieldGroup>
        </SettingsSection>

        <SettingsSection title="Devis" description="Valeurs proposées à la création, modifiables sur chaque devis.">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <IntegerField
                control={form.control}
                name="quoteValidityDays"
                label="Durée de validité"
                suffix="jours"
                min={1}
                max={365}
              />
              <PercentField
                control={form.control}
                name="quoteDefaultDepositRateBp"
                label="Acompte à la commande"
                description="0 pour ne pas demander d'acompte."
              />
            </div>
            <TextareaField control={form.control} name="quoteDefaultNotes" label="Notes par défaut" />
            <TextareaField control={form.control} name="quoteDefaultTerms" label="Conditions par défaut" rows={4} />
          </FieldGroup>
        </SettingsSection>

        <SettingsSection title="Factures" description="Valeurs proposées à la création, modifiables sur chaque brouillon.">
          <FieldGroup>
            <TextareaField control={form.control} name="invoiceDefaultNotes" label="Notes par défaut" />
            <TextareaField control={form.control} name="invoiceDefaultTerms" label="Conditions par défaut" rows={4} />
          </FieldGroup>
        </SettingsSection>

        <SettingsSection
          title="Numérotation"
          description="Changer un format ne modifie jamais un document déjà numéroté et la série continue sans interruption. Le prochain numéro peut être avancé (reprise d'une numérotation existante), jamais reculé."
        >
          <div className="space-y-3">
            {DOCUMENT_KINDS.map((kind) => (
              <NumberingRow key={kind} control={form.control} kind={kind} year={year} />
            ))}
          </div>
        </SettingsSection>

        <SaveBar pending={pending} dirty={form.formState.isDirty} onReset={() => form.reset()} />
      </div>

      <div className="space-y-3 xl:sticky xl:top-16">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Aperçu en direct</p>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={previewKind}
            onValueChange={(value) => {
              if (value) setPreviewKind(value as DocumentKind);
            }}
          >
            {(["INVOICE", "QUOTE", "PRE_QUOTE", "CREDIT_NOTE"] as const).map((kind) => (
              <ToggleGroupItem key={kind} value={kind}>
                {PREVIEW_LABELS[kind]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <PdfPreview request={previewRequest} refreshKey={`${logoFileId}-${signatureFileId}`} />
      </div>
    </form>
  );
}
