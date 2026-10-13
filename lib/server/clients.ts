import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { ClientType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import type { ListParams } from "@/lib/list-params";

export const CLIENT_SORTS = ["name", "city", "paid", "outstanding", "created"] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

// Colonnes de tri : liste blanche, jamais une valeur venue de l'URL.
const ORDER_COLUMNS: Record<ClientSort, Prisma.Sql> = {
  name: Prisma.sql`lower(c.name)`,
  city: Prisma.sql`lower(c.city)`,
  paid: Prisma.sql`"paidCents"`,
  outstanding: Prisma.sql`"outstandingCents"`,
  created: Prisma.sql`c."createdAt"`,
};

export type ClientListRow = {
  id: string;
  name: string;
  type: ClientType;
  contactName: string;
  email: string;
  city: string;
  archivedAt: Date | null;
  paidCents: number;
  outstandingCents: number;
  overdueCents: number;
  hasDocuments: boolean;
};

/** Liste paginée des clients avec leurs encours, agrégés en base. */
export async function listClients(
  organizationId: string,
  params: ListParams<ClientSort>,
  filters: { type?: ClientType; archived: boolean },
): Promise<{ rows: ClientListRow[]; total: number }> {
  const conditions = [
    Prisma.sql`c."organizationId" = ${organizationId}`,
    filters.archived ? Prisma.sql`c."archivedAt" IS NOT NULL` : Prisma.sql`c."archivedAt" IS NULL`,
  ];
  if (filters.type) conditions.push(Prisma.sql`c.type = ${filters.type}::"ClientType"`);
  if (params.q) {
    const pattern = `%${params.q.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      Prisma.sql`(c.name ILIKE ${pattern} OR c."contactName" ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.city ILIKE ${pattern} OR c.siret ILIKE ${pattern})`,
    );
  }
  const direction = params.dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

  const rows = await db.$queryRaw<(ClientListRow & { total: number })[]>`
    SELECT
      c.id, c.name, c.type, c."contactName", c.email, c.city, c."archivedAt",
      COALESCE(pay.paid, 0)::float8 AS "paidCents",
      COALESCE(inv.outstanding, 0)::float8 AS "outstandingCents",
      COALESCE(inv.overdue, 0)::float8 AS "overdueCents",
      (
        EXISTS (SELECT 1 FROM invoice d WHERE d."clientId" = c.id)
        OR EXISTS (SELECT 1 FROM quote d WHERE d."clientId" = c.id)
        OR EXISTS (SELECT 1 FROM pre_quote d WHERE d."clientId" = c.id)
      ) AS "hasDocuments",
      (COUNT(*) OVER ())::int AS total
    FROM client c
    LEFT JOIN LATERAL (
      SELECT
        SUM(GREATEST(i."netCents" - i."creditedCents" - i."paidCents", 0))
          FILTER (WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')) AS outstanding,
        SUM(GREATEST(i."netCents" - i."creditedCents" - i."paidCents", 0))
          FILTER (WHERE i.status = 'OVERDUE') AS overdue
      FROM invoice i
      WHERE i."clientId" = c.id AND i.type <> 'CREDIT_NOTE'
    ) inv ON true
    LEFT JOIN LATERAL (
      SELECT SUM(p."amountCents") AS paid
      FROM payment p
      JOIN invoice i ON i.id = p."invoiceId"
      WHERE i."clientId" = c.id
    ) pay ON true
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY ${ORDER_COLUMNS[params.sort]} ${direction}, c.id
    LIMIT ${params.take} OFFSET ${params.skip}
  `;

  return { rows, total: rows[0]?.total ?? 0 };
}

export type ClientStats = {
  paidCents: number;
  invoicedCents: number;
  outstandingCents: number;
  overdueCents: number;
  overdueCount: number;
  /** Délai moyen entre émission et paiement complet, en jours ; `null` sans facture payée. */
  averagePaymentDays: number | null;
  /** Factures soldées après leur échéance. */
  latePaidCount: number;
  paidInvoiceCount: number;
};

export async function getClientStats(organizationId: string, clientId: string): Promise<ClientStats> {
  const [row] = await db.$queryRaw<ClientStats[]>`
    SELECT
      COALESCE((
        SELECT SUM(p."amountCents")
        FROM payment p JOIN invoice pi ON pi.id = p."invoiceId"
        WHERE pi."clientId" = ${clientId} AND pi."organizationId" = ${organizationId}
      ), 0)::float8 AS "paidCents",
      COALESCE(SUM(i."netCents") FILTER (WHERE i.status <> 'DRAFT'), 0)::float8 AS "invoicedCents",
      COALESCE(SUM(GREATEST(i."netCents" - i."creditedCents" - i."paidCents", 0))
        FILTER (WHERE i.type <> 'CREDIT_NOTE' AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')), 0)::float8
        AS "outstandingCents",
      COALESCE(SUM(GREATEST(i."netCents" - i."creditedCents" - i."paidCents", 0))
        FILTER (WHERE i.status = 'OVERDUE'), 0)::float8 AS "overdueCents",
      (COUNT(*) FILTER (WHERE i.status = 'OVERDUE'))::int AS "overdueCount",
      (AVG(i."paidOn" - i."issueDate") FILTER (WHERE i.status = 'PAID' AND i."paidOn" IS NOT NULL))::float8
        AS "averagePaymentDays",
      (COUNT(*) FILTER (WHERE i.status = 'PAID' AND i."paidOn" > i."dueDate"))::int AS "latePaidCount",
      (COUNT(*) FILTER (WHERE i.status = 'PAID' AND i."paidOn" IS NOT NULL))::int AS "paidInvoiceCount"
    FROM invoice i
    WHERE i."clientId" = ${clientId} AND i."organizationId" = ${organizationId}
  `;
  return row;
}

/** Clients actifs, pour les listes de sélection des formulaires. */
export async function listClientOptions(organizationId: string, includeId?: string | null) {
  return db.client.findMany({
    where: {
      organizationId,
      OR: [{ archivedAt: null }, ...(includeId ? [{ id: includeId }] : [])],
    },
    select: { id: true, name: true, type: true, paymentTermDays: true },
    orderBy: { name: "asc" },
  });
}

export type ClientOption = Awaited<ReturnType<typeof listClientOptions>>[number];

export async function countClientDocuments(clientId: string): Promise<number> {
  const [preQuotes, quotes, invoices] = await Promise.all([
    db.preQuote.count({ where: { clientId } }),
    db.quote.count({ where: { clientId } }),
    db.invoice.count({ where: { clientId } }),
  ]);
  return preQuotes + quotes + invoices;
}
