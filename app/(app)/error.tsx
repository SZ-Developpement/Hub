"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer size="narrow">
      <EmptyState
        icon={TriangleAlertIcon}
        title="Une erreur est survenue"
        description={
          <>
            Cette page n&apos;a pas pu s&apos;afficher. Vos données ne sont pas affectées.
            {error.digest ? <span className="mt-1 block text-xs">Référence : {error.digest}</span> : null}
          </>
        }
      >
        <Button onClick={reset}>Réessayer</Button>
      </EmptyState>
    </PageContainer>
  );
}
