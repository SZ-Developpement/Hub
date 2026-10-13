import type { DocumentKind, YearFormat } from "@/generated/prisma/enums";

export type NumberingConfig = {
  prefix: string;
  separator: string;
  yearFormat: YearFormat;
  digits: number;
};

export const DEFAULT_NUMBERING: Record<DocumentKind, NumberingConfig> = {
  PRE_QUOTE: { prefix: "PD", separator: "-", yearFormat: "YYYY", digits: 4 },
  QUOTE: { prefix: "D", separator: "-", yearFormat: "YYYY", digits: 4 },
  INVOICE: { prefix: "F", separator: "-", yearFormat: "YYYY", digits: 4 },
  CREDIT_NOTE: { prefix: "A", separator: "-", yearFormat: "YYYY", digits: 4 },
};

export const DOCUMENT_KINDS: DocumentKind[] = ["PRE_QUOTE", "QUOTE", "INVOICE", "CREDIT_NOTE"];

/** F + 2026 + 12 → « F-2026-0012 » */
export function formatDocumentNumber(config: NumberingConfig, year: number, value: number): string {
  const parts: string[] = [];
  if (config.prefix) parts.push(config.prefix);
  if (config.yearFormat === "YYYY") parts.push(String(year));
  if (config.yearFormat === "YY") parts.push(String(year).slice(-2));
  parts.push(String(value).padStart(config.digits, "0"));
  return parts.join(config.separator);
}

/**
 * Clé du compteur : l'année quand le format la contient (la numérotation repart à 1
 * chaque 1er janvier), 0 sinon (compteur unique, continu d'une année sur l'autre).
 */
export function counterYear(config: Pick<NumberingConfig, "yearFormat">, date: Date): number {
  return config.yearFormat === "NONE" ? 0 : date.getUTCFullYear();
}
