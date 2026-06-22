"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/server/actions/auth";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setPending(true);
    setError(null);

    const result = await changePassword(currentPassword, newPassword);

    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    window.location.href = "/login?passwordChanged=true";
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="currentPassword">Mot de passe actuel</FieldLabel>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            placeholder="Entrez votre mot de passe actuel"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="newPassword">Nouveau mot de passe</FieldLabel>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="8 caractères minimum"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">
            Confirmer le mot de passe
          </FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Répétez le mot de passe"
            required
          />
        </Field>

        {error && (
          <FieldDescription className="text-sm text-destructive">
            {error}
          </FieldDescription>
        )}
      </FieldGroup>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Mise à jour..." : "Définir le nouveau mot de passe"}
      </Button>
    </form>
  );
}
