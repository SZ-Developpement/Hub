import "server-only";

import { isValidISODate, toDate, utcDate } from "@/lib/dates";

/** Bornes `?du=…&au=…` d'un export ; par défaut, du 1er janvier à aujourd'hui. */
export function exportRange(params: URLSearchParams, today: Date): { from: Date; to: Date } {
  const from = params.get("du") ?? "";
  const to = params.get("au") ?? "";
  return {
    from: isValidISODate(from) ? toDate(from) : utcDate(today.getUTCFullYear(), 0, 1),
    to: isValidISODate(to) ? toDate(to) : today,
  };
}

/** Année `?annee=…` d'un export, bornée à une plage plausible ; `null` si absente ou invalide. */
export function exportYear(params: URLSearchParams, today: Date): number | null {
  const year = Number.parseInt(params.get("annee") ?? "", 10);
  return Number.isInteger(year) && year >= 2000 && year <= today.getUTCFullYear() ? year : null;
}
