"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BuildingIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";

import { createClient, updateClient } from "@/app/(app)/clients/actions";
import { IntegerField, TextareaField, TextField } from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { clientSchema, type ClientValues } from "@/lib/validation/clients";

type ClientFormProps = {
  /** Identifiant du client à modifier ; absent pour une création. */
  clientId?: string;
  defaultValues: ClientValues;
  defaultPaymentTermDays: number;
  /** Création depuis un autre formulaire : appelé à la place de la redirection. */
  onCreated?: (client: { id: string; name: string }) => void;
  onCancel?: () => void;
  /** Sans cartes ni titres, pour un affichage dans un dialogue. */
  compact?: boolean;
};

export function ClientForm({
  clientId,
  defaultValues,
  defaultPaymentTermDays,
  onCreated,
  onCancel,
  compact = false,
}: ClientFormProps) {
  const router = useRouter();
  const { pending, run } = useAction();
  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues,
  });
  const type = useWatch({ control: form.control, name: "type" });
  const isCompany = type === "COMPANY";

  function onSubmit(values: ClientValues) {
    if (clientId) {
      run(() => updateClient({ id: clientId, ...values }), {
        success: "Client enregistré",
        onSuccess: () => router.push(`/clients/${clientId}`),
        onError: (result) => applyFieldErrors(form, result),
      });
      return;
    }
    run(() => createClient(values), {
      success: "Client créé",
      onSuccess: (client) => (onCreated ? onCreated(client) : router.push(`/clients/${client.id}`)),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  const identity = (
    <FieldGroup>
      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <ToggleGroup
            type="single"
            variant="outline"
            value={field.value}
            onValueChange={(value) => {
              if (value) field.onChange(value);
            }}
            className="w-full sm:w-fit"
          >
            <ToggleGroupItem value="COMPANY" className="flex-1 sm:flex-none">
              <BuildingIcon />
              Professionnel
            </ToggleGroupItem>
            <ToggleGroupItem value="INDIVIDUAL" className="flex-1 sm:flex-none">
              <UserRoundIcon />
              Particulier
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      />
      <TextField
        control={form.control}
        name="name"
        label={isCompany ? "Raison sociale" : "Prénom et nom"}
        autoFocus={!clientId}
      />
      {isCompany ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="siret"
            label="SIREN ou SIRET"
            inputMode="numeric"
            description="9 ou 14 chiffres. Le SIREN du client est une mention obligatoire sur les factures entre professionnels."
          />
          <TextField control={form.control} name="vatNumber" label="N° de TVA intracommunautaire" />
        </div>
      ) : null}
    </FieldGroup>
  );

  const contact = (
    <FieldGroup>
      {isCompany ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="contactName" label="Interlocuteur" />
          <TextField control={form.control} name="contactRole" label="Fonction" />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={form.control} name="email" label="E-mail" type="email" />
        <TextField control={form.control} name="phone" label="Téléphone" type="tel" />
      </div>
    </FieldGroup>
  );

  const address = (
    <FieldGroup>
      <TextField control={form.control} name="addressLine1" label="Adresse" />
      <TextField control={form.control} name="addressLine2" label="Complément d'adresse" />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField control={form.control} name="postalCode" label="Code postal" />
        <TextField control={form.control} name="city" label="Ville" />
        <TextField control={form.control} name="country" label="Pays" />
      </div>
    </FieldGroup>
  );

  const extras = (
    <FieldGroup>
      <IntegerField
        control={form.control}
        name="paymentTermDays"
        label="Délai de paiement"
        suffix="jours"
        nullable
        min={0}
        max={120}
        placeholder={String(defaultPaymentTermDays)}
        description={`Laissez vide pour appliquer le délai par défaut (${defaultPaymentTermDays} jours).`}
        className="max-w-64"
      />
      <TextareaField
        control={form.control}
        name="notes"
        label="Notes internes"
        description="Jamais imprimées sur les documents."
      />
    </FieldGroup>
  );

  const actions = (
    <div className="flex justify-end gap-2">
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      ) : (
        <Button asChild variant="outline">
          <Link href={clientId ? `/clients/${clientId}` : "/clients"}>Annuler</Link>
        </Button>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {clientId ? "Enregistrer" : "Créer le client"}
      </Button>
    </div>
  );

  if (compact) {
    return (
      <form
        onSubmit={(event) => {
          // Formulaire imbriqué dans celui du document : ne pas soumettre le parent.
          event.stopPropagation();
          void form.handleSubmit(onSubmit)(event);
        }}
        noValidate
        className="space-y-5"
      >
        {identity}
        {contact}
        {address}
        {actions}
      </form>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent>{identity}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>{contact}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Adresse de facturation</CardTitle>
        </CardHeader>
        <CardContent>{address}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Facturation et notes</CardTitle>
        </CardHeader>
        <CardContent>{extras}</CardContent>
      </Card>
      {actions}
    </form>
  );
}
