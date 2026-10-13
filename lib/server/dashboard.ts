import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { categoricalColors } from "@/lib/chart-palette";
import { addDays, minDate, startOfWeek, toISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatDateShort, formatMonthShort } from "@/lib/format";
import { percentChange } from "@/lib/money";
import {
  granularityFor,
  previousPeriod,
  samePeriodLastYear,
  type Granularity,
} from "@/lib/periods";
import {
  CONTRIBUTION_OF_PAYMENT,
  declarationAmounts,
  getCeilingStatus,
  listUrssafDeclarations,
  RATE_AT_PAYMENT,
  sqlDate,
  type CeilingStatus,
} from "@/lib/server/accounting";
import type { AppContext } from "@/lib/session";
import { periodLabel } from "@/lib/urssaf-periods";

// Tout le tableau de bord est calculé en base : chaque indicateur est une agrégation SQL,
// jamais une boucle JavaScript sur des lignes rapatriées.

type Range = { from: Date; to: Date };

// ───────────────────────────── Indicateurs ─────────────────────────────

type PeriodTotals = {
  collected: number;
  contributions: number;
  invoiced: number;
  invoiceCount: number;
  averageInvoice: number;
  paymentDelay: number | null;
  expenses: number;
  quotesSent: number;
  quotesAccepted: number;
  quotesSentAccepted: number;
  quotesInvoiced: number;
  preQuotesSent: number;
  preQuotesConverted: number;
};

async function periodTotals(organizationId: string, range: Range): Promise<PeriodTotals> {
  const from = sqlDate(range.from);
  const to = sqlDate(range.to);
  const org = Prisma.sql`"organizationId" = ${organizationId}`;
  const issued = Prisma.sql`i."organizationId" = ${organizationId} AND i.status <> 'DRAFT' AND i."issueDate" BETWEEN ${from} AND ${to}`;
  const sentQuotes = Prisma.sql`q."organizationId" = ${organizationId} AND q."sentOn" BETWEEN ${from} AND ${to}`;

  const [row] = await db.$queryRaw<PeriodTotals[]>`
    SELECT
      (SELECT COALESCE(SUM(p."amountCents"), 0) FROM payment p
        WHERE p.${org} AND p."paidOn" BETWEEN ${from} AND ${to})::float8 AS collected,
      (SELECT COALESCE(ROUND(SUM(${CONTRIBUTION_OF_PAYMENT})), 0) FROM payment p ${RATE_AT_PAYMENT}
        WHERE p.${org} AND p."paidOn" BETWEEN ${from} AND ${to})::float8 AS contributions,
      (SELECT COALESCE(SUM(i."netCents"), 0) FROM invoice i WHERE ${issued})::float8 AS invoiced,
      (SELECT COUNT(*) FROM invoice i WHERE ${issued} AND i.type <> 'CREDIT_NOTE')::int AS "invoiceCount",
      (SELECT COALESCE(AVG(i."netCents"), 0) FROM invoice i
        WHERE ${issued} AND i.type <> 'CREDIT_NOTE')::float8 AS "averageInvoice",
      (SELECT AVG(i."paidOn" - i."issueDate") FROM invoice i
        WHERE i.${org} AND i.status = 'PAID' AND i."paidOn" BETWEEN ${from} AND ${to})::float8 AS "paymentDelay",
      (SELECT COALESCE(SUM(e."amountCents"), 0) FROM expense e
        WHERE e.${org} AND e.date BETWEEN ${from} AND ${to})::float8 AS expenses,
      (SELECT COUNT(*) FROM quote q WHERE ${sentQuotes})::int AS "quotesSent",
      (SELECT COUNT(*) FROM quote q
        WHERE q.${org} AND q."acceptedOn" BETWEEN ${from} AND ${to})::int AS "quotesAccepted",
      (SELECT COUNT(*) FROM quote q WHERE ${sentQuotes} AND q."acceptedOn" IS NOT NULL)::int AS "quotesSentAccepted",
      (SELECT COUNT(*) FROM quote q WHERE ${sentQuotes} AND EXISTS (
        SELECT 1 FROM invoice i
        WHERE i."quoteId" = q.id AND i.status <> 'DRAFT' AND i.type <> 'CREDIT_NOTE'))::int AS "quotesInvoiced",
      (SELECT COUNT(*) FROM pre_quote pq
        WHERE pq.${org} AND pq."sentOn" BETWEEN ${from} AND ${to})::int AS "preQuotesSent",
      (SELECT COUNT(*) FROM pre_quote pq
        WHERE pq.${org} AND pq."sentOn" BETWEEN ${from} AND ${to}
          AND EXISTS (SELECT 1 FROM quote q WHERE q."preQuoteId" = pq.id))::int AS "preQuotesConverted"
  `;
  return row;
}

type Receivables = { outstanding: number; overdue: number; overdueCount: number };

/**
 * Créances à une date donnée : ce qui était facturé, moins ce qui était payé ou crédité
 * à cette date. Permet de comparer honnêtement l'encours avec celui de la période précédente.
 */
async function receivablesAt(organizationId: string, date: Date): Promise<Receivables> {
  const at = sqlDate(date);
  const [row] = await db.$queryRaw<Receivables[]>`
    SELECT
      COALESCE(SUM(open.remaining), 0)::float8 AS outstanding,
      COALESCE(SUM(open.remaining) FILTER (WHERE i."dueDate" < ${at}), 0)::float8 AS overdue,
      (COUNT(*) FILTER (WHERE open.remaining > 0 AND i."dueDate" < ${at}))::int AS "overdueCount"
    FROM invoice i
    LEFT JOIN LATERAL (
      SELECT SUM(p."amountCents") AS amount
      FROM payment p WHERE p."invoiceId" = i.id AND p."paidOn" <= ${at}
    ) paid ON true
    LEFT JOIN LATERAL (
      SELECT SUM(-c."netCents") AS amount
      FROM invoice c
      WHERE c."creditedInvoiceId" = i.id AND c.status <> 'DRAFT' AND c."issueDate" <= ${at}
    ) credited ON true
    CROSS JOIN LATERAL (
      SELECT GREATEST(i."netCents" - COALESCE(credited.amount, 0) - COALESCE(paid.amount, 0), 0) AS remaining
    ) open
    WHERE i."organizationId" = ${organizationId}
      AND i.type <> 'CREDIT_NOTE'
      AND i.status <> 'DRAFT'
      AND i."issueDate" <= ${at}
  `;
  return row;
}

// ───────────────────────────── Séries temporelles ─────────────────────────────

type Bucket = { start: Date; collected: number; invoiced: number };

async function timeSeries(
  organizationId: string,
  range: Range,
  granularity: Granularity,
): Promise<Bucket[]> {
  // Valeur issue d'une liste fermée (jamais de l'URL) : injectable telle quelle.
  const unit = Prisma.raw(`'${granularity}'`);
  const step = Prisma.raw(`'1 ${granularity}'::interval`);
  const from = sqlDate(range.from);
  const to = sqlDate(range.to);

  return db.$queryRaw<Bucket[]>`
    WITH buckets AS (
      SELECT generate_series(date_trunc(${unit}, ${from})::date, ${to}, ${step})::date AS start
    ),
    paid AS (
      SELECT date_trunc(${unit}, p."paidOn")::date AS start, SUM(p."amountCents") AS total
      FROM payment p
      WHERE p."organizationId" = ${organizationId} AND p."paidOn" BETWEEN ${from} AND ${to}
      GROUP BY 1
    ),
    billed AS (
      SELECT date_trunc(${unit}, i."issueDate")::date AS start, SUM(i."netCents") AS total
      FROM invoice i
      WHERE i."organizationId" = ${organizationId} AND i.status <> 'DRAFT'
        AND i."issueDate" BETWEEN ${from} AND ${to}
      GROUP BY 1
    )
    SELECT
      buckets.start,
      COALESCE(paid.total, 0)::float8 AS collected,
      COALESCE(billed.total, 0)::float8 AS invoiced
    FROM buckets
    LEFT JOIN paid ON paid.start = buckets.start
    LEFT JOIN billed ON billed.start = buckets.start
    ORDER BY buckets.start
  `;
}

function bucketLabel(start: Date, granularity: Granularity): string {
  return granularity === "month" ? formatMonthShort(start) : formatDateShort(start);
}

// ───────────────────────────── Répartitions ─────────────────────────────

export type TopClient = {
  id: string;
  name: string;
  collectedCents: number;
  invoicedCents: number;
  invoiceCount: number;
  outstandingCents: number;
};

async function topClients(organizationId: string, range: Range): Promise<TopClient[]> {
  const from = sqlDate(range.from);
  const to = sqlDate(range.to);
  return db.$queryRaw<TopClient[]>`
    SELECT
      c.id, c.name,
      COALESCE(paid.total, 0)::float8 AS "collectedCents",
      COALESCE(billed.total, 0)::float8 AS "invoicedCents",
      COALESCE(billed.count, 0)::int AS "invoiceCount",
      COALESCE(pending.total, 0)::float8 AS "outstandingCents"
    FROM client c
    LEFT JOIN LATERAL (
      SELECT SUM(p."amountCents") AS total
      FROM payment p JOIN invoice i ON i.id = p."invoiceId"
      WHERE i."clientId" = c.id AND p."paidOn" BETWEEN ${from} AND ${to}
    ) paid ON true
    LEFT JOIN LATERAL (
      SELECT SUM(i."netCents") AS total, COUNT(*) FILTER (WHERE i.type <> 'CREDIT_NOTE') AS count
      FROM invoice i
      WHERE i."clientId" = c.id AND i.status <> 'DRAFT' AND i."issueDate" BETWEEN ${from} AND ${to}
    ) billed ON true
    LEFT JOIN LATERAL (
      SELECT SUM(GREATEST(i."netCents" - i."creditedCents" - i."paidCents", 0)) AS total
      FROM invoice i
      WHERE i."clientId" = c.id AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
    ) pending ON true
    WHERE c."organizationId" = ${organizationId}
      AND (paid.total IS NOT NULL OR billed.total IS NOT NULL)
    ORDER BY COALESCE(paid.total, 0) DESC, COALESCE(billed.total, 0) DESC
    LIMIT 10
  `;
}

/**
 * CA facturé par catégorie de prestation. Chaque ligne est pondérée par le rapport
 * net / sous-total de sa facture : remises et acomptes déduits sont ainsi répartis,
 * et la somme des catégories égale exactement le CA facturé.
 */
async function revenueByCategory(organizationId: string, range: Range) {
  return db.$queryRaw<{ categoryId: string | null; total: number }[]>`
    SELECT
      l."categoryId",
      SUM(l."totalCents"::numeric * i."netCents" / NULLIF(i."subtotalCents", 0))::float8 AS total
    FROM invoice_line l
    JOIN invoice i ON i.id = l."invoiceId"
    WHERE i."organizationId" = ${organizationId} AND i.status <> 'DRAFT'
      AND i."issueDate" BETWEEN ${sqlDate(range.from)} AND ${sqlDate(range.to)}
    GROUP BY l."categoryId"
  `;
}

type ForecastRow = { bucket: Date | null; total: number };

/** Reste à encaisser par semaine d'échéance (`bucket` nul = déjà échu). */
async function cashForecast(organizationId: string, today: Date): Promise<ForecastRow[]> {
  return db.$queryRaw<ForecastRow[]>`
    SELECT
      CASE WHEN i."dueDate" < ${sqlDate(today)} THEN NULL
           ELSE date_trunc('week', i."dueDate")::date END AS bucket,
      SUM(GREATEST(i."netCents" - i."creditedCents" - i."paidCents", 0))::float8 AS total
    FROM invoice i
    WHERE i."organizationId" = ${organizationId}
      AND i.type <> 'CREDIT_NOTE'
      AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
    GROUP BY 1
  `;
}

// ───────────────────────────── Assemblage ─────────────────────────────

export type Kpi = {
  value: number | null;
  previous: number | null;
  /** Variation relative en % ; `null` si elle n'a pas de sens (base nulle). */
  change: number | null;
  /** Écart absolu (points, jours…) quand la variation relative n'est pas pertinente. */
  difference: number | null;
};

function kpi(value: number | null, previous: number | null): Kpi {
  return {
    value,
    previous,
    change: value !== null && previous !== null ? percentChange(value, previous) : null,
    difference: value !== null && previous !== null ? value - previous : null,
  };
}

function rate(part: number, whole: number): number | null {
  return whole > 0 ? (part / whole) * 100 : null;
}

const WEEKS_AHEAD = 8;

export async function getDashboard(ctx: AppContext, period: Range, today: Date) {
  const { organizationId, settings } = ctx;
  const previous = previousPeriod(period);
  const lastYear = samePeriodLastYear(period);
  const granularity = granularityFor(period);
  // Les indicateurs « à date » sont pris à la fin de la période, sans dépasser aujourd'hui.
  const asOf = minDate(period.to, today);

  const [
    totals,
    previousTotals,
    receivables,
    previousReceivables,
    series,
    lastYearSeries,
    clients,
    categoryRows,
    categories,
    statusRows,
    expenseRows,
    expenseCategories,
    declarations,
    ceiling,
    forecastRows,
  ] = await Promise.all([
    periodTotals(organizationId, period),
    periodTotals(organizationId, previous),
    receivablesAt(organizationId, asOf),
    receivablesAt(organizationId, previous.to),
    timeSeries(organizationId, period, granularity),
    timeSeries(organizationId, lastYear, granularity),
    topClients(organizationId, period),
    revenueByCategory(organizationId, period),
    db.serviceCategory.findMany({
      where: { organizationId },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.invoice.groupBy({
      by: ["status"],
      where: {
        organizationId,
        type: { not: "CREDIT_NOTE" },
        issueDate: { gte: period.from, lte: period.to },
      },
      _count: true,
      _sum: { netCents: true },
    }),
    db.expense.groupBy({
      by: ["categoryId"],
      where: { organizationId, date: { gte: period.from, lte: period.to } },
      _sum: { amountCents: true },
      _count: true,
    }),
    db.expenseCategory.findMany({ where: { organizationId }, select: { id: true, name: true } }),
    listUrssafDeclarations(organizationId, period),
    getCeilingStatus(organizationId, settings, today, asOf.getUTCFullYear()),
    cashForecast(organizationId, today),
  ]);

  const profit = totals.collected - totals.contributions - totals.expenses;
  const previousProfit =
    previousTotals.collected - previousTotals.contributions - previousTotals.expenses;

  // Couleur attachée à la catégorie (son rang dans le catalogue), pas à son classement :
  // une catégorie garde sa couleur quand la période change.
  const palette = categoricalColors(settings.accentColor);
  const totalByCategory = new Map(categoryRows.map((row) => [row.categoryId, row.total]));
  const slices = categories
    .map((category, index) => ({
      name: category.name,
      value: Math.round(totalByCategory.get(category.id) ?? 0),
      color: index < palette.length ? palette[index] : null,
    }))
    .filter((slice) => slice.value > 0);
  const knownCategories = new Set(categories.map((category) => category.id));
  const uncategorized = categoryRows
    .filter((row) => row.categoryId === null || !knownCategories.has(row.categoryId))
    .reduce((sum, row) => sum + row.total, 0);
  const overflow = slices.filter((slice) => slice.color === null);
  const otherValue = Math.round(
    uncategorized + overflow.reduce((sum, slice) => sum + slice.value, 0),
  );
  const categorySlices = [
    ...slices.flatMap((slice) => (slice.color ? [{ ...slice, color: slice.color }] : [])),
    ...(otherValue > 0
      ? [
          {
            name: overflow.length > 0 ? "Autres" : "Hors catalogue",
            value: otherValue,
            color: "var(--chart-muted)",
          },
        ]
      : []),
  ];

  const statusByKey = new Map(statusRows.map((row) => [row.status, row]));
  const statuses = (
    ["PAID", "PARTIALLY_PAID", "ISSUED", "OVERDUE", "DRAFT", "CANCELLED"] as InvoiceStatus[]
  ).map((status) => ({
    status,
    count: statusByKey.get(status)?._count ?? 0,
    amount: statusByKey.get(status)?._sum.netCents ?? 0,
  }));

  const expenseNames = new Map(expenseCategories.map((category) => [category.id, category.name]));
  const expenses = expenseRows
    .map((row) => ({
      id: row.categoryId,
      name: expenseNames.get(row.categoryId) ?? "Autre",
      value: row._sum.amountCents ?? 0,
      count: row._count,
    }))
    .sort((a, b) => b.value - a.value);

  // Prévisionnel : « en retard », puis huit semaines, puis tout le reste.
  const thisWeek = startOfWeek(today);
  const horizon = addDays(thisWeek, WEEKS_AHEAD * 7);
  const forecastByWeek = new Map(
    forecastRows.flatMap((row) => (row.bucket ? [[toISO(row.bucket), row.total] as const] : [])),
  );
  const forecast = [
    {
      label: "En retard",
      value: forecastRows.find((row) => row.bucket === null)?.total ?? 0,
      alert: true,
    },
    ...Array.from({ length: WEEKS_AHEAD }, (_, index) => {
      const start = addDays(thisWeek, index * 7);
      return { label: formatDateShort(start), value: forecastByWeek.get(toISO(start)) ?? 0 };
    }),
    {
      label: "Au-delà",
      value: forecastRows
        .filter((row) => row.bucket && row.bucket >= horizon)
        .reduce((sum, row) => sum + row.total, 0),
    },
  ];

  return {
    previous,
    lastYear,
    granularity,
    asOf,
    kpis: {
      collected: kpi(totals.collected, previousTotals.collected),
      invoiced: kpi(totals.invoiced, previousTotals.invoiced),
      outstanding: kpi(receivables.outstanding, previousReceivables.outstanding),
      overdue: kpi(receivables.overdue, previousReceivables.overdue),
      quotesSent: kpi(totals.quotesSent, previousTotals.quotesSent),
      quotesAccepted: kpi(totals.quotesAccepted, previousTotals.quotesAccepted),
      preQuoteConversion: kpi(
        rate(totals.preQuotesConverted, totals.preQuotesSent),
        rate(previousTotals.preQuotesConverted, previousTotals.preQuotesSent),
      ),
      quoteConversion: kpi(
        rate(totals.quotesInvoiced, totals.quotesSent),
        rate(previousTotals.quotesInvoiced, previousTotals.quotesSent),
      ),
      averageInvoice: kpi(
        totals.invoiceCount > 0 ? totals.averageInvoice : null,
        previousTotals.invoiceCount > 0 ? previousTotals.averageInvoice : null,
      ),
      paymentDelay: kpi(totals.paymentDelay, previousTotals.paymentDelay),
      contributions: kpi(totals.contributions, previousTotals.contributions),
      profit: kpi(profit, previousProfit),
    },
    totals,
    overdueCount: receivables.overdueCount,
    series: series.map((bucket) => ({
      label: bucketLabel(bucket.start, granularity),
      collected: bucket.collected,
      invoiced: bucket.invoiced,
    })),
    // Les deux années sont alignées par rang de période (1re semaine avec 1re semaine…).
    yearOverYear: series.map((bucket, index) => ({
      label: bucketLabel(bucket.start, granularity),
      current: bucket.collected,
      previous: lastYearSeries[index]?.collected ?? 0,
    })),
    lastYearCollected: lastYearSeries.reduce((sum, bucket) => sum + bucket.collected, 0),
    clients,
    categorySlices,
    statuses,
    funnel: {
      preQuotesSent: totals.preQuotesSent,
      preQuotesConverted: totals.preQuotesConverted,
      quotesSent: totals.quotesSent,
      quotesAccepted: totals.quotesSentAccepted,
      quotesInvoiced: totals.quotesInvoiced,
    },
    expenses,
    expensesTotal: totals.expenses,
    urssaf: [...declarations].reverse().map((row) => ({
      label: periodLabel(row.periodStart, row.periodEnd),
      value: declarationAmounts(row).contributionsCents,
      estimated: row.status === "TO_DECLARE",
    })),
    ceiling: ceiling satisfies CeilingStatus,
    forecast,
    forecastTotal: forecast.reduce((sum, bucket) => sum + bucket.value, 0),
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
