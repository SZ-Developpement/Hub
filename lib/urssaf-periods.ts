import type { UrssafPeriodicity } from "@/generated/prisma/enums";
import {
  addDays,
  endOfMonth,
  endOfQuarter,
  maxDate,
  startOfMonth,
  startOfQuarter,
} from "@/lib/dates";
import { formatMonthYear } from "@/lib/format";

export type Period = { start: Date; end: Date };

/** Période de déclaration (mois ou trimestre civil) contenant la date. */
export function periodContaining(date: Date, periodicity: UrssafPeriodicity): Period {
  return periodicity === "MONTHLY"
    ? { start: startOfMonth(date), end: endOfMonth(date) }
    : { start: startOfQuarter(date), end: endOfQuarter(date) };
}

/**
 * Échéance de déclaration : dernier jour du mois qui suit la période
 * (mensuel : fin du mois suivant ; trimestriel : 30/04, 31/07, 31/10, 31/01).
 */
export function declarationDueDate(periodEnd: Date): Date {
  return endOfMonth(addDays(periodEnd, 1));
}

/** Périodes à créer pour couvrir de `from` jusqu'à la période en cours incluse. */
export function periodsToCover(
  from: Date,
  until: Date,
  periodicity: UrssafPeriodicity,
): Period[] {
  const periods: Period[] = [];
  let cursor = from;
  while (cursor.getTime() <= until.getTime()) {
    const aligned = periodContaining(cursor, periodicity);
    periods.push({ start: maxDate(aligned.start, cursor), end: aligned.end });
    cursor = addDays(aligned.end, 1);
  }
  return periods;
}

/** « T3 2026 », « octobre 2026 », ou la plage exacte pour une période partielle. */
export function periodLabel(start: Date, end: Date): string {
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) return formatMonthYear(start);

  const isFullQuarter =
    start.getTime() === startOfQuarter(start).getTime() &&
    end.getTime() === endOfQuarter(start).getTime();
  if (isFullQuarter) {
    return `T${Math.floor(start.getUTCMonth() / 3) + 1} ${start.getUTCFullYear()}`;
  }
  return `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
}
