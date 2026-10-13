// Calculs monétaires — exclusivement sur des entiers (centimes, millièmes, points de base).

export type DiscountKind = "NONE" | "PERCENT" | "AMOUNT";

/**
 * Division entière arrondie au plus proche, les demis s'éloignant de zéro.
 * L'arrondi est symétrique : un avoir (montants négatifs) annule exactement sa facture.
 */
export function divRound(numerator: number, denominator: number): number {
  const sign = Math.sign(numerator) * Math.sign(denominator);
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const quotient = Math.floor(n / d);
  const remainder = n - quotient * d;
  return sign * (remainder * 2 >= d ? quotient + 1 : quotient);
}

/** Total d'une ligne : quantité (millièmes) × prix unitaire (centimes). */
export function lineTotalCents(quantityMilli: number, unitPriceCents: number): number {
  return divRound(quantityMilli * unitPriceCents, 1000);
}

/** Applique un taux en points de base (10 % = 1000). */
export function applyRate(amountCents: number, basisPoints: number): number {
  return divRound(amountCents * basisPoints, 10_000);
}

export type TotalsInput = {
  lines: { quantityMilli: number; unitPriceCents: number }[];
  discountType: DiscountKind;
  /** Points de base si PERCENT, centimes si AMOUNT */
  discountValue: number;
  depositDeductionCents?: number;
};

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  depositDeductionCents: number;
  netCents: number;
};

export function computeTotals(input: TotalsInput): Totals {
  const subtotalCents = input.lines.reduce(
    (sum, line) => sum + lineTotalCents(line.quantityMilli, line.unitPriceCents),
    0,
  );

  let discountCents = 0;
  if (input.discountType === "PERCENT") {
    discountCents = applyRate(subtotalCents, input.discountValue);
  } else if (input.discountType === "AMOUNT") {
    discountCents = input.discountValue;
  }
  // La remise ne peut ni changer le signe du total ni l'augmenter.
  discountCents =
    subtotalCents >= 0
      ? Math.min(Math.max(discountCents, 0), subtotalCents)
      : Math.max(Math.min(discountCents, 0), subtotalCents);

  const totalCents = subtotalCents - discountCents;
  const depositDeductionCents = input.depositDeductionCents ?? 0;

  return {
    subtotalCents,
    discountCents,
    totalCents,
    depositDeductionCents,
    netCents: totalCents - depositDeductionCents,
  };
}

/** Variation en % entre deux valeurs ; `null` si la base est nulle (variation non définie). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** « 1 234,56 » ou « 1234.5 » → centimes. Renvoie `null` si la saisie n'est pas un nombre. */
export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[\s  €]/g, "").replace(",", ".");
  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** « 1,5 » → 1500 (millièmes). */
export function parseQuantityInput(raw: string): number | null {
  const cleaned = raw.replace(/[\s  ]/g, "").replace(",", ".");
  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 1000);
}

/** Centimes → chaîne éditable « 1234,56 » (sans séparateur de milliers). */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const euros = Math.floor(absolute / 100);
  const rest = absolute % 100;
  return rest === 0 ? `${sign}${euros}` : `${sign}${euros},${String(rest).padStart(2, "0")}`;
}

/** Millièmes → chaîne éditable « 1,5 ». */
export function milliToInput(milli: number): string {
  return String(milli / 1000).replace(".", ",");
}
