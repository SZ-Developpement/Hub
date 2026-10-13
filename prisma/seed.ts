/**
 * Données de démonstration : 18 mois d'activité réaliste pour une micro-entreprise de
 * développement (clients, catalogue, pré-devis, devis, factures, paiements, dépenses,
 * déclarations URSSAF).
 *
 *   pnpm db:seed        → refuse de tourner si la base contient déjà des données
 *   pnpm db:seed:reset  → VIDE la base puis la remplit
 *
 * Le jeu de données est déterministe (générateur pseudo-aléatoire à graine fixe) et se
 * recale sur la date du jour : les graphiques ont toujours 18 mois de recul.
 */
import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import type { Prisma } from "@/generated/prisma/client";
import type { InvoiceType, PaymentMethod, QuoteStatus, Unit } from "@/generated/prisma/enums";
import {
  addDays,
  addMonths,
  endOfMonth,
  maxDate,
  minDate,
  startOfMonth,
  startOfQuarter,
  today,
  utcDate,
} from "@/lib/dates";
import { db } from "@/lib/db";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_SERVICE_CATEGORIES } from "@/lib/defaults";
import { buildInvoiceSnapshot } from "@/lib/documents/build";
import { formatRate } from "@/lib/format";
import { computeInvoiceStatus } from "@/lib/invoice-status";
import { applyRate, computeTotals, lineTotalCents } from "@/lib/money";
import { DEFAULT_NUMBERING, DOCUMENT_KINDS, formatDocumentNumber } from "@/lib/numbering";
import { declarationDueDate, periodsToCover } from "@/lib/urssaf-periods";

const MONTHS_OF_HISTORY = 18;
const TODAY = today();

// ───────────────────────────── Aléa déterministe ─────────────────────────────

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20260412);
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const chance = (probability: number) => random() < probability;
/** Horodatage plausible (heures de bureau) pour un évènement daté. */
const at = (date: Date) =>
  new Date(
    Math.min(
      date.getTime() + between(8, 17) * 3_600_000 + between(0, 59) * 60_000,
      Date.now() - between(5, 90) * 60_000,
    ),
  );

// ───────────────────────────── Référentiels ─────────────────────────────

const CLIENTS = [
  { key: "lumen", type: "COMPANY", name: "Atelier Lumen SAS", contactName: "Camille Roussel", contactRole: "Directrice", email: "camille@atelier-lumen.fr", phone: "04 72 10 22 31", siret: "81234567800021", vatNumber: "FR40812345678", addressLine1: "18 rue des Martyrs", postalCode: "75009", city: "Paris", payDelay: [8, 22] },
  { key: "nordik", type: "COMPANY", name: "Nordik Outdoor", contactName: "Julien Marchal", contactRole: "Responsable e-commerce", email: "j.marchal@nordik-outdoor.fr", phone: "03 20 55 18 70", siret: "53198765400034", vatNumber: "FR12531987654", addressLine1: "42 boulevard de la Liberté", postalCode: "59000", city: "Lille", payDelay: [25, 48] },
  { key: "verger", type: "COMPANY", name: "Les Vergers du Pilat", contactName: "Hélène Faure", contactRole: "Gérante", email: "contact@vergers-pilat.fr", phone: "04 77 39 61 02", siret: "44876543200018", vatNumber: "", addressLine1: "Lieu-dit La Croix", postalCode: "42410", city: "Pélussin", payDelay: [5, 18] },
  { key: "cabinet", type: "COMPANY", name: "Cabinet Morel & Associés", contactName: "Antoine Morel", contactRole: "Avocat associé", email: "a.morel@morel-avocats.fr", phone: "04 78 62 14 90", siret: "49012345600027", vatNumber: "FR68490123456", addressLine1: "7 place Bellecour", postalCode: "69002", city: "Lyon", payDelay: [30, 58] },
  { key: "studio", type: "COMPANY", name: "Studio Kiwi", contactName: "Inès Benali", contactRole: "Cheffe de projet", email: "ines@studiokiwi.fr", phone: "05 56 44 23 81", siret: "88765432100015", vatNumber: "FR27887654321", addressLine1: "15 quai des Chartrons", postalCode: "33000", city: "Bordeaux", payDelay: [10, 28] },
  { key: "asso", type: "COMPANY", name: "Association Cap Rando", contactName: "Bernard Tissot", contactRole: "Trésorier", email: "tresorerie@caprando.org", phone: "04 76 51 30 44", siret: "32165498700029", vatNumber: "", addressLine1: "3 rue de la Poste", postalCode: "38000", city: "Grenoble", payDelay: [12, 35] },
  { key: "immo", type: "COMPANY", name: "Presqu'île Immobilier", contactName: "Sophie Lambert", contactRole: "Directrice d'agence", email: "s.lambert@presquile-immo.fr", phone: "04 72 41 55 20", siret: "79456123000041", vatNumber: "FR55794561230", addressLine1: "28 rue de la République", postalCode: "69002", city: "Lyon", payDelay: [15, 40] },
  { key: "boulangerie", type: "COMPANY", name: "Maison Girard — Boulangerie", contactName: "Paul Girard", contactRole: "Artisan boulanger", email: "paul@maison-girard.fr", phone: "04 78 28 09 13", siret: "51234098700012", vatNumber: "", addressLine1: "11 rue Mercière", postalCode: "69002", city: "Lyon", payDelay: [3, 14] },
  { key: "dupont", type: "INDIVIDUAL", name: "Marie Dupont", contactName: "", contactRole: "", email: "marie.dupont@example.fr", phone: "06 12 45 78 90", siret: "", vatNumber: "", addressLine1: "9 allée des Tilleuls", postalCode: "69300", city: "Caluire-et-Cuire", payDelay: [2, 12] },
  { key: "leroy", type: "INDIVIDUAL", name: "Thomas Leroy", contactName: "", contactRole: "", email: "thomas.leroy@example.fr", phone: "06 98 76 54 32", siret: "", vatNumber: "", addressLine1: "54 avenue Jean Jaurès", postalCode: "69007", city: "Lyon", payDelay: [4, 20] },
  { key: "clinique", type: "COMPANY", name: "Clinique Vétérinaire des Monts d'Or", contactName: "Dr Claire Besson", contactRole: "Vétérinaire associée", email: "accueil@vet-montsdor.fr", phone: "04 78 22 71 18", siret: "83012765400019", vatNumber: "FR90830127654", addressLine1: "2 chemin du Vallon", postalCode: "69450", city: "Saint-Cyr-au-Mont-d'Or", payDelay: [18, 38] },
  { key: "garage", type: "COMPANY", name: "Garage Perrin", contactName: "Luc Perrin", contactRole: "Gérant", email: "garage.perrin@example.fr", phone: "04 74 60 12 47", siret: "40987612300025", vatNumber: "", addressLine1: "Zone artisanale des Platières", postalCode: "69440", city: "Mornant", payDelay: [35, 70] },
] as const;

type ClientKey = (typeof CLIENTS)[number]["key"];

// Catégories : index dans DEFAULT_SERVICE_CATEGORIES.
const SERVICES = [
  { key: "site", name: "Site vitrine", description: "Conception et développement d'un site vitrine jusqu'à 5 pages.", category: 0, unit: "FLAT", price: 180_000 },
  { key: "page", name: "Page supplémentaire", description: "Page de contenu intégrée à la charte du site.", category: 0, unit: "UNIT", price: 18_000 },
  { key: "dev", name: "Développement sur mesure", description: "Développement d'applications web (TJM).", category: 1, unit: "DAY", price: 45_000 },
  { key: "api", name: "Intégration API et paiement", description: "Connexion à un service tiers (Stripe, CRM, ERP).", category: 1, unit: "FLAT", price: 90_000 },
  { key: "maintenance", name: "Maintenance mensuelle", description: "Mises à jour, sauvegardes et corrections mineures.", category: 2, unit: "MONTH", price: 15_000 },
  { key: "hosting", name: "Hébergement et supervision", description: "Hébergement managé, certificat TLS, surveillance.", category: 2, unit: "MONTH", price: 9_000 },
  { key: "hour", name: "Intervention ponctuelle", description: "Correctif ou évolution à la demande.", category: 2, unit: "HOUR", price: 6_500 },
  { key: "audit", name: "Audit technique", description: "Revue de code, performances et sécurité, avec rapport.", category: 3, unit: "FLAT", price: 65_000 },
  { key: "workshop", name: "Atelier de cadrage", description: "Atelier de définition du besoin et du périmètre.", category: 3, unit: "DAY", price: 48_000 },
  { key: "design", name: "Maquettes UI", description: "Maquettes haute fidélité et prototype cliquable.", category: 4, unit: "DAY", price: 42_000 },
  { key: "integration", name: "Intégration responsive", description: "Intégration HTML/CSS adaptée mobile et tablette.", category: 4, unit: "FLAT", price: 70_000 },
] as const;

type ServiceKey = (typeof SERVICES)[number]["key"];
type LineSpec = { service: ServiceKey; quantityMilli: number };

const PROJECTS: { title: string; need: string; lines: () => LineSpec[] }[] = [
  {
    title: "Création d'un site vitrine",
    need: "Présenter l'activité, rassurer les prospects et permettre la prise de contact en ligne.",
    lines: () => [
      { service: "site", quantityMilli: 1000 },
      { service: "page", quantityMilli: between(1, 4) * 1000 },
    ],
  },
  {
    title: "Refonte de la page d'accueil",
    need: "Moderniser la page d'accueil, jugée datée, et améliorer le taux de conversion.",
    lines: () => [
      { service: "design", quantityMilli: pick([1000, 1500, 2000]) },
      { service: "integration", quantityMilli: 1000 },
    ],
  },
  {
    title: "Audit technique et recommandations",
    need: "Comprendre les lenteurs du site actuel et prioriser les corrections.",
    lines: () => [
      { service: "audit", quantityMilli: 1000 },
      { service: "workshop", quantityMilli: 500 },
    ],
  },
  {
    title: "Module de réservation en ligne",
    need: "Laisser les clients réserver et payer un créneau sans passer par le téléphone.",
    lines: () => [
      { service: "dev", quantityMilli: between(3, 6) * 1000 },
      { service: "api", quantityMilli: 1000 },
    ],
  },
  {
    title: "Évolutions et correctifs",
    need: "Lot de petites évolutions demandées par l'équipe.",
    lines: () => [{ service: "hour", quantityMilli: between(4, 12) * 1000 }],
  },
  {
    title: "Tableau de bord interne",
    need: "Suivre l'activité au quotidien sans tableur partagé.",
    lines: () => [
      { service: "workshop", quantityMilli: 1000 },
      { service: "dev", quantityMilli: between(2, 4) * 1000 + pick([0, 500]) },
    ],
  },
];

const RECURRING_EXPENSES = [
  { supplier: "Vercel", label: "Abonnement Pro", category: 1, amount: 1_900 },
  { supplier: "Google Workspace", label: "Messagerie professionnelle", category: 0, amount: 690 },
  { supplier: "Notion", label: "Abonnement Plus", category: 0, amount: 950 },
  { supplier: "Qonto", label: "Compte professionnel", category: 4, amount: 1_100 },
  { supplier: "Hiscox", label: "Responsabilité civile professionnelle", category: 4, amount: 2_850 },
  { supplier: "Free Pro", label: "Fibre et forfait mobile", category: 3, amount: 3_999 },
] as const;

const OCCASIONAL_EXPENSES = [
  { supplier: "SNCF Connect", label: "Déplacement client", category: 5, amount: [3_800, 12_400] },
  { supplier: "Le Bouillon Paul", label: "Déjeuner client", category: 6, amount: [2_400, 6_800] },
  { supplier: "Gandi", label: "Renouvellement de nom de domaine", category: 1, amount: [1_559, 2_390] },
  { supplier: "LDLC", label: "Petit matériel", category: 2, amount: [2_990, 18_900] },
  { supplier: "Udemy", label: "Formation en ligne", category: 7, amount: [1_499, 8_999] },
  { supplier: "JetBrains", label: "Licence annuelle", category: 0, amount: [8_900, 15_900] },
] as const;

// ───────────────────────────── Plans de documents ─────────────────────────────

type PlanLine = {
  serviceKey: ServiceKey | null;
  label: string;
  description: string;
  quantityMilli: number;
  unit: Unit;
  unitPriceCents: number;
};

function projectLines(specs: LineSpec[]): PlanLine[] {
  return specs.map((spec) => {
    const service = SERVICES.find((item) => item.key === spec.service)!;
    return {
      serviceKey: service.key,
      label: service.name,
      description: service.description,
      quantityMilli: spec.quantityMilli,
      unit: service.unit,
      unitPriceCents: service.price,
    };
  });
}

type PreQuotePlan = {
  id: number;
  client: ClientKey;
  date: Date;
  title: string;
  need: string;
  lines: PlanLine[];
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED";
};

type QuotePlan = {
  id: number;
  client: ClientKey;
  date: Date;
  title: string;
  lines: PlanLine[];
  discountBp: number;
  status: QuoteStatus;
  validUntil: Date;
  acceptedOn: Date | null;
  preQuote: number | null;
};

type PaymentPlan = { date: Date; amountCents: number; method: PaymentMethod };

type InvoicePlan = {
  id: number;
  client: ClientKey;
  type: InvoiceType;
  date: Date;
  title: string;
  lines: PlanLine[];
  discountBp: number;
  termDays: number;
  serviceStart: Date | null;
  serviceEnd: Date | null;
  quote: number | null;
  /** Facture de solde : plans des acomptes à déduire. */
  deposits: number[];
  depositRateBp: number | null;
  /** Avoir : plan de la facture annulée. */
  credits: number | null;
  payments: PaymentPlan[];
  reminders: { date: Date; level: number }[];
  draft: boolean;
};

const preQuotePlans: PreQuotePlan[] = [];
const quotePlans: QuotePlan[] = [];
const invoicePlans: InvoicePlan[] = [];
let planId = 0;

const netOf = (plan: Pick<InvoicePlan, "lines" | "discountBp">) =>
  computeTotals({
    lines: plan.lines,
    discountType: plan.discountBp > 0 ? "PERCENT" : "NONE",
    discountValue: plan.discountBp,
  }).totalCents;

/** Paiement(s) d'une facture selon les habitudes du client ; rien si l'échéance n'est pas atteinte. */
function planPayments(client: ClientKey, issueDate: Date, amountCents: number): PaymentPlan[] {
  const [min, max] = CLIENTS.find((item) => item.key === client)!.payDelay;
  const date = addDays(issueDate, between(min, max));
  if (date > TODAY) return [];
  const method: PaymentMethod = chance(0.82) ? "TRANSFER" : pick(["CHECK", "CARD"] as const);
  return [{ date, amountCents, method }];
}

function addInvoice(plan: Omit<InvoicePlan, "id" | "payments" | "reminders" | "draft" | "credits"> & { unpaid?: boolean }) {
  const { unpaid, ...rest } = plan;
  const amount =
    netOf(rest) -
    rest.deposits.reduce((sum, id) => sum + netOf(invoicePlans.find((item) => item.id === id)!), 0);
  const invoice: InvoicePlan = {
    ...rest,
    id: ++planId,
    credits: null,
    payments: unpaid ? [] : planPayments(rest.client, rest.date, amount),
    reminders: [],
    draft: false,
  };
  invoicePlans.push(invoice);
  return invoice;
}

function planProject(month: Date, recent: boolean) {
  const project = pick(PROJECTS);
  const clientPool = CLIENTS.filter((item) => item.key !== "boulangerie" && item.key !== "verger");
  const client = pick(clientPool).key;
  const date = minDate(addDays(month, between(1, 26)), TODAY);
  const lines = projectLines(project.lines());
  const discountBp = chance(0.18) ? pick([500, 1000]) : 0;

  let preQuote: number | null = null;
  if (chance(0.45)) {
    const plan: PreQuotePlan = {
      id: ++planId,
      client,
      date: addDays(date, -between(5, 15)),
      title: project.title,
      need: project.need,
      lines,
      status: "ACCEPTED",
    };
    preQuotePlans.push(plan);
    preQuote = plan.id;
  }

  const roll = random();
  let status: QuoteStatus;
  if (recent) status = roll < 0.55 ? "SENT" : roll < 0.8 ? "ACCEPTED" : "DRAFT";
  else status = roll < 0.66 ? "ACCEPTED" : roll < 0.86 ? "DECLINED" : "EXPIRED";

  const acceptedOn = status === "ACCEPTED" ? minDate(addDays(date, between(2, 12)), TODAY) : null;
  const quote: QuotePlan = {
    id: ++planId,
    client,
    date,
    title: project.title,
    lines,
    discountBp,
    status,
    validUntil: addDays(date, 30),
    acceptedOn,
    preQuote,
  };
  quotePlans.push(quote);
  if (!acceptedOn) return;

  const total = netOf(quote);
  const termDays = pick([30, 30, 30, 45, 15]);
  const base = {
    client,
    title: project.title,
    discountBp,
    termDays,
    quote: quote.id,
  };

  if (total >= 150_000) {
    // Acompte de 30 % à la commande, solde à la livraison.
    const depositRateBp = 3000;
    const depositDate = minDate(addDays(acceptedOn, between(0, 2)), TODAY);
    const deposit = addInvoice({
      ...base,
      type: "DEPOSIT",
      date: depositDate,
      discountBp: 0,
      lines: [
        {
          serviceKey: lines[0].serviceKey,
          label: `Acompte de ${formatRate(depositRateBp)} sur le devis`,
          description: project.title,
          quantityMilli: 1000,
          unit: "FLAT",
          unitPriceCents: applyRate(total, depositRateBp),
        },
      ],
      serviceStart: null,
      serviceEnd: null,
      deposits: [],
      depositRateBp,
    });
    const balanceDate = addDays(acceptedOn, between(20, 45));
    if (balanceDate <= TODAY) {
      addInvoice({
        ...base,
        type: "BALANCE",
        date: balanceDate,
        lines,
        serviceStart: acceptedOn,
        serviceEnd: addDays(balanceDate, -1),
        deposits: [deposit.id],
        depositRateBp: null,
      });
    }
  } else {
    const invoiceDate = addDays(acceptedOn, between(7, 25));
    if (invoiceDate <= TODAY) {
      addInvoice({
        ...base,
        type: "STANDARD",
        date: invoiceDate,
        lines,
        serviceStart: acceptedOn,
        serviceEnd: addDays(invoiceDate, -1),
        deposits: [],
        depositRateBp: null,
      });
    }
  }
}

function planData() {
  const firstMonth = startOfMonth(addMonths(TODAY, -(MONTHS_OF_HISTORY - 1)));

  for (let index = 0; index < MONTHS_OF_HISTORY; index++) {
    const month = addMonths(firstMonth, index);
    const recent = addDays(month, 26) > addDays(TODAY, -40);

    // Contrats récurrents : facturés en début de mois pour le mois écoulé.
    if (index > 0) {
      for (const [client, service] of [["boulangerie", "maintenance"], ["verger", "hosting"]] as const) {
        const date = addDays(month, between(0, 3));
        if (date > TODAY) continue;
        const previousMonth = addMonths(month, -1);
        addInvoice({
          client,
          type: "STANDARD",
          date,
          title: `${SERVICES.find((item) => item.key === service)!.name} — ${previousMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}`,
          lines: projectLines([{ service, quantityMilli: 1000 }]),
          discountBp: 0,
          termDays: 30,
          serviceStart: previousMonth,
          serviceEnd: endOfMonth(previousMonth),
          quote: null,
          deposits: [],
          depositRateBp: null,
        });
      }
    }

    const projects = 2 + (chance(0.5) ? 1 : 0) + (chance(0.2) ? 1 : 0);
    for (let count = 0; count < projects; count++) {
      if (addDays(month, 1) <= TODAY) planProject(month, recent);
    }

    // Pré-devis restés sans suite.
    if (chance(0.4) && addDays(month, 10) <= TODAY) {
      const project = pick(PROJECTS);
      preQuotePlans.push({
        id: ++planId,
        client: pick(CLIENTS).key,
        date: addDays(month, between(2, 24)) > TODAY ? TODAY : addDays(month, between(2, 24)),
        title: project.title,
        need: project.need,
        lines: projectLines(project.lines()),
        status: recent ? pick(["SENT", "DRAFT"] as const) : pick(["DECLINED", "SENT"] as const),
      });
    }
  }

  // ── Situations particulières, pour que chaque écran ait de quoi montrer ──

  // Deux factures en retard, relancées.
  for (const [client, daysAgo, project] of [["garage", 62, 4], ["cabinet", 48, 2]] as const) {
    const date = addDays(TODAY, -daysAgo);
    const invoice = addInvoice({
      client,
      type: "STANDARD",
      date,
      title: PROJECTS[project].title,
      lines: projectLines(PROJECTS[project].lines()),
      discountBp: 0,
      termDays: 30,
      serviceStart: addDays(date, -14),
      serviceEnd: addDays(date, -1),
      quote: null,
      deposits: [],
      depositRateBp: null,
      unpaid: true,
    });
    invoice.reminders.push({ date: addDays(date, 37), level: 1 });
    if (daysAgo > 55) invoice.reminders.push({ date: addDays(date, 50), level: 2 });
  }

  // Une facture réglée pour moitié.
  const partial = addInvoice({
    client: "studio",
    type: "STANDARD",
    date: addDays(TODAY, -24),
    title: "Tableau de bord interne",
    lines: projectLines([
      { service: "workshop", quantityMilli: 1000 },
      { service: "dev", quantityMilli: 3000 },
    ]),
    discountBp: 0,
    termDays: 45,
    serviceStart: addDays(TODAY, -45),
    serviceEnd: addDays(TODAY, -25),
    quote: null,
    deposits: [],
    depositRateBp: null,
    unpaid: true,
  });
  partial.payments.push({
    date: addDays(TODAY, -9),
    amountCents: Math.round(netOf(partial) / 2),
    method: "TRANSFER",
  });

  // Une facture annulée par un avoir, six mois plus tôt.
  const cancelledDate = addDays(TODAY, -185);
  const cancelled = addInvoice({
    client: "asso",
    type: "STANDARD",
    date: cancelledDate,
    title: "Audit technique et recommandations",
    lines: projectLines([{ service: "audit", quantityMilli: 1000 }]),
    discountBp: 0,
    termDays: 30,
    serviceStart: addDays(cancelledDate, -10),
    serviceEnd: addDays(cancelledDate, -1),
    quote: null,
    deposits: [],
    depositRateBp: null,
    unpaid: true,
  });
  invoicePlans.push({
    ...cancelled,
    id: ++planId,
    type: "CREDIT_NOTE",
    date: addDays(cancelledDate, 9),
    lines: cancelled.lines.map((line) => ({ ...line, unitPriceCents: -line.unitPriceCents })),
    credits: cancelled.id,
    payments: [],
    reminders: [],
  });

  // Un brouillon en cours de préparation.
  invoicePlans.push({
    id: ++planId,
    client: "immo",
    type: "STANDARD",
    date: TODAY,
    title: "Évolutions et correctifs",
    lines: projectLines([{ service: "hour", quantityMilli: 6000 }]),
    discountBp: 0,
    termDays: 30,
    serviceStart: addDays(TODAY, -12),
    serviceEnd: addDays(TODAY, -1),
    quote: null,
    deposits: [],
    depositRateBp: null,
    credits: null,
    payments: [],
    reminders: [],
    draft: true,
  });

  // Deux devis envoyés qui arrivent à expiration : de quoi alimenter les alertes.
  const expiring = quotePlans.filter((quote) => quote.status === "SENT").slice(-2);
  expiring.forEach((quote, index) => {
    quote.validUntil = addDays(TODAY, 2 + index * 3);
  });
}

// ───────────────────────────── Écriture en base ─────────────────────────────

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "user", organization, verification, rate_limit RESTART IDENTITY CASCADE',
  );
}

async function main() {
  const shouldReset = process.argv.includes("--reset") || process.env.SEED_RESET === "1";
  if ((await db.user.count()) > 0) {
    if (!shouldReset) {
      console.error(
        "La base contient déjà des données. Lancez « pnpm db:seed:reset » pour la VIDER et la re-remplir.",
      );
      process.exit(1);
    }
    await reset();
  }

  const email = (process.env.SEED_USER_EMAIL ?? "demo@szdev.fr").toLowerCase();
  const password = process.env.SEED_USER_PASSWORD;
  if (!password || password.length < 10) {
    console.error("Définissez SEED_USER_PASSWORD (10 caractères minimum) dans .env avant de lancer le seed.");
    process.exit(1);
  }

  planData();
  const activityStart = startOfMonth(addMonths(TODAY, -(MONTHS_OF_HISTORY - 1)));

  // ── Compte, organisation, paramètres
  const userId = crypto.randomUUID().replace(/-/g, "");
  await db.user.create({ data: { id: userId, name: "Alexis Démo", email } });
  await db.account.create({
    data: {
      id: crypto.randomUUID().replace(/-/g, ""),
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(password),
    },
  });
  const organization = await db.organization.create({ data: { name: "SZ Dev" } });
  const organizationId = organization.id;
  await db.member.create({ data: { organizationId, userId, role: "OWNER" } });
  const settings = await db.settings.create({
    data: {
      organizationId,
      companyName: "SZ Dev",
      appName: "SZ Dev",
      addressLine1: "12 rue de la République",
      postalCode: "69002",
      city: "Lyon",
      siret: "90123456700018",
      apeCode: "6201Z",
      email: "contact@szdev.fr",
      phone: "06 12 34 56 78",
      website: "szdev.fr",
      ownerFirstName: "Alexis",
      ownerLastName: "Démo",
      ownerTitle: "Fondateur",
      iban: "FR7630006000011234567890189",
      bic: "AGRIFRPP",
      bankName: "Crédit Agricole",
      activityStartDate: activityStart,
      docHeaderText: "Développement web et applications sur mesure",
      quoteDefaultTerms:
        "Devis établi sur la base des éléments communiqués. Toute demande complémentaire fera l'objet d'un avenant.",
      invoiceDefaultTerms:
        "Les livrables restent la propriété de SZ Dev jusqu'au paiement complet de la facture.",
      acceptedPaymentMethods: ["TRANSFER", "CHECK"],
    },
  });
  await db.numberingFormat.createMany({
    data: DOCUMENT_KINDS.map((kind) => ({ organizationId, kind, ...DEFAULT_NUMBERING[kind] })),
  });
  // Taux d'exemple : à remplacer par ceux communiqués par l'URSSAF pour votre activité.
  await db.contributionRate.createMany({
    data: [
      { organizationId, effectiveFrom: utcDate(2024, 6, 1), socialRateBp: 2310, cfpRateBp: 20, note: "Exemple — à vérifier" },
      { organizationId, effectiveFrom: utcDate(2025, 0, 1), socialRateBp: 2460, cfpRateBp: 20, note: "Exemple — à vérifier" },
      { organizationId, effectiveFrom: utcDate(2026, 0, 1), socialRateBp: 2610, cfpRateBp: 20, note: "Exemple — à vérifier" },
    ],
  });

  // ── Catalogue et clients
  await db.serviceCategory.createMany({
    data: DEFAULT_SERVICE_CATEGORIES.map((name, position) => ({ organizationId, name, position })),
  });
  const categories = await db.serviceCategory.findMany({ where: { organizationId }, orderBy: { position: "asc" } });
  const serviceIds = new Map<ServiceKey, { id: string; categoryId: string }>();
  for (const service of SERVICES) {
    const created = await db.service.create({
      data: {
        organizationId,
        categoryId: categories[service.category].id,
        name: service.name,
        description: service.description,
        unit: service.unit,
        unitPriceCents: service.price,
      },
    });
    serviceIds.set(service.key, { id: created.id, categoryId: categories[service.category].id });
  }

  const clients = new Map<ClientKey, Awaited<ReturnType<typeof db.client.create>>>();
  for (const { key, payDelay: _payDelay, ...client } of CLIENTS) {
    clients.set(
      key,
      await db.client.create({
        data: { ...client, organizationId, createdAt: at(addDays(activityStart, -between(1, 20))) },
      }),
    );
  }

  const activities: Prisma.ActivityLogCreateManyInput[] = [];
  const log = (date: Date, action: string, entity: Prisma.ActivityLogCreateManyInput["entity"], entityId: string, summary: string, amountCents?: number) =>
    activities.push({ organizationId, userId, action, entity, entityId, summary, amountCents, createdAt: at(date) });

  const lineData = (lines: PlanLine[]) =>
    lines.map((line, position) => {
      const service = line.serviceKey ? serviceIds.get(line.serviceKey) : undefined;
      return {
        position,
        serviceId: line.label.startsWith("Acompte") ? null : (service?.id ?? null),
        categoryId: service?.categoryId ?? null,
        label: line.label,
        description: line.description,
        quantityMilli: line.quantityMilli,
        unit: line.unit,
        unitPriceCents: line.unitPriceCents,
        totalCents: lineTotalCents(line.quantityMilli, line.unitPriceCents),
      };
    });

  const counters = new Map<string, number>();
  const nextNumber = (kind: (typeof DOCUMENT_KINDS)[number], date: Date) => {
    const year = date.getUTCFullYear();
    const key = `${kind}:${year}`;
    const value = (counters.get(key) ?? 0) + 1;
    counters.set(key, value);
    return { number: formatDocumentNumber(DEFAULT_NUMBERING[kind], year, value), year, value };
  };

  // ── Pré-devis
  const preQuoteIds = new Map<number, string>();
  for (const plan of [...preQuotePlans].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const client = clients.get(plan.client)!;
    const { number } = nextNumber("PRE_QUOTE", plan.date);
    const days = plan.lines.reduce(
      (sum, line) => sum + (line.unit === "DAY" ? line.quantityMilli : Math.round((line.quantityMilli * line.unitPriceCents) / 45_000)),
      0,
    );
    const base = plan.lines.reduce((sum, line) => sum + lineTotalCents(line.quantityMilli, line.unitPriceCents), 0);
    const created = await db.preQuote.create({
      data: {
        organizationId,
        clientId: client.id,
        number,
        title: plan.title,
        status: plan.status,
        issueDate: plan.date,
        need: plan.need,
        dailyRateCents: 45_000,
        totalDaysMilli: Math.round(days / 500) * 500,
        priceMinCents: Math.floor((base * 0.9) / 5000) * 5000,
        priceMaxCents: Math.ceil((base * 1.2) / 5000) * 5000,
        sentOn: plan.status === "DRAFT" ? null : plan.date,
        respondedOn: plan.status === "ACCEPTED" || plan.status === "DECLINED" ? addDays(plan.date, between(2, 9)) : null,
        createdAt: at(plan.date),
        items: {
          create: plan.lines.map((line, position) => ({
            position,
            label: line.label,
            description: line.description,
            daysMilli: line.unit === "DAY" ? line.quantityMilli : Math.round((line.quantityMilli * line.unitPriceCents) / 45_000 / 500) * 500,
          })),
        },
      },
    });
    preQuoteIds.set(plan.id, created.id);
    log(plan.date, "pre_quote.created", "PRE_QUOTE", created.id, `Pré-devis ${number} créé — ${client.name}`, created.priceMaxCents);
  }

  // ── Devis
  const quotes = new Map<number, { id: string; number: string; issueDate: Date }>();
  for (const plan of [...quotePlans].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const client = clients.get(plan.client)!;
    const { number } = nextNumber("QUOTE", plan.date);
    const lines = lineData(plan.lines);
    const totals = computeTotals({
      lines,
      discountType: plan.discountBp > 0 ? "PERCENT" : "NONE",
      discountValue: plan.discountBp,
    });
    const sent = plan.status !== "DRAFT";
    const created = await db.quote.create({
      data: {
        organizationId,
        clientId: client.id,
        preQuoteId: plan.preQuote ? preQuoteIds.get(plan.preQuote) : null,
        number,
        title: plan.title,
        status: plan.status,
        issueDate: plan.date,
        validUntil: plan.validUntil,
        discountType: plan.discountBp > 0 ? "PERCENT" : "NONE",
        discountValue: plan.discountBp,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        totalCents: totals.totalCents,
        depositRateBp: totals.totalCents >= 150_000 ? 3000 : 0,
        terms: settings.quoteDefaultTerms,
        sentOn: sent ? plan.date : null,
        acceptedOn: plan.acceptedOn,
        declinedOn: plan.status === "DECLINED" ? addDays(plan.date, between(4, 20)) : null,
        createdAt: at(plan.date),
        lines: { create: lines },
      },
    });
    quotes.set(plan.id, { id: created.id, number, issueDate: plan.date });
    log(plan.date, "quote.created", "QUOTE", created.id, `Devis ${number} créé — ${client.name}`, totals.totalCents);
    if (plan.acceptedOn) {
      log(plan.acceptedOn, "quote.accepted", "QUOTE", created.id, `Devis ${number} accepté — ${client.name}`, totals.totalCents);
    }
  }

  // ── Factures et avoirs, dans l'ordre chronologique (la numérotation en dépend)
  const invoices = new Map<number, { id: string; number: string | null; issueDate: Date; netCents: number }>();
  const ordered = [...invoicePlans].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.id - b.id,
  );
  for (const plan of ordered) {
    const client = clients.get(plan.client)!;
    const quote = plan.quote ? quotes.get(plan.quote)! : null;
    const credited = plan.credits ? invoices.get(plan.credits)! : null;
    const deposits = plan.deposits.map((id) => invoices.get(id)!);
    const isCreditNote = plan.type === "CREDIT_NOTE";
    const lines = lineData(plan.lines).map((line) =>
      plan.type === "DEPOSIT" && quote ? { ...line, label: `${line.label} ${quote.number}` } : line,
    );
    const totals = computeTotals({
      lines,
      discountType: plan.discountBp > 0 ? "PERCENT" : "NONE",
      discountValue: plan.discountBp,
      depositDeductionCents: deposits.reduce((sum, deposit) => sum + deposit.netCents, 0),
    });
    const dueDate = isCreditNote ? plan.date : addDays(plan.date, plan.termDays);
    const allocated = plan.draft ? null : nextNumber(isCreditNote ? "CREDIT_NOTE" : "INVOICE", plan.date);

    const paidCents = plan.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const creditPlan = invoicePlans.find((item) => item.credits === plan.id);
    const creditedCents = creditPlan ? totals.netCents : 0;
    const status = computeInvoiceStatus(
      { type: plan.type, issued: !plan.draft, netCents: totals.netCents, paidCents, creditedCents, dueDate },
      TODAY,
    );
    const lastPayment = plan.payments.reduce<Date | null>(
      (latest, payment) => (latest ? maxDate(latest, payment.date) : payment.date),
      null,
    );

    const base = {
      type: plan.type,
      title: plan.title,
      issueDate: plan.date,
      dueDate,
      serviceStart: isCreditNote ? null : plan.serviceStart,
      serviceEnd: isCreditNote ? null : plan.serviceEnd,
      paymentTermDays: isCreditNote ? 0 : plan.termDays,
      discountType: plan.discountBp > 0 ? ("PERCENT" as const) : ("NONE" as const),
      discountValue: plan.discountBp,
      ...totals,
      depositRateBp: plan.depositRateBp,
      notes: "",
      terms: isCreditNote ? "" : settings.invoiceDefaultTerms,
      creditReason: isCreditNote ? "Annulation de la commande à la demande du client" : "",
    };
    const snapshot = allocated
      ? buildInvoiceSnapshot(
          {
            ...base,
            number: allocated.number,
            client,
            lines,
            quote,
            creditedInvoice: credited,
            deductedDeposits: deposits.map((deposit) => ({ ...deposit, creditedCents: 0 })),
          },
          settings,
        )
      : null;

    const created = await db.invoice.create({
      data: {
        ...base,
        organizationId,
        clientId: client.id,
        quoteId: quote?.id ?? null,
        status,
        number: allocated?.number ?? null,
        sequenceYear: allocated?.year ?? null,
        sequenceValue: allocated?.value ?? null,
        paidCents,
        creditedCents,
        paidOn: status === "PAID" ? lastPayment : null,
        creditedInvoiceId: credited?.id ?? null,
        issuedAt: allocated ? at(plan.date) : null,
        snapshot: snapshot ? (snapshot as unknown as Prisma.InputJsonValue) : undefined,
        createdAt: at(plan.date),
        lines: { create: lines },
        payments: {
          create: plan.payments.map((payment) => ({
            organizationId,
            paidOn: payment.date,
            amountCents: payment.amountCents,
            method: payment.method,
            createdAt: at(payment.date),
          })),
        },
        reminders: {
          create: plan.reminders
            .filter((reminder) => reminder.date <= TODAY)
            .map((reminder) => ({
              organizationId,
              sentOn: reminder.date,
              level: reminder.level,
              channel: "EMAIL" as const,
              note: reminder.level === 1 ? "Relance par e-mail, sans réponse." : "Second rappel, paiement promis sous quinzaine.",
            })),
        },
      },
    });
    invoices.set(plan.id, {
      id: created.id,
      number: created.number,
      issueDate: plan.date,
      netCents: totals.netCents,
    });
    if (deposits.length > 0) {
      await db.invoice.updateMany({
        where: { id: { in: deposits.map((deposit) => deposit.id) } },
        data: { balanceInvoiceId: created.id },
      });
    }

    if (allocated) {
      log(
        plan.date,
        isCreditNote ? "credit_note.issued" : "invoice.issued",
        "INVOICE",
        created.id,
        isCreditNote
          ? `Avoir ${allocated.number} émis sur ${credited?.number} — ${client.name}`
          : `Facture ${allocated.number} émise — ${client.name}`,
        totals.netCents,
      );
      for (const payment of plan.payments) {
        log(payment.date, "payment.recorded", "PAYMENT", created.id, `Paiement reçu pour ${allocated.number} — ${client.name}`, payment.amountCents);
      }
    }
  }

  // ── Compteurs de numérotation : la suite reprend là où le jeu de données s'arrête
  await db.numberCounter.createMany({
    data: [...counters.entries()].map(([key, lastValue]) => {
      const [kind, year] = key.split(":");
      return { organizationId, kind: kind as (typeof DOCUMENT_KINDS)[number], year: Number(year), lastValue };
    }),
  });

  // ── Dépenses
  await db.expenseCategory.createMany({
    data: DEFAULT_EXPENSE_CATEGORIES.map((name, position) => ({ organizationId, name, position })),
  });
  const expenseCategories = await db.expenseCategory.findMany({ where: { organizationId }, orderBy: { position: "asc" } });
  const expenses: Prisma.ExpenseCreateManyInput[] = [];
  for (let index = 0; index < MONTHS_OF_HISTORY; index++) {
    const month = addMonths(activityStart, index);
    for (const expense of RECURRING_EXPENSES) {
      const date = addDays(month, between(1, 8));
      if (date > TODAY) continue;
      expenses.push({
        organizationId,
        categoryId: expenseCategories[expense.category].id,
        date,
        supplier: expense.supplier,
        label: expense.label,
        amountCents: expense.amount,
        method: "DIRECT_DEBIT",
      });
    }
    for (let count = between(0, 2); count > 0; count--) {
      const expense = pick(OCCASIONAL_EXPENSES);
      const date = addDays(month, between(3, 26));
      if (date > TODAY) continue;
      expenses.push({
        organizationId,
        categoryId: expenseCategories[expense.category].id,
        date,
        supplier: expense.supplier,
        label: expense.label,
        amountCents: between(expense.amount[0], expense.amount[1]),
        method: "CARD",
      });
    }
  }
  expenses.push({
    organizationId,
    categoryId: expenseCategories[2].id,
    date: addDays(activityStart, 6),
    supplier: "Apple",
    label: "MacBook Pro 14 pouces",
    amountCents: 219_900,
    method: "CARD",
  });
  await db.expense.createMany({ data: expenses });

  // ── Déclarations URSSAF (trimestrielles) : passées payées, dernière à déclarer
  const periods = periodsToCover(startOfQuarter(activityStart), TODAY, "QUARTERLY");
  const rates = await db.contributionRate.findMany({ where: { organizationId }, orderBy: { effectiveFrom: "desc" } });
  for (const period of periods) {
    const dueDate = declarationDueDate(period.end);
    const closed = period.end < TODAY;
    const paid = closed && dueDate < TODAY;
    const payments = await db.payment.findMany({
      where: { organizationId, paidOn: { gte: period.start, lte: period.end } },
      select: { amountCents: true, paidOn: true },
    });
    const revenue = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const contributions = payments.reduce((sum, payment) => {
      const rate = rates.find((item) => item.effectiveFrom <= payment.paidOn);
      return sum + (rate ? applyRate(payment.amountCents, rate.socialRateBp + rate.cfpRateBp + rate.incomeTaxRateBp) : 0);
    }, 0);
    const declaredOn = paid ? addDays(dueDate, -between(3, 12)) : null;
    const declaration = await db.urssafDeclaration.create({
      data: {
        organizationId,
        periodStart: period.start,
        periodEnd: period.end,
        dueDate,
        status: paid ? "PAID" : "TO_DECLARE",
        declaredRevenueCents: paid ? Math.round(revenue / 100) * 100 : null,
        contributionsCents: paid ? Math.round(contributions / 100) * 100 : null,
        declaredOn,
        paidOn: declaredOn,
      },
    });
    if (declaredOn) {
      log(declaredOn, "urssaf.declared", "URSSAF", declaration.id, "Déclaration URSSAF effectuée", -Math.round(contributions / 100) * 100);
    }
  }

  await db.activityLog.createMany({ data: activities });
  await db.organization.update({ where: { id: organizationId }, data: { lastDailySyncOn: null } });

  const issued = invoicePlans.filter((plan) => !plan.draft).length;
  console.log(
    `Seed terminé : ${CLIENTS.length} clients, ${preQuotePlans.length} pré-devis, ${quotePlans.length} devis, ${issued} factures et avoirs, ${expenses.length} dépenses, ${periods.length} périodes URSSAF.`,
  );
  console.log(`Compte de démonstration : ${email} (mot de passe : variable SEED_USER_PASSWORD).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
