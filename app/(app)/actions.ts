"use server";

import { action } from "@/lib/action";
import { db } from "@/lib/db";
import { searchSchema, type SearchResults } from "@/lib/validation/search";

const LIMIT = 6;

/** Recherche globale : clients, pré-devis, devis et factures. */
export const globalSearch = action(
  searchSchema,
  async ({ q }, ctx): Promise<SearchResults> => {
    const organizationId = ctx.organizationId;
    const contains = { contains: q, mode: "insensitive" as const };
    const byDocument = [
      { number: contains },
      { title: contains },
      { client: { name: contains } },
    ];

    const [clients, preQuotes, quotes, invoices] = await Promise.all([
      db.client.findMany({
        where: {
          organizationId,
          OR: [
            { name: contains },
            { contactName: contains },
            { email: contains },
            { siret: contains },
          ],
        },
        select: { id: true, name: true, city: true },
        orderBy: { name: "asc" },
        take: LIMIT,
      }),
      db.preQuote.findMany({
        where: { organizationId, OR: byDocument },
        select: { id: true, number: true, title: true, client: { select: { name: true } } },
        orderBy: { issueDate: "desc" },
        take: LIMIT,
      }),
      db.quote.findMany({
        where: { organizationId, OR: byDocument },
        select: {
          id: true,
          number: true,
          title: true,
          totalCents: true,
          client: { select: { name: true } },
        },
        orderBy: { issueDate: "desc" },
        take: LIMIT,
      }),
      db.invoice.findMany({
        where: { organizationId, OR: byDocument },
        select: {
          id: true,
          number: true,
          title: true,
          netCents: true,
          client: { select: { name: true } },
        },
        orderBy: { issueDate: "desc" },
        take: LIMIT,
      }),
    ]);

    return {
      clients,
      preQuotes: preQuotes.map((row) => ({
        id: row.id,
        number: row.number,
        title: row.title,
        clientName: row.client.name,
      })),
      quotes: quotes.map((row) => ({
        id: row.id,
        number: row.number,
        title: row.title,
        clientName: row.client.name,
        totalCents: row.totalCents,
      })),
      invoices: invoices.map((row) => ({
        id: row.id,
        number: row.number,
        title: row.title,
        clientName: row.client.name,
        netCents: row.netCents,
      })),
    };
  },
  { refresh: false },
);
