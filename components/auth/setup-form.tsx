"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { setupAccount } from "@/app/(auth)/setup/actions";
import { TextField } from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { MIN_PASSWORD_LENGTH, setupSchema, type SetupValues } from "@/lib/validation/auth";

export function SetupForm({ requiresToken }: { requiresToken: boolean }) {
  const { pending, run } = useAction();
  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      companyName: "SZ Dev",
      email: "",
      password: "",
      passwordConfirm: "",
      setupToken: "",
    },
  });

  function onSubmit(values: SetupValues) {
    run(() => setupAccount(values), {
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <TextField control={form.control} name="firstName" label="Prénom" autoComplete="given-name" autoFocus />
          <TextField control={form.control} name="lastName" label="Nom" autoComplete="family-name" />
        </div>
        <TextField
          control={form.control}
          name="companyName"
          label="Nom commercial"
          description="Affiché dans l'application et sur vos documents. Modifiable ensuite."
        />
        <TextField control={form.control} name="email" label="E-mail" type="email" autoComplete="email" />
        <TextField
          control={form.control}
          name="password"
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          description={`${MIN_PASSWORD_LENGTH} caractères minimum.`}
        />
        <TextField
          control={form.control}
          name="passwordConfirm"
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
        />
        {requiresToken ? (
          <TextField
            control={form.control}
            name="setupToken"
            label="Code de configuration"
            type="password"
            autoComplete="off"
            description="Valeur de la variable d'environnement SETUP_TOKEN."
          />
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Créer mon compte
        </Button>
      </FieldGroup>
    </form>
  );
}
