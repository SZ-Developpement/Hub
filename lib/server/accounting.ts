import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PaymentMethod, UrssafStatus } from "@/generated/prisma/enums";
import { diffDays, endOfYear, toISO, utcDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { divRound } from "@/lib/money";

// ───────────────────────────── Fragments SQL partagés ─────────────────────────────

/** Date calendaire en paramètre SQL (toujours transmise en texte, jamais en horodatage). */
export function sqlDate(date: Date): Prisma.Sql {
  return Prisma.sql`${toISO(date)}::date`;
}

/**
 * Taux global de cotisations en vigueur à la date du paiement `p` : le plus récent des
 * taux dont la date d'effet est atteinte. Vaut NULL si aucun taux n'est configuré.
 */
export const RATE_AT_PAYMENT = Prisma.sql`
  LEFT JOIN LATERAL (
    SELECT (cr."socialRateBp" + cr."cfpRateBp" + cr."incomeTaxRateBp") AS total_bp
    FROM contribution_rate cr
    WHERE cr."organizationId" = p."organizationId" AND cr."effectiveFrom" <= p."paidOn"
    ORDER BY cr."effectiveFrom" DESC
    LIMIT 1
  ) rate ON true`;

/** Cotisations estimées sur le paiement `p` (à utiliser avec RATE_AT_PAYMENT). */
export const CONTRIBUTION_OF_PAYMENT = Prisma.sql`(p."amountCents"::numeric * COALESCE(rate.total_bp, 0) / 10000)`;

// ───────────────────────────── Livre des recettes ─────────────────────────────

export type ReceiptFilters = {
  from: Date;
  to: Date;
  method?: PaymentMethod;
  q?: string;
};

function receiptWhere(organizationId: string, filters: ReceiptFilters): Prisma.PaymentWhereInput {
  return {
    organizationId,
    paidOn: { gte: filters.from, lte: filters.to },
    ...(filters.method ? { method: filters.method } : {}),
    ...(filters.q
      ? {
          OR: [
            { reference: { contains: filters.q, mode: "insensitive" } },
            { invoice: { number: { contains: filters.q, mode: "insensitive" } } },
            { invoice: { client: { name: { contains: filters.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

const receiptSelect = {
  id: true,
  paidOn: true,
  amountCents: true,
  method: true,
  reference: true,
  invoice: {
    select: {
      id: true,
      number: true,
      title: true,
      client: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.PaymentSelect;

export type Receipt = Prisma.PaymentGetPayload<{ select: typeof receiptSelect }>;

/** Encaissements de la période, dans l'ordre chronologique (ordre du livre des recettes). */
export async function listReceipts(
  organizationId: string,
  filters: ReceiptFilters,
  page?: { skip: number; take: number },
): Promise<{ rows: Receipt[]; total: number; totalCents: number }> {
  const where = receiptWhere(organizationId, filters);
  const [rows, aggregate] = await Promise.all([
    db.payment.findMany({
      where,
      select: receiptSelect,
      orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }],
      ...(page ?? {}),
    }),
    db.payment.aggregate({ where, _count: true, _sum: { amountCents: true } }),
  ]);
  return { rows, total: aggregate._count, totalCents: aggregate._sum.amountCents ?? 0 };
}

// ───────────────────────────── URSSAF ─────────────────────────────

export type UrssafDeclarationRow = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: UrssafStatus;
  declaredRevenueCents: number | null;
  contributionsCents: number | null;
  declaredOn: Date | null;
  paidOn: Date | null;
  note: string;
  /** CA encaissé sur la période, recalculé à partir des paiements. */
  revenueCents: number;
  /** Cotisations estimées, au taux en vigueur à la date de chaque encaissement. */
  estimatedCents: number;
};

export async function listUrssafDeclarations(
  organizationId: string,
  options: { from?: Date; to?: Date } = {},
): Promise<UrssafDeclarationRow[]> {
  const conditions = [Prisma.sql`d."organizationId" = ${organizationId}`];
  if (options.from) conditions.push(Prisma.sql`d."periodEnd" >= ${toISO(options.from)}::date`);
  if (options.to) conditions.push(Prisma.sql`d."periodStart" <= ${toISO(options.to)}::date`);

  return db.$queryRaw<UrssafDeclarationRow[]>`
    SELECT
      d.id, d."periodStart", d."periodEnd", d."dueDate", d.status,
      d."declaredRevenueCents", d."contributionsCents", d."declaredOn", d."paidOn", d.note,
      COALESCE(s.revenue, 0)::float8 AS "revenueCents",
      COALESCE(ROUND(s.contributions), 0)::float8 AS "estimatedCents"
    FROM urssaf_declaration d
    LEFT JOIN LATERAL (
      SELECT
        SUM(p."amountCents") AS revenue,
        SUM(${CONTRIBUTION_OF_PAYMENT}) AS contributions
      FROM payment p
      ${RATE_AT_PAYMENT}
      WHERE p."organizationId" = d."organizationId"
        AND p."paidOn" BETWEEN d."periodStart" AND d."periodEnd"
    ) s ON true
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY d."periodStart" DESC
  `;
}

/** Montant à retenir pour une période : le chiffre déclaré s'il est figé, sinon l'estimation. */
export function declarationAmounts(row: UrssafDeclarationRow): {
  revenueCents: number;
  contributionsCents: number;
} {
  const frozen = row.status !== "TO_DECLARE";
  return {
    revenueCents: frozen ? (row.declaredRevenueCents ?? row.revenueCents) : row.revenueCents,
    contributionsCents: frozen ? (row.contributionsCents ?? row.estimatedCents) : row.estimatedCents,
  };
}

export async function getCurrentRate(organizationId: string, date: Date) {
  return db.contributionRate.findFirst({
    where: { organizationId, effectiveFrom: { lte: date } },
    orderBy: { effectiveFrom: "desc" },
  });
}

// ───────────────────────────── Plafonds ─────────────────────────────

export type CeilingLevel = "ok" | "warning" | "critical" | "exceeded";

export type CeilingStatus = {
  year: number;
  /** CA encaissé sur l'année civile. */
  revenueCents: number;
  /** Plafond applicable (proratisé l'année de création). */
  ceilingCents: number;
  /** Plafond annuel configuré, avant prorata. */
  fullCeilingCents: number;
  prorated: boolean;
  percent: number;
  level: CeilingLevel;
  remainingCents: number;
  /** CA projeté en fin d'année au rythme actuel ; `null` si l'année est terminée ou à peine entamée. */
  projectedCents: number | null;
  vat: {
    thresholdCents: number;
    upperThresholdCents: number;
    level: "ok" | "warning" | "exceeded" | "upper-exceeded";
  } | null;
};

type CeilingSettings = {
  revenueCeilingCents: number;
  ceilingWarningPct: number;
  ceilingCriticalPct: number;
  vatThresholdCents: number;
  vatUpperThresholdCents: number;
  activityStartDate: Date | null;
};

export async function getYearRevenue(organizationId: string, year: number): Promise<number> {
  const aggregate = await db.payment.aggregate({
    where: {
      organizationId,
      paidOn: { gte: utcDate(year, 0, 1), lte: utcDate(year, 11, 31) },
    },
    _sum: { amountCents: true },
  });
  return aggregate._sum.amountCents ?? 0;
}

export function computeCeilingStatus(
  year: number,
  revenueCents: number,
  settings: CeilingSettings,
  today: Date,
): CeilingStatus {
  const yearStart = utcDate(year, 0, 1);
  const yearEnd = endOfYear(yearStart);
  const daysInYear = diffDays(yearStart, yearEnd) + 1;

  // Année de création : le plafond est réduit au prorata du temps d'activité.
  const start = settings.activityStartDate;
  const prorated = Boolean(start && start.getUTCFullYear() === year && start > yearStart);
  const activeFrom = prorated && start ? start : yearStart;
  const ceilingCents = prorated
    ? divRound(settings.revenueCeilingCents * (diffDays(activeFrom, yearEnd) + 1), daysInYear)
    : settings.revenueCeilingCents;

  const percent = ceilingCents > 0 ? (revenueCents / ceilingCents) * 100 : 0;
  const level: CeilingLevel =
    percent >= 100
      ? "exceeded"
      : percent >= settings.ceilingCriticalPct
        ? "critical"
        : percent >= settings.ceilingWarningPct
          ? "warning"
          : "ok";

  let projectedCents: number | null = null;
  if (today >= activeFrom && today <= yearEnd) {
    const elapsed = diffDays(activeFrom, today) + 1;
    const total = diffDays(activeFrom, yearEnd) + 1;
    if (elapsed >= 30) projectedCents = divRound(revenueCents * total, elapsed);
  }

  const vat =
    settings.vatThresholdCents > 0
      ? {
          thresholdCents: settings.vatThresholdCents,
          upperThresholdCents: settings.vatUpperThresholdCents,
          level:
            settings.vatUpperThresholdCents > 0 && revenueCents > settings.vatUpperThresholdCents
              ? ("upper-exceeded" as const)
              : revenueCents > settings.vatThresholdCents
                ? ("exceeded" as const)
                : revenueCents >= (settings.vatThresholdCents * settings.ceilingWarningPct) / 100
                  ? ("warning" as const)
                  : ("ok" as const),
        }
      : null;

  return {
    year,
    revenueCents,
    ceilingCents,
    fullCeilingCents: settings.revenueCeilingCents,
    prorated,
    percent,
    level,
    remainingCents: Math.max(ceilingCents - revenueCents, 0),
    projectedCents,
    vat,
  };
}

export async function getCeilingStatus(
  organizationId: string,
  settings: CeilingSettings,
  today: Date,
  year: number = today.getUTCFullYear(),
): Promise<CeilingStatus> {
  return computeCeilingStatus(year, await getYearRevenue(organizationId, year), settings, today);
}

/** CA encaissé par mois sur une année civile (12 valeurs, janvier en premier). */
export async function getMonthlyRevenue(organizationId: string, year: number): Promise<number[]> {
  const rows = await db.$queryRaw<{ month: number; total: number }[]>`
    SELECT EXTRACT(MONTH FROM p."paidOn")::int AS month, SUM(p."amountCents")::float8 AS total
    FROM payment p
    WHERE p."organizationId" = ${organizationId}
      AND p."paidOn" BETWEEN ${toISO(utcDate(year, 0, 1))}::date AND ${toISO(utcDate(year, 11, 31))}::date
    GROUP BY 1
  `;
  const months = Array.from({ length: 12 }, () => 0);
  for (const row of rows) months[row.month - 1] = row.total;
  return months;
}

/** Années pour lesquelles des données existent (encaissements ou dépenses), la plus récente d'abord. */
export async function listActiveYears(organizationId: string, today: Date): Promise<number[]> {
  const rows = await db.$queryRaw<{ year: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM d)::int AS year
    FROM (
      SELECT "paidOn" AS d FROM payment WHERE "organizationId" = ${organizationId}
      UNION ALL
      SELECT date AS d FROM expense WHERE "organizationId" = ${organizationId}
    ) dates
  `;
  const years = new Set(rows.map((row) => row.year));
  years.add(today.getUTCFullYear());
  return [...years].sort((a, b) => b - a);
}

// ───────────────────────────── Récapitulatif annuel ─────────────────────────────

export type AnnualSummary = {
  year: number;
  collectedCents: number;
  invoicedCents: number;
  expensesCents: number;
  contributionsCents: number;
  profitCents: number;
  receiptCount: number;
  monthlyRevenue: number[];
  expensesByCategory: { name: string; count: number; amountCents: number }[];
  declarations: UrssafDeclarationRow[];
  ceiling: CeilingStatus;
};

/** Chiffres de l'année civile : recettes, dépenses, cotisations, plafond. */
export async function getAnnualSummary(
  organizationId: string,
  settings: CeilingSettings,
  year: number,
  today: Date,
): Promise<AnnualSummary> {
  const from = utcDate(year, 0, 1);
  const to = utcDate(year, 11, 31);

  const [payments, invoiced, expenses, monthlyRevenue, declarations] = await Promise.all([
    db.payment.aggregate({
      where: { organizationId, paidOn: { gte: from, lte: to } },
      _sum: { amountCents: true },
      _count: true,
    }),
    db.invoice.aggregate({
      where: { organizationId, status: { not: "DRAFT" }, issueDate: { gte: from, lte: to } },
      _sum: { netCents: true },
    }),
    db.$queryRaw<{ name: string; count: number; amountCents: number }[]>`
      SELECT c.name, COUNT(*)::int AS count, SUM(e."amountCents")::float8 AS "amountCents"
      FROM expense e
      JOIN expense_category c ON c.id = e."categoryId"
      WHERE e."organizationId" = ${organizationId}
        AND e.date BETWEEN ${toISO(from)}::date AND ${toISO(to)}::date
      GROUP BY c.name
      ORDER BY SUM(e."amountCents") DESC
    `,
    getMonthlyRevenue(organizationId, year),
    listUrssafDeclarations(organizationId, { from, to }),
  ]);

  const collectedCents = payments._sum.amountCents ?? 0;
  const expensesCents = expenses.reduce((sum, row) => sum + row.amountCents, 0);
  const contributionsCents = declarations.reduce(
    (sum, row) => sum + declarationAmounts(row).contributionsCents,
    0,
  );

  return {
    year,
    collectedCents,
    invoicedCents: invoiced._sum.netCents ?? 0,
    expensesCents,
    contributionsCents,
    profitCents: collectedCents - contributionsCents - expensesCents,
    receiptCount: payments._count,
    monthlyRevenue,
    expensesByCategory: expenses,
    declarations,
    ceiling: computeCeilingStatus(year, collectedCents, settings, today),
  };
}
