import {
  formatDate,
  formatDateLong,
  formatIban,
  formatMoney,
  formatQuantity,
  formatRate,
  formatSiret,
} from "@/lib/format";

// Les polices PDF standard ne connaissent pas l'espace fine insécable (U+202F) que
// produit le formatage français des nombres : on la remplace par une insécable classique.
function pdfSafe(text: string): string {
  return text.replace(/ /g, " ");
}

export const pdfMoney = (cents: number) => pdfSafe(formatMoney(cents));
export const pdfQuantity = (milli: number) => pdfSafe(formatQuantity(milli));
export const pdfRate = (basisPoints: number) => pdfSafe(formatRate(basisPoints));
export const pdfDate = (iso: string | null) => (iso ? formatDate(iso) : "");
export const pdfDateLong = (iso: string | null) => (iso ? formatDateLong(iso) : "");
export const pdfSiret = (value: string) => pdfSafe(formatSiret(value));
export const pdfIban = (value: string) => formatIban(value);

/** « 2,5 jours », « 1 jour » */
export function pdfDays(milli: number): string {
  return `${pdfQuantity(milli)} jour${milli > 1000 ? "s" : ""}`;
}

/** Découpe un texte libre en paragraphes non vides. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
