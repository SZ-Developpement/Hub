import { TIME_ZONE, toDate } from "@/lib/dates";

const LOCALE = "fr-FR";

const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const moneyRounded = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const moneyCompact = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 });
const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

const dateShort = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const dateLong = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dateMedium = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const monthYear = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const monthShort = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  month: "short",
  year: "2-digit",
});
const dateTime = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type DateInput = Date | string | null | undefined;

function asDate(value: DateInput): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? toDate(value) : new Date(value);
}

/** 123456 → « 1 234,56 € » */
export function formatMoney(cents: number): string {
  // `|| 0` écarte le zéro négatif, que Intl afficherait « -0,00 € ».
  return money.format((cents || 0) / 100);
}

/** 123456 → « 1 235 € » */
export function formatMoneyRounded(cents: number): string {
  return moneyRounded.format(Math.round(cents / 100));
}

/** 1234567 → « 12,3 k€ » (axes et libellés serrés) */
export function formatMoneyCompact(cents: number): string {
  return moneyCompact.format(cents / 100);
}

/** Quantité en millièmes : 1500 → « 1,5 » */
export function formatQuantity(milli: number): string {
  return decimal.format(milli / 1000);
}

export function formatInteger(value: number): string {
  return integer.format(value);
}

/** Taux en points de base : 2610 → « 26,1 % » */
export function formatRate(basisPoints: number): string {
  return `${percent.format(basisPoints / 100)} %`;
}

/** Pourcentage déjà exprimé en % : 12.345 → « 12,3 % » */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toLocaleString(LOCALE, { maximumFractionDigits: digits })} %`;
}

/** Date calendaire : « 12/10/2026 » */
export function formatDate(value: DateInput): string {
  const date = asDate(value);
  return date ? dateShort.format(date) : "—";
}

/** Date calendaire : « 12 octobre 2026 » */
export function formatDateLong(value: DateInput): string {
  const date = asDate(value);
  return date ? dateLong.format(date) : "—";
}

/** Date calendaire : « 12 oct. » */
export function formatDateShort(value: DateInput): string {
  const date = asDate(value);
  return date ? dateMedium.format(date) : "—";
}

/** « octobre 2026 » */
export function formatMonthYear(value: DateInput): string {
  const date = asDate(value);
  return date ? monthYear.format(date) : "—";
}

/** « oct. 26 » */
export function formatMonthShort(value: DateInput): string {
  const date = asDate(value);
  return date ? monthShort.format(date) : "—";
}

/** Horodatage affiché à l'heure de Paris : « 12/10/2026 14:32 » */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return dateTime.format(value instanceof Date ? value : new Date(value));
}

/** « il y a 3 jours », « dans 2 h »… */
export function formatRelative(value: Date | string, now: Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "à l'instant";
}

export function formatSiret(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 14) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return value;
}

export function formatIban(value: string): string {
  return value
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/** Durée en jours : « 12 jours », « 1 jour » */
export function formatDays(days: number): string {
  const rounded = Math.round(days);
  return `${integer.format(rounded)} jour${Math.abs(rounded) > 1 ? "s" : ""}`;
}

/** Octets → « 1,2 Mo » */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} Mo`;
}
