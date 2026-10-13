"use client";

import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatMoney, formatPercent } from "@/lib/format";

export type DonutSlice = {
  name: string;
  value: number;
  /** Couleur attachée à la catégorie elle-même : elle ne change pas quand le filtre change. */
  color: string;
};

/**
 * Répartition en anneau, limitée à quelques parts. La légende reprend le nom, le montant
 * et la part de chacune : l'identité ne repose jamais sur la seule couleur.
 */
export function DonutChart({ data, totalLabel }: { data: DonutSlice[]; totalLabel: string }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const config = Object.fromEntries(
    data.map((slice) => [slice.name, { label: slice.name, color: slice.color }]),
  ) satisfies ChartConfig;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative shrink-0">
        <ChartContainer config={config} className="aspect-square h-44">
          <PieChart accessibilityLayer>
            <ChartTooltip
              content={({ active, payload }) => {
                const slice = payload?.[0];
                if (!active || !slice) return null;
                const value = Number(slice.value ?? 0);
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <p className="font-semibold tabular-nums">{formatMoney(value)}</p>
                    <p className="text-muted-foreground">
                      {String(slice.name)} · {formatPercent(total > 0 ? (value / total) * 100 : 0)}
                    </p>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={80}
              // Un filet de la couleur de fond sépare les parts : pas de bordure dessinée.
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted-foreground">{totalLabel}</span>
          <span className="text-sm font-semibold">{formatMoney(total)}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2 text-sm">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate">{slice.name}</span>
            <span className="shrink-0 tabular-nums">{formatMoney(slice.value)}</span>
            <span className="w-11 shrink-0 text-right whitespace-nowrap text-muted-foreground tabular-nums">
              {formatPercent(total > 0 ? (slice.value / total) * 100 : 0, 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
