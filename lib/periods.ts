// Périodes d'analyse (tableau de bord, livre des recettes, dépenses).
// Toutes les bornes sont des dates calendaires, incluses.

import {
  addDays,
  addMonths,
  addYears,
  diffDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  isValidISODate,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  toDate,
} from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { param, type RawSearchParams } from "@/lib/list-params";

export const PERIOD_PRESETS = [
  "7d",
  "30d",
  "month",
  "quarter",
  "3m",
  "6m",
  "year",
  "last-year",
  "custom",
] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  month: "Ce mois",
  quarter: "Ce trimestre",
  "3m": "3 derniers mois",
  "6m": "6 derniers mois",
  year: "Cette année",
  "last-year": "Année précédente",
  custom: "Période personnalisée",
};

export type Granularity = "day" | "week" | "month";

export type Period = {
  preset: PeriodPreset;
  from: Date;
  to: Date;
  label: string;
};

function presetRange(preset: Exclude<PeriodPreset, "custom">, today: Date): { from: Date; to: Date } {
  switch (preset) {
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "quarter":
      return { from: startOfQuarter(today), to: endOfQuarter(today) };
    case "3m":
      return { from: addDays(addMonths(today, -3), 1), to: today };
    case "6m":
      return { from: addDays(addMonths(today, -6), 1), to: today };
    case "year":
      return { from: startOfYear(today), to: endOfYear(today) };
    case "last-year": {
      const lastYear = addYears(today, -1);
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    }
  }
}

/**
 * Lit la période dans l'URL : `?periode=30d`, ou `?periode=custom&du=…&au=…`.
 * Toute valeur absente ou invalide retombe sur la période par défaut.
 */
export function resolvePeriod(
  searchParams: RawSearchParams,
  today: Date,
  defaultPreset: Exclude<PeriodPreset, "custom">,
): Period {
  const requested = param(searchParams, "periode");
  const preset = PERIOD_PRESETS.find((value) => value === requested) ?? defaultPreset;

  if (preset === "custom") {
    const from = param(searchParams, "du");
    const to = param(searchParams, "au");
    if (from && to && isValidISODate(from) && isValidISODate(to) && from <= to) {
      const range = { from: toDate(from), to: toDate(to) };
      // Garde-fou : dix ans au plus.
      if (diffDays(range.from, range.to) <= 3660) {
        return {
          preset,
          ...range,
          label: `Du ${formatDate(range.from)} au ${formatDate(range.to)}`,
        };
      }
    }
    return { preset: defaultPreset, ...presetRange(defaultPreset, today), label: PERIOD_LABELS[defaultPreset] };
  }

  return { preset, ...presetRange(preset, today), label: PERIOD_LABELS[preset] };
}

/** Nombre de jours de la période, bornes incluses. */
export function periodLength(period: { from: Date; to: Date }): number {
  return diffDays(period.from, period.to) + 1;
}

/** Période de même durée, immédiatement avant. */
export function previousPeriod(period: { from: Date; to: Date }): { from: Date; to: Date } {
  const to = addDays(period.from, -1);
  return { from: addDays(to, -(periodLength(period) - 1)), to };
}

/** Mêmes dates, un an plus tôt. */
export function samePeriodLastYear(period: { from: Date; to: Date }): { from: Date; to: Date } {
  return { from: addYears(period.from, -1), to: addYears(period.to, -1) };
}

/** Pas d'agrégation des courbes : jour jusqu'à un mois, semaine jusqu'à six mois, mois au-delà. */
export function granularityFor(period: { from: Date; to: Date }): Granularity {
  const days = periodLength(period);
  if (days <= 31) return "day";
  if (days <= 190) return "week";
  return "month";
}
