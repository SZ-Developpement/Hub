import { ArrowDownIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Tone } from "@/lib/labels";
import { cn } from "@/lib/utils";

// Graphiques sans bibliothèque : de simples barres HTML, lisibles sans survol puisque
// chaque valeur est écrite à côté de sa marque.

// ───────────────────────────── Classement en barres ─────────────────────────────

export type BarListItem = { id: string; name: string; value: number; href?: string; hint?: string };

/** Classement horizontal. Une seule série : toutes les barres portent la couleur d'accent. */
export function BarList({ items }: { items: BarListItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {item.href ? (
              <Link href={item.href} className="min-w-0 truncate hover:underline">
                {item.name}
              </Link>
            ) : (
              <span className="min-w-0 truncate">{item.name}</span>
            )}
            <span className="shrink-0 tabular-nums">
              {item.hint ? <span className="mr-2 text-xs text-muted-foreground">{item.hint}</span> : null}
              <span className="font-medium">{formatMoney(item.value)}</span>
            </span>
          </div>
          <div className="h-2 rounded-r-sm bg-muted/60">
            <div
              className="h-full rounded-r-sm bg-chart-1"
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 1.5 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

// ───────────────────────────── Répartition par statut ─────────────────────────────

const STATUS_FILLS: Record<Tone, string> = {
  neutral: "bg-chart-muted",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

export type StatusSegment = {
  key: string;
  label: string;
  tone: Tone;
  count: number;
  amount: number;
  href?: string;
};

/**
 * Répartition par statut : une barre empilée et, dessous, chaque statut avec son libellé,
 * son nombre et son montant. Les couleurs sont celles des statuts, jamais celle de l'accent.
 */
export function StatusBreakdown({ segments }: { segments: StatusSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-sm" role="img" aria-label="Répartition par statut">
        {segments
          .filter((segment) => segment.count > 0)
          .map((segment) => (
            <div
              key={segment.key}
              className={cn("h-full min-w-1", STATUS_FILLS[segment.tone])}
              style={{ flexGrow: segment.count, flexBasis: 0 }}
            />
          ))}
      </div>
      <ul className="space-y-2 text-sm">
        {segments.map((segment) => {
          const row = (
            <>
              <StatusBadge tone={segment.tone}>{segment.label}</StatusBadge>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {segment.count} · {formatPercent(total > 0 ? (segment.count / total) * 100 : 0, 0)}
              </span>
              <span className="w-24 text-right font-medium tabular-nums">
                {formatMoney(segment.amount)}
              </span>
            </>
          );
          return (
            <li key={segment.key}>
              {segment.href ? (
                <Link href={segment.href} className="-mx-1 flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/60">
                  {row}
                </Link>
              ) : (
                <div className="flex items-center gap-2 py-0.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────────────────────────── Entonnoir ─────────────────────────────

export type FunnelStage = {
  label: string;
  count: number;
  hint?: string;
  /** Taux de passage depuis l'étape précédente, en % ; `null` s'il n'est pas calculable. */
  rate?: number | null;
  /** Ce que mesure ce taux, ex. « des devis envoyés ». */
  rateLabel?: string;
};

/**
 * Entonnoir : une barre par étape (même couleur pour toutes — l'ordre se lit de haut en
 * bas), avec le taux de passage écrit entre deux étapes.
 */
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((stage) => stage.count), 1);

  return (
    <ol className="space-y-1.5">
      {stages.map((stage, index) => (
        <li key={stage.label}>
          {index > 0 ? (
            <p className="flex items-center gap-1 py-1 pl-1 text-xs text-muted-foreground">
              <ArrowDownIcon className="size-3" />
              {stage.rate == null
                ? "—"
                : `${formatPercent(stage.rate, 0)} ${stage.rateLabel ?? "de conversion"}`}
            </p>
          ) : null}
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{stage.label}</span>
            <span className="shrink-0 tabular-nums">
              {stage.hint ? <span className="mr-2 text-xs text-muted-foreground">{stage.hint}</span> : null}
              <span className="font-medium">{stage.count}</span>
            </span>
          </div>
          <div className="mt-1.5 h-5 rounded-r-sm bg-muted/60">
            <div
              className="h-full rounded-r-sm bg-chart-1"
              style={{ width: `${Math.max((stage.count / max) * 100, stage.count > 0 ? 1.5 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

// ───────────────────────────── Jauge ─────────────────────────────

const METER_FILLS = {
  ok: "bg-chart-1",
  warning: "bg-warning",
  critical: "bg-destructive",
  exceeded: "bg-destructive",
} as const;

const METER_TRACKS = {
  ok: "bg-[var(--chart-track)]",
  warning: "bg-warning/20",
  critical: "bg-destructive/20",
  exceeded: "bg-destructive/20",
} as const;

/**
 * Jauge d'un ratio par rapport à un plafond. Le remplissage porte la gravité (accent,
 * puis alerte, puis critique) et la piste reste dans la même teinte, atténuée.
 * Des repères marquent les seuils ; un trait pointillé, la projection de fin d'année.
 */
export function Meter({
  percent,
  level,
  markers = [],
  projectionPercent,
  label,
  children,
}: {
  percent: number;
  level: keyof typeof METER_FILLS;
  /** Seuils à repérer sur la piste, en % du plafond. */
  markers?: { percent: number; label: string }[];
  projectionPercent?: number | null;
  /** Description pour les lecteurs d'écran. */
  label: string;
  children?: ReactNode;
}) {
  const clamp = (value: number) => Math.min(Math.max(value, 0), 100);

  return (
    <div className="space-y-2">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamp(percent))}
        className={cn("relative h-3 rounded-sm", METER_TRACKS[level])}
      >
        <div
          className={cn("h-full rounded-sm", METER_FILLS[level])}
          style={{ width: `${clamp(percent)}%` }}
        />
        {markers.map((marker) => (
          <span
            key={marker.label}
            title={`${marker.label} : ${formatPercent(marker.percent, 0)}`}
            className="absolute -top-1 h-5 w-px bg-foreground/45"
            style={{ left: `${clamp(marker.percent)}%` }}
          />
        ))}
        {projectionPercent != null ? (
          <span
            title={`Projection de fin d'année : ${formatPercent(projectionPercent, 0)}`}
            className="absolute -top-1 h-5 border-l-2 border-dotted border-foreground"
            style={{ left: `${clamp(projectionPercent)}%` }}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}
