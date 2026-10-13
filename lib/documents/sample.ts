// Documents d'exemple pour l'aperçu des paramètres : les montants sont fictifs,
// mais le vendeur, le style et les mentions sont ceux de l'organisation.

import { addDays, toISO } from "@/lib/dates";
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
import { applyRate, computeTotals, lineTotalCents } from "@/lib/money";

const SAMPLE_BUYER: Buyer = {
  type: "COMPANY",
  name: "Atelier Lumen SAS",
  contactName: "Camille Roussel",
  siret: "81234567800021",
  vatNumber: "FR40812345678",
  addressLine1: "18 rue des Martyrs",
  addressLine2: "",
  postalCode: "75009",
  city: "Paris",
  country: "France",
  email: "camille@atelier-lumen.fr",
};

function sampleLines(): DocumentLine[] {
  const lines = [
    {
      label: "Conception et maquettes",
      description: "Ateliers de cadrage, arborescence et maquettes haute fidélité.",
      quantityMilli: 3000,
      unit: "DAY" as const,
      unitPriceCents: 52_000,
    },
    {
      label: "Développement du site vitrine",
      description: "Intégration responsive, formulaire de contact, optimisation SEO.",
      quantityMilli: 1000,
      unit: "FLAT" as const,
      unitPriceCents: 320_000,
    },
    {
      label: "Maintenance et hébergement",
      description: "",
      quantityMilli: 6000,
      unit: "MONTH" as const,
      unitPriceCents: 9_000,
    },
  ];
  return lines.map((line) => ({
    ...line,
    totalCents: lineTotalCents(line.quantityMilli, line.unitPriceCents),
  }));
}

type SampleContext = {
  seller: Seller;
  style: DocumentStyle;
  legal: LegalTexts;
  number: string;
  notes: string;
  terms: string;
  paymentTermDays: number;
  today: Date;
};

export function sampleInvoice(ctx: SampleContext, creditNote = false): InvoiceSnapshot {
  const sign = creditNote ? -1 : 1;
  const lines = sampleLines().map((line) => ({
    ...line,
    unitPriceCents: line.unitPriceCents * sign,
    totalCents: line.totalCents * sign,
  }));
  const totals = computeTotals({ lines, discountType: "PERCENT", discountValue: 500 });

  return {
    version: 1,
    currency: "EUR",
    type: creditNote ? "CREDIT_NOTE" : "STANDARD",
    number: ctx.number,
    title: "Refonte du site vitrine",
    issueDate: toISO(ctx.today),
    dueDate: toISO(addDays(ctx.today, ctx.paymentTermDays)),
    serviceStart: toISO(addDays(ctx.today, -30)),
    serviceEnd: toISO(addDays(ctx.today, -1)),
    paymentTermDays: ctx.paymentTermDays,
    seller: ctx.seller,
    buyer: SAMPLE_BUYER,
    lines,
    discountType: "PERCENT",
    discountValue: 500,
    totals,
    deposits: [],
    quote: { number: "D-2026-0007", issueDate: toISO(addDays(ctx.today, -45)) },
    creditedInvoice: creditNote
      ? { number: "F-2026-0012", issueDate: toISO(addDays(ctx.today, -10)) }
      : null,
    creditReason: creditNote ? "Annulation de la commande" : "",
    depositRateBp: null,
    notes: ctx.notes,
    terms: ctx.terms,
    legal: ctx.legal,
    style: ctx.style,
  };
}

export function sampleQuote(ctx: SampleContext & { validityDays: number; depositRateBp: number }): QuoteDocument {
  const lines = sampleLines();
  return {
    number: ctx.number,
    title: "Refonte du site vitrine",
    issueDate: toISO(ctx.today),
    validUntil: toISO(addDays(ctx.today, ctx.validityDays)),
    seller: ctx.seller,
    buyer: SAMPLE_BUYER,
    lines,
    discountType: "PERCENT",
    discountValue: 500,
    totals: computeTotals({ lines, discountType: "PERCENT", discountValue: 500 }),
    depositRateBp: ctx.depositRateBp,
    paymentTermDays: ctx.paymentTermDays,
    notes: ctx.notes,
    terms: ctx.terms,
    legal: ctx.legal,
    style: ctx.style,
  };
}

export function samplePreQuote(ctx: SampleContext): PreQuoteDocument {
  const items = [
    {
      label: "Espace client sécurisé",
      description: "Connexion, gestion du profil, historique des commandes.",
      daysMilli: 4000,
    },
    { label: "Catalogue et moteur de recherche", description: "", daysMilli: 5500 },
    { label: "Paiement en ligne", description: "Intégration Stripe, factures PDF.", daysMilli: 3000 },
    { label: "Back-office d'administration", description: "", daysMilli: 4500 },
  ];
  const totalDaysMilli = items.reduce((sum, item) => sum + item.daysMilli, 0);
  const base = lineTotalCents(totalDaysMilli, 52_000);

  return {
    number: ctx.number,
    title: "Plateforme de commande en ligne",
    issueDate: toISO(ctx.today),
    seller: ctx.seller,
    buyer: SAMPLE_BUYER,
    need: "Permettre aux clients professionnels de passer et suivre leurs commandes en ligne, sans passer par le téléphone.",
    items,
    totalDaysMilli,
    priceMinCents: base - applyRate(base, 1000),
    priceMaxCents: base + applyRate(base, 1500),
    notes: ctx.notes,
    legal: { vatMention: ctx.legal.vatMention },
    style: ctx.style,
  };
}
