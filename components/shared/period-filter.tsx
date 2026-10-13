"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { DatePicker } from "@/components/shared/date-picker";
import { usePeriodFrame } from "@/components/shared/period-frame";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { PERIOD_LABELS, type PeriodPreset } from "@/lib/periods";
import { cn } from "@/lib/utils";

/**
 * Sélecteur de période, synchronisé avec l'URL (`?periode=…&du=…&au=…`) :
 * la page serveur relit ces paramètres et recalcule tout ce qui en dépend.
 */
export function PeriodFilter({
  presets,
  value,
  from,
  to,
  className,
}: {
  presets: readonly PeriodPreset[];
  value: PeriodPreset;
  /** Bornes de la période affichée (AAAA-MM-JJ). */
  from: string;
  to: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Dans un PeriodFrame, la transition est partagée : le contenu piloté s'estompe pendant le rechargement.
  const frame = usePeriodFrame();
  const [localPending, startLocalTransition] = useTransition();
  const pending = frame?.pending ?? localPending;
  const startTransition = frame?.startTransition ?? startLocalTransition;
  const [customOpen, setCustomOpen] = useState(value === "custom");
  const [range, setRange] = useState<{ from: string | null; to: string | null }>({ from, to });

  function navigate(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, change] of Object.entries(changes)) {
      if (change === null) next.delete(key);
      else next.set(key, change);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  const validRange = Boolean(range.from && range.to && range.from <= range.to);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select
        value={customOpen ? "custom" : value}
        onValueChange={(next) => {
          if (next === "custom") {
            setCustomOpen(true);
            setRange({ from, to });
            return;
          }
          setCustomOpen(false);
          navigate({ periode: next, du: null, au: null });
        }}
      >
        <SelectTrigger aria-label="Période" className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset} value={preset}>
              {PERIOD_LABELS[preset]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {customOpen ? (
        <>
          <DatePicker
            value={range.from}
            onChange={(next) => setRange((current) => ({ ...current, from: next }))}
            placeholder="Du"
            max={range.to ?? undefined}
            className="w-36"
          />
          <DatePicker
            value={range.to}
            onChange={(next) => setRange((current) => ({ ...current, to: next }))}
            placeholder="Au"
            min={range.from ?? undefined}
            className="w-36"
          />
          <Button
            variant="outline"
            disabled={!validRange || pending}
            onClick={() => navigate({ periode: "custom", du: range.from, au: range.to })}
          >
            Appliquer
          </Button>
        </>
      ) : null}

      {pending ? <Spinner className="text-muted-foreground" /> : null}
    </div>
  );
}
