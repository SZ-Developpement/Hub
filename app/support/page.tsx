import { Building2, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SupportPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full flex flex-col gap-6 p-8">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Building2 className="size-8 text-muted-foreground" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold">Aucune organisation associée</h1>
          <p className="text-sm text-muted-foreground text-center">
            Votre compte n&apos;est rattaché à aucune organisation SZ Hub.
            Contactez votre administrateur pour être ajouté à une organisation.
          </p>
        </div>

        <div className="bg-muted rounded-xl p-4 text-sm flex flex-col gap-2">
          <p className="font-medium">Besoin d&apos;aide ?</p>
          <p className="text-muted-foreground">
            Envoyez un email à votre administrateur en précisant votre adresse
            email de connexion.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <Link href="mailto:contact@sz-core.fr">
              <Mail className="size-4 mr-2" />
              Contacter l&apos;administrateur
            </Link>
          </Button>

          <Button asChild variant="link">
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
