"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { TextField } from "@/components/shared/form-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginValues } from "@/lib/validation/auth";

/** N'accepte qu'un chemin interne, pour ne jamais rediriger vers un autre site. */
function safeRedirect(target: string | null): string {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setError(null);
    setPending(true);
    const { error: signInError } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: true,
    });
    if (signInError) {
      setPending(false);
      setError(
        signInError.status === 429
          ? "Trop de tentatives. Patientez quelques minutes avant de réessayer."
          : "E-mail ou mot de passe incorrect.",
      );
      return;
    }
    // Navigation complète : repart d'un état propre, cookies de session inclus.
    window.location.assign(safeRedirect(searchParams.get("from")));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <TextField
          control={form.control}
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          autoFocus
        />
        <TextField
          control={form.control}
          name="password"
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Se connecter
        </Button>
      </FieldGroup>
    </form>
  );
}
