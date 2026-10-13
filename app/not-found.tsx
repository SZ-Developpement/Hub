import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <EmptyState
        icon={CompassIcon}
        title="Page introuvable"
        description="Cette page n'existe pas, ou l'élément a été supprimé."
        className="w-full max-w-md"
      >
        <Button asChild>
          <Link href="/">Retour au tableau de bord</Link>
        </Button>
      </EmptyState>
    </main>
  );
}
