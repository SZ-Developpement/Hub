// Structures de données des documents commerciaux.
//
// Ce sont des « photographies » autonomes : tout ce qu'il faut pour produire le PDF
// (vendeur, client, lignes, totaux, mentions, style) y figure en clair, sans référence
// à des paramètres modifiables. Une facture émise conserve la sienne (colonne `snapshot`) :
// elle peut être restituée à l'identique des années plus tard, et c'est aussi la base
// d'un futur export structuré (Factur-X) — voir lib/einvoice.

import type {
  ClientType,
  DiscountType,
  DocFont,
  InvoiceType,
  PaymentMethod,
  Unit,
} from "@/generated/prisma/enums";

export type Seller = {
  companyName: string;
  legalForm: string;
  /** Vrai pour un entrepreneur individuel : la mention « EI » est alors obligatoire. */
  isSoleProprietor: boolean;
  ownerName: string;
  ownerTitle: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  siret: string;
  apeCode: string;
  vatNumber: string;
  email: string;
  phone: string;
  website: string;
  iban: string;
  bic: string;
  bankName: string;
};

export type Buyer = {
  type: ClientType;
  name: string;
  contactName: string;
  siret: string;
  vatNumber: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
};

export type DocumentLine = {
  label: string;
  description: string;
  quantityMilli: number;
  unit: Unit;
  unitPriceCents: number;
  totalCents: number;
};

export type DocumentStyle = {
  primaryColor: string;
  font: DocFont;
  logoFileId: string | null;
  signatureFileId: string | null;
  showLogo: boolean;
  showSignature: boolean;
  showOwnerName: boolean;
  showIban: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  headerText: string;
  footerText: string;
};

export type LegalTexts = {
  vatMention: string;
  operationNature: string;
  acceptedPaymentMethods: PaymentMethod[];
  latePenaltyText: string;
  /** Indemnité forfaitaire de recouvrement, `null` si désactivée. */
  recoveryFeeCents: number | null;
  earlyPaymentDiscountText: string;
  legalMentions: string;
};

export type DocumentTotals = {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  depositDeductionCents: number;
  netCents: number;
};

export type DocumentReference = { number: string; issueDate: string };

export type InvoiceSnapshot = {
  version: 1;
  currency: "EUR";
  type: InvoiceType;
  number: string;
  title: string;
  /** Dates au format AAAA-MM-JJ. */
  issueDate: string;
  dueDate: string;
  serviceStart: string | null;
  serviceEnd: string | null;
  paymentTermDays: number;
  seller: Seller;
  buyer: Buyer;
  lines: DocumentLine[];
  discountType: DiscountType;
  discountValue: number;
  totals: DocumentTotals;
  /** Acomptes déduits (facture de solde). */
  deposits: (DocumentReference & { amountCents: number })[];
  /** Devis d'origine. */
  quote: DocumentReference | null;
  /** Facture annulée ou corrigée (avoir). */
  creditedInvoice: DocumentReference | null;
  creditReason: string;
  /** Facture d'acompte : pourcentage du devis (points de base). */
  depositRateBp: number | null;
  notes: string;
  terms: string;
  legal: LegalTexts;
  style: DocumentStyle;
};

export type QuoteDocument = {
  number: string;
  title: string;
  issueDate: string;
  validUntil: string;
  seller: Seller;
  buyer: Buyer;
  lines: DocumentLine[];
  discountType: DiscountType;
  discountValue: number;
  totals: DocumentTotals;
  depositRateBp: number;
  paymentTermDays: number;
  notes: string;
  terms: string;
  legal: LegalTexts;
  style: DocumentStyle;
};

export type PreQuoteDocument = {
  number: string;
  title: string;
  issueDate: string;
  seller: Seller;
  buyer: Buyer;
  need: string;
  items: { label: string; description: string; daysMilli: number }[];
  totalDaysMilli: number;
  priceMinCents: number;
  priceMaxCents: number;
  notes: string;
  legal: Pick<LegalTexts, "vatMention">;
  style: DocumentStyle;
};

/** Images incorporées au PDF (chargées depuis le stockage par l'appelant). */
export type DocumentAssets = {
  logo: Buffer | null;
  signature: Buffer | null;
};
