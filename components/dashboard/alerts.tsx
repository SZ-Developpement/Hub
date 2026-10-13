import { BellIcon, CircleAlertIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Alert } from "@/lib/server/alerts";
import { cn } from "@/lib/utils";

// Un état n'est jamais porté par la seule couleur : chaque alerte a son icône et son libellé.
const SEVERITY = {
  danger: { icon: CircleAlertIcon, className: "text-destructive" },
  warning: { icon: TriangleAlertIcon, className: "text-warning" },
  info: { icon: InfoIcon, className: "text-info" },
} as const;

export function AlertList({ alerts, className }: { alerts: Alert[]; className?: string }) {
  return (
    <ul className={cn("divide-y", className)}>
      {alerts.map((alert) => {
        const { icon: Icon, className: tone } = SEVERITY[alert.severity];
        return (
          <li key={alert.id}>
            <Link
              href={alert.href}
              className="flex items-start gap-3 px-1 py-3 transition-colors hover:bg-muted/50"
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} />
              <span className="min-w-0 space-y-0.5">
                <span className="block text-sm font-medium">{alert.title}</span>
                <span className="block text-sm text-muted-foreground">{alert.description}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Cloche de l'en-tête : les mêmes alertes que le tableau de bord, accessibles de partout. */
export function AlertsBell({ alerts }: { alerts: Alert[] }) {
  const urgent = alerts.filter((alert) => alert.severity !== "info").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={
            alerts.length === 0
              ? "Aucune alerte"
              : `${alerts.length} alerte${alerts.length > 1 ? "s" : ""}`
          }
        >
          <BellIcon />
          {urgent > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
              {urgent > 9 ? "9+" : urgent}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <p className="border-b px-4 py-3 text-sm font-medium">Alertes</p>
        {alerts.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Rien à signaler : tout est à jour.
          </p>
        ) : (
          <AlertList alerts={alerts} className="max-h-96 overflow-y-auto px-3" />
        )}
      </PopoverContent>
    </Popover>
  );
}
