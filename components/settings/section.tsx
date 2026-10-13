import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Barre d'enregistrement d'un formulaire de paramètres. */
export function SaveBar({
  pending,
  dirty,
  onReset,
  className,
}: {
  pending: boolean;
  dirty: boolean;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      {dirty ? (
        <span className="mr-auto text-sm text-muted-foreground">Modifications non enregistrées</span>
      ) : null}
      {onReset ? (
        <Button type="button" variant="ghost" disabled={!dirty || pending} onClick={onReset}>
          Annuler
        </Button>
      ) : null}
      <Button type="submit" disabled={!dirty || pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Enregistrer
      </Button>
    </div>
  );
}
