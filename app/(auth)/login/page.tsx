import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isAppConfigured } from "@/lib/server/organization";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Connexion" };

/** Déjà connecté → application ; aucun compte → première configuration. */
async function AuthGate() {
  if (await getSession()) redirect("/");
  if (!(await isAppConfigured())) redirect("/setup");
  return null;
}

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Accédez à votre espace de gestion.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <AuthGate />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-44" />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
