// Construction des « photographies » de documents à partir des paramètres et des clients.
// Fonctions pures : utilisées par l'application, l'aperçu des paramètres et le seed.

import type { Client, Settings } from "@/generated/prisma/client";
import { toISO } from "@/lib/dates";
import type {
  Buyer,
  DocumentLine,
  DocumentStyle,
  InvoiceSnapshot,
  LegalTexts,
  PreQuoteDocument,
  QuoteDocument,
  Seller,
} from "@/lib/documents/types";

type SellerSettings = Pick<
  Settings,
  | "companyName"
  | "legalForm"
  | "ownerFirstName"
  | "ownerLastName"
  | "ownerTitle"
  | "addressLine1"
  | "addressLine2"
  | "postalCode"
  | "city"
  | "country"
  | "siret"
  | "apeCode"
  | "vatNumber"
  | "email"
  | "phone"
  | "website"
  | "iban"
  | "bic"
  | "bankName"
>;

export function isSoleProprietor(legalForm: string): boolean {
  return /\bEI\b|entrepreneur individuel|micro-?entrepr/i.test(legalForm);
}

export function buildSeller(settings: SellerSettings): Seller {
  return {
    companyName: settings.companyName,
    legalForm: settings.legalForm,
    isSoleProprietor: isSoleProprietor(settings.legalForm),
    ownerName: `${settings.ownerFirstName} ${settings.ownerLastName}`.trim(),
    ownerTitle: settings.ownerTitle,
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    postalCode: settings.postalCode,
    city: settings.city,
    country: settings.country,
    siret: settings.siret,
    apeCode: settings.apeCode,
    vatNumber: settings.vatNumber,
    email: settings.email,
    phone: settings.phone,
    website: settings.website,
    iban: settings.iban,
    bic: settings.bic,
    bankName: settings.bankName,
  };
}

type BuyerClient = Pick<
  Client,
  | "type"
  | "name"
  | "contactName"
  | "siret"
  | "vatNumber"
  | "addressLine1"
  | "addressLine2"
  | "postalCode"
  | "city"
  | "country"
  | "email"
>;

export function buildBuyer(client: BuyerClient): Buyer {
  return {
    type: client.type,
    name: client.name,
    contactName: client.contactName,
    siret: client.siret,
    vatNumber: client.vatNumber,
    addressLine1: client.addressLine1,
    addressLine2: client.addressLine2,
    postalCode: client.postalCode,
    city: client.city,
    country: client.country,
    email: client.email,
  };
}

type StyleSettings = Pick<
  Settings,
  | "docPrimaryColor"
  | "docFont"
  | "docLogoFileId"
  | "signatureFileId"
  | "docShowLogo"
  | "docShowSignature"
  | "docShowOwnerName"
  | "docShowIban"
  | "docShowEmail"
  | "docShowPhone"
  | "docShowWebsite"
  | "docHeaderText"
  | "docFooterText"
>;

export function buildStyle(settings: StyleSettings): DocumentStyle {
  return {
    primaryColor: settings.docPrimaryColor,
    font: settings.docFont,
    logoFileId: settings.docLogoFileId,
    signatureFileId: settings.signatureFileId,
    showLogo: settings.docShowLogo,
    showSignature: settings.docShowSignature,
    showOwnerName: settings.docShowOwnerName,
    showIban: settings.docShowIban,
    showEmail: settings.docShowEmail,
    showPhone: settings.docShowPhone,
    showWebsite: settings.docShowWebsite,
    headerText: settings.docHeaderText,
    footerText: settings.docFooterText,
  };
}

type LegalSettings = Pick<
  Settings,
  | "vatMention"
  | "operationNature"
  | "acceptedPaymentMethods"
  | "latePenaltyText"
  | "recoveryFeeEnabled"
  | "recoveryFeeCents"
  | "earlyPaymentDiscountText"
  | "legalMentions"
>;

export function buildLegal(settings: LegalSettings): LegalTexts {
  return {
    vatMention: settings.vatMention,
    operationNature: settings.operationNature,
    acceptedPaymentMethods: settings.acceptedPaymentMethods,
    latePenaltyText: settings.latePenaltyText,
    recoveryFeeCents: settings.recoveryFeeEnabled ? settings.recoveryFeeCents : null,
    earlyPaymentDiscountText: settings.earlyPaymentDiscountText,
    legalMentions: settings.legalMentions,
  };
}

/** « Paiement à réception » ou « Paiement à 30 jours ». */
export function paymentTermLabel(days: number): string {
  if (days <= 0) return "Paiement à réception de facture";
  return `Paiement à ${days} jours`;
}

// ───────────────────────────── Documents complets ─────────────────────────────

type DocumentSettings = SellerSettings & StyleSettings & LegalSettings & Pick<Settings, "paymentTermDays">;

type LineSource = {
  label: string;
  description: string;
  quantityMilli: number;
  unit: DocumentLine["unit"];
  unitPriceCents: number;
  totalCents: number;
};

function buildLines(lines: LineSource[]): DocumentLine[] {
  return lines.map((line) => ({
    label: line.label,
    description: line.description,
    quantityMilli: line.quantityMilli,
    unit: line.unit,
    unitPriceCents: line.unitPriceCents,
    totalCents: line.totalCents,
  }));
}

export function buildPreQuoteDocument(
  preQuote: {
    number: string;
    title: string;
    issueDate: Date;
    need: string;
    totalDaysMilli: number;
    priceMinCents: number;
    priceMaxCents: number;
    notes: string;
    client: BuyerClient;
    items: { label: string; description: string; daysMilli: number }[];
  },
  settings: DocumentSettings,
): PreQuoteDocument {
  return {
    number: preQuote.number,
    title: preQuote.title,
    issueDate: toISO(preQuote.issueDate),
    seller: buildSeller(settings),
    buyer: buildBuyer(preQuote.client),
    need: preQuote.need,
    items: preQuote.items.map((item) => ({
      label: item.label,
      description: item.description,
      daysMilli: item.daysMilli,
    })),
    totalDaysMilli: preQuote.totalDaysMilli,
    priceMinCents: preQuote.priceMinCents,
    priceMaxCents: preQuote.priceMaxCents,
    notes: preQuote.notes,
    legal: { vatMention: settings.vatMention },
    style: buildStyle(settings),
  };
}

export function buildQuoteDocument(
  quote: {
    number: string;
    title: string;
    issueDate: Date;
    validUntil: Date;
    discountType: QuoteDocument["discountType"];
    discountValue: number;
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
    depositRateBp: number;
    notes: string;
    terms: string;
    client: BuyerClient & { paymentTermDays: number | null };
    lines: LineSource[];
  },
  settings: DocumentSettings,
): QuoteDocument {
  return {
    number: quote.number,
    title: quote.title,
    issueDate: toISO(quote.issueDate),
    validUntil: toISO(quote.validUntil),
    seller: buildSeller(settings),
    buyer: buildBuyer(quote.client),
    lines: buildLines(quote.lines),
    discountType: quote.discountType,
    discountValue: quote.discountValue,
    totals: {
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      totalCents: quote.totalCents,
      depositDeductionCents: 0,
      netCents: quote.totalCents,
    },
    depositRateBp: quote.depositRateBp,
    paymentTermDays: quote.client.paymentTermDays ?? settings.paymentTermDays,
    notes: quote.notes,
    terms: quote.terms,
    legal: buildLegal(settings),
    style: buildStyle(settings),
  };
}

export type InvoiceSnapshotSource = {
  type: InvoiceSnapshot["type"];
  number: string;
  title: string;
  issueDate: Date;
  dueDate: Date;
  serviceStart: Date | null;
  serviceEnd: Date | null;
  paymentTermDays: number;
  discountType: InvoiceSnapshot["discountType"];
  discountValue: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  depositDeductionCents: number;
  netCents: number;
  depositRateBp: number | null;
  notes: string;
  terms: string;
  creditReason: string;
  client: BuyerClient;
  lines: LineSource[];
  quote: { number: string; issueDate: Date } | null;
  creditedInvoice: { number: string | null; issueDate: Date } | null;
  deductedDeposits: { number: string | null; issueDate: Date; netCents: number; creditedCents: number }[];
};

/**
 * Photographie d'une facture au moment de son émission. Elle fige le vendeur, le client,
 * les mentions et le style tels qu'ils étaient ce jour-là.
 */
export function buildInvoiceSnapshot(
  invoice: InvoiceSnapshotSource,
  settings: DocumentSettings,
): InvoiceSnapshot {
  return {
    version: 1,
    currency: "EUR",
    type: invoice.type,
    number: invoice.number,
    title: invoice.title,
    issueDate: toISO(invoice.issueDate),
    dueDate: toISO(invoice.dueDate),
    serviceStart: invoice.serviceStart ? toISO(invoice.serviceStart) : null,
    serviceEnd: invoice.serviceEnd ? toISO(invoice.serviceEnd) : null,
    paymentTermDays: invoice.paymentTermDays,
    seller: buildSeller(settings),
    buyer: buildBuyer(invoice.client),
    lines: buildLines(invoice.lines),
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    totals: {
      subtotalCents: invoice.subtotalCents,
      discountCents: invoice.discountCents,
      totalCents: invoice.totalCents,
      depositDeductionCents: invoice.depositDeductionCents,
      netCents: invoice.netCents,
    },
    deposits: invoice.deductedDeposits.map((deposit) => ({
      number: deposit.number ?? "",
      issueDate: toISO(deposit.issueDate),
      amountCents: deposit.netCents - deposit.creditedCents,
    })),
    quote: invoice.quote
      ? { number: invoice.quote.number, issueDate: toISO(invoice.quote.issueDate) }
      : null,
    creditedInvoice: invoice.creditedInvoice
      ? {
          number: invoice.creditedInvoice.number ?? "",
          issueDate: toISO(invoice.creditedInvoice.issueDate),
        }
      : null,
    creditReason: invoice.creditReason,
    depositRateBp: invoice.depositRateBp,
    notes: invoice.notes,
    terms: invoice.terms,
    legal: buildLegal(settings),
    style: buildStyle(settings),
  };
}
