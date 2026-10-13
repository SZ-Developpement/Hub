import type {
  ClientType,
  DocFont,
  DocumentKind,
  InvoiceStatus,
  InvoiceType,
  MemberRole,
  PaymentMethod,
  PreQuoteStatus,
  QuoteStatus,
  ReminderChannel,
  ThemeMode,
  Unit,
  UrssafPeriodicity,
  UrssafStatus,
  YearFormat,
} from "@/generated/prisma/enums";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  COMPANY: "Professionnel",
  INDIVIDUAL: "Particulier",
};

export const UNIT_LABELS: Record<Unit, string> = {
  FLAT: "Forfait",
  DAY: "Jour",
  HOUR: "Heure",
  MONTH: "Mois",
  UNIT: "Unité",
};

/** Libellé d'unité accordé à la quantité, pour les documents : « 3 jours », « 1 forfait ». */
export function unitLabel(unit: Unit, quantityMilli: number): string {
  const plural = Math.abs(quantityMilli) > 1000;
  switch (unit) {
    case "FLAT":
      return plural ? "forfaits" : "forfait";
    case "DAY":
      return plural ? "jours" : "jour";
    case "HOUR":
      return plural ? "heures" : "heure";
    case "MONTH":
      return "mois";
    case "UNIT":
      return plural ? "unités" : "unité";
  }
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TRANSFER: "Virement bancaire",
  CHECK: "Chèque",
  CARD: "Carte bancaire",
  CASH: "Espèces",
  DIRECT_DEBIT: "Prélèvement",
  OTHER: "Autre",
};

export const PRE_QUOTE_STATUS_LABELS: Record<PreQuoteStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  DECLINED: "Refusé",
};

export const PRE_QUOTE_STATUS_TONES: Record<PreQuoteStatus, Tone> = {
  DRAFT: "neutral",
  SENT: "info",
  ACCEPTED: "success",
  DECLINED: "danger",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  DECLINED: "Refusé",
  EXPIRED: "Expiré",
};

export const QUOTE_STATUS_TONES: Record<QuoteStatus, Tone> = {
  DRAFT: "neutral",
  SENT: "info",
  ACCEPTED: "success",
  DECLINED: "danger",
  EXPIRED: "warning",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  PARTIALLY_PAID: "Payée partiellement",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
};

export const INVOICE_STATUS_TONES: Record<InvoiceStatus, Tone> = {
  DRAFT: "neutral",
  ISSUED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "neutral",
};

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  STANDARD: "Facture",
  DEPOSIT: "Facture d'acompte",
  BALANCE: "Facture de solde",
  CREDIT_NOTE: "Avoir",
};

export const INVOICE_TYPE_SHORT_LABELS: Record<InvoiceType, string> = {
  STANDARD: "Facture",
  DEPOSIT: "Acompte",
  BALANCE: "Solde",
  CREDIT_NOTE: "Avoir",
};

export const URSSAF_STATUS_LABELS: Record<UrssafStatus, string> = {
  TO_DECLARE: "À déclarer",
  DECLARED: "Déclaré",
  PAID: "Payé",
};

export const URSSAF_STATUS_TONES: Record<UrssafStatus, Tone> = {
  TO_DECLARE: "warning",
  DECLARED: "info",
  PAID: "success",
};

export const URSSAF_PERIODICITY_LABELS: Record<UrssafPeriodicity, string> = {
  MONTHLY: "Mensuelle",
  QUARTERLY: "Trimestrielle",
};

export const REMINDER_LEVELS = [1, 2, 3, 4] as const;

export const REMINDER_LEVEL_LABELS: Record<number, string> = {
  1: "Relance amiable",
  2: "Relance ferme",
  3: "Dernier avis",
  4: "Mise en demeure",
};

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
  EMAIL: "E-mail",
  PHONE: "Téléphone",
  LETTER: "Courrier",
  OTHER: "Autre",
};

export const DOC_FONT_LABELS: Record<DocFont, string> = {
  HELVETICA: "Helvetica — classique",
  INTER: "Inter — moderne",
  IBM_PLEX_SANS: "IBM Plex Sans — technique",
  MONTSERRAT: "Montserrat — géométrique",
  LORA: "Lora — serif élégant",
};

export const THEME_LABELS: Record<ThemeMode, string> = {
  DARK: "Sombre",
  LIGHT: "Clair",
  SYSTEM: "Système",
};

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  PRE_QUOTE: "Pré-devis",
  QUOTE: "Devis",
  INVOICE: "Factures",
  CREDIT_NOTE: "Avoirs",
};

export const YEAR_FORMAT_LABELS: Record<YearFormat, string> = {
  YYYY: "Année sur 4 chiffres (2026)",
  YY: "Année sur 2 chiffres (26)",
  NONE: "Sans année",
};

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MEMBER: "Membre",
};

export const LEGAL_FORMS = [
  "Entrepreneur individuel (EI)",
  "EURL",
  "SASU",
  "SARL",
  "SAS",
] as const;
