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
import Link from "next/link";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>
          Créez un compte pour accéder à toutes les fonctionnalités de notre
          application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nom complet</FieldLabel>
              <Input id="name" type="text" placeholder="John Doe" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
              <FieldDescription>
                Nous utiliserons cette adresse pour vous contacter. Nous ne la
                partagerons avec personne d&pos;autre.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <Input id="password" type="password" required />
              <FieldDescription>Minimum 8 caractères.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirmer le mot de passe
              </FieldLabel>
              <Input id="confirm-password" type="password" required />
              <FieldDescription>
                Veuillez confirmer votre mot de passe.
              </FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" size="lg">
                  Créer un compte
                </Button>
                <Button variant="outline" type="button" size="lg">
                  S&apos;inscrire avec Google
                </Button>
                <FieldDescription className="px-6 text-center">
                  Vous avez déjà un compte?{" "}
                  <Link href="/login">Se connecter</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
