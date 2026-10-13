"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney, formatMoneyCompact } from "@/lib/format";

// Spécifications communes : traits de 2 px, grille pleine en filet, axes en retrait,
// colonnes fines à extrémité arrondie posées sur la ligne de base.
const GRID = { vertical: false, stroke: "var(--chart-grid)" } as const;
const AXIS = { tickLine: false, axisLine: false, tickMargin: 8 } as const;
const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: "var(--card)" } as const;

type TooltipEntry = { dataKey?: unknown; name?: unknown; value?: unknown; color?: string };

/** Infobulle : la valeur d'abord, le nom de la série ensuite, repérée par un trait de sa couleur. */
function MoneyTooltip({
  active,
  payload,
  label,
  config,
}: {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: unknown;
  config: ChartConfig;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label ? <p className="font-medium">{String(label)}</p> : null}
      {payload.map((entry) => {
        const key = String(entry.dataKey ?? entry.name ?? "");
        return (
          <div key={key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: `var(--color-${key})` }}
            />
            <span className="font-semibold tabular-nums">{formatMoney(Number(entry.value ?? 0))}</span>
            <span className="text-muted-foreground">{config[key]?.label ?? key}</span>
          </div>
        );
      })}
    </div>
  );
}

function moneyAxis(value: number): string {
  return formatMoneyCompact(value);
}

export type SeriesPoint = { label: string; primary: number; secondary: number };

/**
 * Évolution de deux mesures dans le temps. La série principale porte la couleur d'accent
 * (aire en léger lavis), la série de contexte reste en gris : c'est l'accent qui porte le propos.
 */
export function DualSeriesChart({
  data,
  primaryLabel,
  secondaryLabel,
  primaryAsArea = true,
}: {
  data: SeriesPoint[];
  primaryLabel: string;
  secondaryLabel: string;
  primaryAsArea?: boolean;
}) {
  const config = {
    primary: { label: primaryLabel, color: "var(--chart-1)" },
    secondary: { label: secondaryLabel, color: "var(--chart-muted)" },
  } satisfies ChartConfig;

  const shared = (
    <>
      <CartesianGrid {...GRID} />
      <XAxis dataKey="label" {...AXIS} minTickGap={28} />
      <YAxis {...AXIS} width={52} tickFormatter={moneyAxis} />
      <ChartTooltip
        cursor={{ stroke: "var(--border)" }}
        content={(props) => <MoneyTooltip {...props} config={config} />}
      />
      <ChartLegend content={<ChartLegendContent />} />
    </>
  );

  if (!primaryAsArea) {
    return (
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
          {shared}
          <Line
            dataKey="secondary"
            type="monotone"
            stroke="var(--color-secondary)"
            strokeWidth={2}
            dot={false}
            activeDot={ACTIVE_DOT}
          />
          <Line
            dataKey="primary"
            type="monotone"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={ACTIVE_DOT}
          />
        </LineChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <ComposedChart data={data} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
        {shared}
        <Area
          dataKey="primary"
          type="monotone"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="var(--color-primary)"
          fillOpacity={0.1}
          activeDot={ACTIVE_DOT}
        />
        <Line
          dataKey="secondary"
          type="monotone"
          stroke="var(--color-secondary)"
          strokeWidth={2}
          dot={false}
          activeDot={ACTIVE_DOT}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

export type ColumnPoint = {
  label: string;
  value: number;
  /** Colonne signalée (ex. « En retard ») : couleur d'alerte au lieu de l'accent. */
  alert?: boolean;
};

/** Colonnes d'une seule série : même couleur pour toutes, le titre de la carte dit ce qui est tracé. */
export function ColumnChart({
  data,
  seriesLabel,
  className = "aspect-auto h-56 w-full",
}: {
  data: ColumnPoint[];
  seriesLabel: string;
  className?: string;
}) {
  const config = { value: { label: seriesLabel, color: "var(--chart-1)" } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className={className}>
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }} accessibilityLayer>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} minTickGap={12} interval="preserveStartEnd" />
        <YAxis {...AXIS} width={52} tickFormatter={moneyAxis} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={(props) => <MoneyTooltip {...props} config={config} />}
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={24}>
          {data.map((point) => (
            <Cell key={point.label} fill={point.alert ? "var(--destructive)" : "var(--color-value)"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
