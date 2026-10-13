import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatPercent } from "@/lib/format";
import type { Kpi } from "@/lib/server/dashboard";
import { cn } from "@/lib/utils";

type Polarity = "up-good" | "down-good" | "neutral";

/** Variation affichée : relative (%), ou écart absolu en points / en jours. */
type DeltaUnit = "percent" | "points" | "days";

function deltaText(kpi: Kpi, unit: DeltaUnit): { text: string; direction: -1 | 0 | 1 } | null {
  if (unit === "percent") {
    if (kpi.change === null) return null;
    const rounded = Math.round(kpi.change * 10) / 10;
    return {
      text: `${rounded > 0 ? "+" : ""}${formatPercent(rounded, 1)}`,
      direction: rounded > 0 ? 1 : rounded < 0 ? -1 : 0,
    };
  }
  if (kpi.difference === null) return null;
  const rounded = Math.round(kpi.difference);
  const suffix = unit === "points" ? (Math.abs(rounded) > 1 ? " pts" : " pt") : " j";
  return {
    text: `${rounded > 0 ? "+" : ""}${rounded}${suffix}`,
    direction: rounded > 0 ? 1 : rounded < 0 ? -1 : 0,
  };
}

/**
 * Tuile d'indicateur : libellé, valeur, variation par rapport à la période précédente.
 * La couleur de la variation dépend du sens ET de ce qu'il signifie (une hausse des
 * impayés est mauvaise) ; la flèche double toujours la couleur.
 */
export function KpiCard({
  label,
  value,
  kpi,
  unit = "percent",
  polarity = "up-good",
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  kpi: Kpi;
  unit?: DeltaUnit;
  polarity?: Polarity;
  hint?: ReactNode;
  href?: string;
}) {
  const delta = deltaText(kpi, unit);
  const good =
    delta === null || delta.direction === 0 || polarity === "neutral"
      ? null
      : (delta.direction > 0) === (polarity === "up-good");
  const Icon =
    delta === null || delta.direction === 0
      ? MinusIcon
      : delta.direction > 0
        ? ArrowUpRightIcon
        : ArrowDownRightIcon;

  const content = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 font-medium",
            good === null ? "text-muted-foreground" : good ? "text-success" : "text-destructive",
          )}
          title="Par rapport à la période précédente de même durée"
        >
          {delta ? <Icon className="size-3.5" /> : null}
          {delta ? delta.text : "—"}
        </span>
        <span className="text-muted-foreground">{hint ?? "vs période précédente"}</span>
      </div>
    </>
  );

  const className = "block rounded-xl border bg-card p-4";
  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:border-foreground/20")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
