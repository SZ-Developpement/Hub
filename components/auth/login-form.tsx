"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordChanged = searchParams.get("passwordChanged") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      rememberMe: true,
      callbackURL: "/dashboard",
    });

    setIsLoading(false);

    if (signInError) {
      if (signInError.status === 403) {
        setError("Merci de vérifier votre email avant de vous connecter");
      } else {
        setError(signInError.message ?? "Email ou mot de passe incorrect");
      }
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Message de confirmation après changement de mot de passe */}
      {passwordChanged && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <CheckCircle className="size-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700">
            Mot de passe modifié avec succès. Reconnectez-vous pour continuer.
          </p>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Se connecter</CardTitle>
          <CardDescription>
            Entrez vos informations pour vous connecter à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Mot de passe oublié?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </Field>
              <Field>
                {error && <p>{error}</p>}
                <Button type="submit" size="lg" disabled={isLoading}>
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>
                <FieldDescription className="text-center">
                  Vous n&apos;avez pas de compte?{" "}
                  <Link href="/register">S&apos;inscrire</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
