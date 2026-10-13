import {
  DocFont,
  DocumentKind,
  PaymentMethod,
  ThemeMode,
  UrssafPeriodicity,
  YearFormat,
} from "@/generated/prisma/enums";
import {
  cents,
  hexColor,
  id,
  isoDate,
  optionalEmail,
  optionalIsoDate,
  optionalText,
  positiveCents,
  requiredText,
  z,
} from "@/lib/validation/zod";

// ───────────────────────────── Entreprise ─────────────────────────────

/** Contrôle IBAN (longueur + clé modulo 97). */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value = char >= "A" ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

const siret = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{14}$/.test(value.replace(/\s/g, "")), {
    message: "Le SIRET comporte 14 chiffres.",
  });

export const companySchema = z.object({
  companyName: requiredText(120),
  legalForm: requiredText(80),
  addressLine1: optionalText(160),
  addressLine2: optionalText(160),
  postalCode: optionalText(12),
  city: optionalText(80),
  country: optionalText(60),
  siret,
  apeCode: optionalText(10),
  vatNumber: optionalText(20),
  email: optionalEmail,
  phone: optionalText(30),
  website: optionalText(120),
  ownerFirstName: optionalText(80),
  ownerLastName: optionalText(80),
  ownerTitle: optionalText(80),
  iban: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidIban(value), { message: "IBAN invalide." }),
  bic: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(value), {
      message: "BIC invalide (8 ou 11 caractères).",
    }),
  bankName: optionalText(80),
  activityStartDate: optionalIsoDate,
});
export type CompanyValues = z.infer<typeof companySchema>;

// ───────────────────────────── Apparence ─────────────────────────────

export const appearanceSchema = z.object({
  appName: requiredText(40),
  accentColor: hexColor,
  theme: z.enum(ThemeMode),
});
export type AppearanceValues = z.infer<typeof appearanceSchema>;

// ───────────────────────────── Documents ─────────────────────────────

export const numberingFormatSchema = z.object({
  prefix: z
    .string()
    .trim()
    .max(10)
    .regex(/^[A-Za-z0-9]*$/, "Lettres et chiffres uniquement."),
  separator: z.enum(["-", "/", ".", ""]),
  yearFormat: z.enum(YearFormat),
  digits: z.int().min(2, "2 chiffres minimum.").max(8, "8 chiffres maximum."),
  /** Prochain numéro souhaité ; ne peut qu'être augmenté. */
  nextNumber: z.int().min(1).max(99_999_999),
});
export type NumberingFormatValues = z.infer<typeof numberingFormatSchema>;

export const documentStyleSchema = z.object({
  docPrimaryColor: hexColor,
  docFont: z.enum(DocFont),
  docShowLogo: z.boolean(),
  docShowSignature: z.boolean(),
  docShowOwnerName: z.boolean(),
  docShowIban: z.boolean(),
  docShowEmail: z.boolean(),
  docShowPhone: z.boolean(),
  docShowWebsite: z.boolean(),
  docHeaderText: optionalText(400),
  docFooterText: optionalText(400),
});

export const documentsSchema = documentStyleSchema.extend({
  quoteDefaultNotes: optionalText(2000),
  quoteDefaultTerms: optionalText(4000),
  invoiceDefaultNotes: optionalText(2000),
  invoiceDefaultTerms: optionalText(4000),
  quoteValidityDays: z.int().min(1, "1 jour minimum.").max(365, "365 jours maximum."),
  quoteDefaultDepositRateBp: z.int().min(0).max(10_000, "100 % maximum."),
  numbering: z.object({
    PRE_QUOTE: numberingFormatSchema,
    QUOTE: numberingFormatSchema,
    INVOICE: numberingFormatSchema,
    CREDIT_NOTE: numberingFormatSchema,
  }),
});
export type DocumentsValues = z.infer<typeof documentsSchema>;

export const PREVIEW_KINDS = ["INVOICE", "QUOTE", "PRE_QUOTE", "CREDIT_NOTE"] as const;

export const documentPreviewSchema = documentStyleSchema.extend({
  kind: z.enum(DocumentKind),
  number: z.string().max(40),
  notes: optionalText(2000),
  terms: optionalText(4000),
});
export type DocumentPreviewValues = z.infer<typeof documentPreviewSchema>;

// ───────────────────────────── Facturation & légal ─────────────────────────────

export const billingSchema = z.object({
  vatMention: optionalText(300),
  operationNature: optionalText(120),
  paymentTermDays: z.int().min(0).max(120, "120 jours maximum."),
  acceptedPaymentMethods: z
    .array(z.enum(PaymentMethod))
    .min(1, "Sélectionnez au moins un moyen de paiement."),
  latePenaltyText: optionalText(600),
  recoveryFeeEnabled: z.boolean(),
  recoveryFeeCents: positiveCents,
  earlyPaymentDiscountText: optionalText(300),
  legalMentions: optionalText(2000),
});
export type BillingValues = z.infer<typeof billingSchema>;

// ───────────────────────────── Comptabilité ─────────────────────────────

export const accountingSchema = z
  .object({
    urssafPeriodicity: z.enum(UrssafPeriodicity),
    urssafReminderDays: z.int().min(0).max(60),
    revenueCeilingCents: cents.min(1, "Indiquez un plafond."),
    ceilingWarningPct: z.int().min(1).max(100),
    ceilingCriticalPct: z.int().min(1).max(100),
    vatThresholdCents: positiveCents,
    vatUpperThresholdCents: positiveCents,
    quoteExpiryAlertDays: z.int().min(0).max(60),
  })
  .refine((values) => values.ceilingWarningPct < values.ceilingCriticalPct, {
    path: ["ceilingCriticalPct"],
    message: "Le seuil critique doit être supérieur au seuil d'alerte.",
  })
  .refine((values) => values.vatUpperThresholdCents >= values.vatThresholdCents, {
    path: ["vatUpperThresholdCents"],
    message: "Le seuil majoré doit être supérieur ou égal au seuil de base.",
  });
export type AccountingValues = z.infer<typeof accountingSchema>;

const rateBp = z.int().min(0, "Le taux ne peut pas être négatif.").max(10_000, "100 % maximum.");

export const contributionRateSchema = z.object({
  id: id.nullable(),
  effectiveFrom: isoDate,
  socialRateBp: rateBp,
  cfpRateBp: rateBp,
  incomeTaxRateBp: rateBp,
  note: optionalText(200),
});
export type ContributionRateValues = z.infer<typeof contributionRateSchema>;

export const SETTINGS_IMAGE_KINDS = ["APP_LOGO", "FAVICON", "DOCUMENT_LOGO", "SIGNATURE"] as const;
export type SettingsImageKind = (typeof SETTINGS_IMAGE_KINDS)[number];
