import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { SetupForm } from "@/components/auth/setup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isAppConfigured } from "@/lib/server/organization";

export const metadata: Metadata = { title: "Première configuration" };

async function Setup() {
  // Toujours à la requête : l'état de la base ne se prérend pas au build.
  await connection();
  // La configuration n'est possible qu'une fois : tant qu'aucun compte n'existe.
  if (await isAppConfigured()) redirect("/login");
  return <SetupForm requiresToken={Boolean(process.env.SETUP_TOKEN)} />;
}

export default function SetupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Première configuration</CardTitle>
        <CardDescription>
          Créez le compte propriétaire. Aucun autre compte ne pourra être créé depuis cette page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Setup />
        </Suspense>
      </CardContent>
    </Card>
  );
}
