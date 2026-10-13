import {
  DiscountType,
  PaymentMethod,
  ReminderChannel,
  Unit,
} from "@/generated/prisma/enums";
import {
  cents,
  id,
  isoDate,
  optionalIsoDate,
  optionalText,
  positiveCents,
  requiredText,
  z,
} from "@/lib/validation/zod";

const clientId = z.string().min(1, "Sélectionnez un client.").max(64);

// ───────────────────────────── Lignes ─────────────────────────────

export const lineSchema = z.object({
  serviceId: id.nullable(),
  categoryId: id.nullable(),
  label: requiredText(300),
  description: optionalText(2000),
  quantityMilli: z.int().min(1, "La quantité doit être supérieure à 0.").max(100_000_000),
  unit: z.enum(Unit),
  unitPriceCents: positiveCents.max(1_000_000_000),
});
export type LineValues = z.infer<typeof lineSchema>;

export const EMPTY_LINE: LineValues = {
  serviceId: null,
  categoryId: null,
  label: "",
  description: "",
  quantityMilli: 1000,
  unit: "FLAT",
  unitPriceCents: 0,
};

const lines = z.array(lineSchema).min(1, "Ajoutez au moins une ligne.").max(100);

const discount = {
  discountType: z.enum(DiscountType),
  /** Points de base si PERCENT, centimes si AMOUNT. */
  discountValue: z.int().min(0, "La remise ne peut pas être négative."),
};

function discountIsValid(values: { discountType: DiscountType; discountValue: number }): boolean {
  return values.discountType !== "PERCENT" || values.discountValue <= 10_000;
}

const discountError = { path: ["discountValue"], message: "La remise ne peut pas dépasser 100 %." };

// ───────────────────────────── Pré-devis ─────────────────────────────

export const preQuoteItemSchema = z.object({
  label: requiredText(200),
  description: optionalText(1000),
  /** Estimation en jours (millièmes). */
  daysMilli: z.int().min(0).max(10_000_000),
});
export type PreQuoteItemValues = z.infer<typeof preQuoteItemSchema>;

export const preQuoteSchema = z
  .object({
    clientId,
    title: requiredText(200),
    issueDate: isoDate,
    need: optionalText(4000),
    items: z.array(preQuoteItemSchema).max(100),
    dailyRateCents: positiveCents.nullable(),
    priceMinCents: positiveCents,
    priceMaxCents: positiveCents,
    notes: optionalText(2000),
  })
  .refine((values) => values.priceMaxCents >= values.priceMinCents, {
    path: ["priceMaxCents"],
    message: "Le maximum doit être supérieur ou égal au minimum.",
  });
export type PreQuoteValues = z.infer<typeof preQuoteSchema>;

export const updatePreQuoteSchema = preQuoteSchema.safeExtend({ id });

// ───────────────────────────── Devis ─────────────────────────────

export const quoteSchema = z
  .object({
    clientId,
    title: requiredText(200),
    issueDate: isoDate,
    validUntil: isoDate,
    lines,
    ...discount,
    depositRateBp: z.int().min(0).max(10_000, "100 % maximum."),
    notes: optionalText(2000),
    terms: optionalText(4000),
  })
  .refine(discountIsValid, discountError)
  .refine((values) => values.validUntil >= values.issueDate, {
    path: ["validUntil"],
    message: "La date de validité ne peut pas précéder la date du devis.",
  });
export type QuoteValues = z.infer<typeof quoteSchema>;

export const createQuoteSchema = quoteSchema.safeExtend({ preQuoteId: id.nullable() });
export const updateQuoteSchema = quoteSchema.safeExtend({ id });

export const convertQuoteSchema = z.object({
  id,
  mode: z.enum(["FULL", "DEPOSIT", "BALANCE"]),
  /** Pourcentage de l'acompte (points de base), pour le mode DEPOSIT. */
  depositRateBp: z.int().min(1, "Indiquez un pourcentage.").max(10_000, "100 % maximum."),
});

// ───────────────────────────── Factures ─────────────────────────────

export const invoiceSchema = z
  .object({
    clientId,
    title: requiredText(200),
    issueDate: isoDate,
    paymentTermDays: z.int().min(0).max(120, "120 jours maximum."),
    dueDate: isoDate,
    serviceStart: optionalIsoDate,
    serviceEnd: optionalIsoDate,
    lines,
    ...discount,
    notes: optionalText(2000),
    terms: optionalText(4000),
  })
  .refine(discountIsValid, discountError)
  .refine((values) => values.dueDate >= values.issueDate, {
    path: ["dueDate"],
    message: "L'échéance ne peut pas précéder la date d'émission.",
  })
  .refine(
    (values) => !values.serviceStart || !values.serviceEnd || values.serviceEnd >= values.serviceStart,
    { path: ["serviceEnd"], message: "La fin de prestation ne peut pas précéder son début." },
  );
export type InvoiceValues = z.infer<typeof invoiceSchema>;

export const updateInvoiceSchema = invoiceSchema.safeExtend({ id });

export const issueInvoiceSchema = z.object({ id, issueDate: isoDate });

export const paymentSchema = z.object({
  invoiceId: id,
  paidOn: isoDate,
  /** Négatif pour un remboursement. */
  amountCents: cents.refine((value) => value !== 0, "Indiquez un montant."),
  method: z.enum(PaymentMethod),
  reference: optionalText(80),
  note: optionalText(300),
});
export type PaymentValues = z.infer<typeof paymentSchema>;

export const reminderSchema = z.object({
  invoiceId: id,
  sentOn: isoDate,
  level: z.int().min(1).max(4),
  channel: z.enum(ReminderChannel),
  note: optionalText(500),
});
export type ReminderValues = z.infer<typeof reminderSchema>;

export const creditNoteSchema = z
  .object({
    invoiceId: id,
    mode: z.enum(["FULL", "PARTIAL"]),
    /** Montant à créditer (positif), pour un avoir partiel. */
    amountCents: positiveCents,
    label: optionalText(300),
    reason: requiredText(300),
    issueDate: isoDate,
  })
  .refine((values) => values.mode === "FULL" || values.amountCents > 0, {
    path: ["amountCents"],
    message: "Indiquez le montant de l'avoir.",
  });
export type CreditNoteValues = z.infer<typeof creditNoteSchema>;
