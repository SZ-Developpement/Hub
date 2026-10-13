// Dates calendaires.
//
// Une date de document (émission, échéance, paiement…) n'a pas de fuseau : elle est
// stockée en `DATE` et manipulée ici soit en chaîne ISO « AAAA-MM-JJ », soit en `Date`
// calée sur minuit UTC (ce que renvoie Prisma pour une colonne `@db.Date`).
// Toute l'arithmétique se fait donc en UTC ; seul « aujourd'hui » dépend d'Europe/Paris.

export const TIME_ZONE = "Europe/Paris";

const DAY_MS = 86_400_000;

const parisDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Date du jour à Paris, au format ISO. */
export function todayISO(now: Date = new Date()): string {
  return parisDay.format(now);
}

/** Date du jour à Paris, calée sur minuit UTC. */
export function today(now: Date = new Date()): Date {
  return toDate(todayISO(now));
}

export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toISOOrNull(date: Date | null | undefined): string | null {
  return date ? toISO(date) : null;
}

export function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Ajoute des mois en bornant au dernier jour du mois cible (31/01 + 1 mois = 28/02). */
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = utcDate(year, month + 1, 0).getUTCDate();
  return utcDate(year, month, Math.min(date.getUTCDate(), lastDay));
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

/** Nombre de jours de `from` à `to` (positif si `to` est postérieur). */
export function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function startOfMonth(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
}

export function startOfQuarter(date: Date): Date {
  return utcDate(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1);
}

export function endOfQuarter(date: Date): Date {
  return utcDate(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3 + 3, 0);
}

export function startOfYear(date: Date): Date {
  return utcDate(date.getUTCFullYear(), 0, 1);
}

export function endOfYear(date: Date): Date {
  return utcDate(date.getUTCFullYear(), 11, 31);
}

/** Lundi de la semaine ISO contenant `date`. */
export function startOfWeek(date: Date): Date {
  const weekday = (date.getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

export function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = toDate(value);
  return !Number.isNaN(date.getTime()) && toISO(date) === value;
}

/** Convertit un `Date` local (calendrier, sélecteur de date) en chaîne ISO. */
export function localDateToISO(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Convertit une chaîne ISO en `Date` local, pour alimenter un calendrier. */
export function isoToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}
