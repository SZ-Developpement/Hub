import { FileTextIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import {
  FilterSelect,
  ListToolbar,
  Pagination,
  SearchInput,
  SortableHead,
} from "@/components/shared/list-controls";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { QuoteStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { QuoteStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { QUOTE_STATUS_LABELS } from "@/lib/labels";
import { enumParam, listParams, pageCount, param } from "@/lib/list-params";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Devis" };

const SORTS = ["date", "number", "client", "total", "validity"] as const;
const STATUSES = Object.values(QuoteStatus);

export default async function QuotesPage({ searchParams }: PageProps<"/devis">) {
  const ctx = await getAppContext();
  const query = await searchParams;
  const params = listParams(query, { sortable: SORTS, defaultSort: "date" });
  const status = enumParam(query, "statut", STATUSES);
  const clientId = param(query, "client");

  const where: Prisma.QuoteWhereInput = {
    organizationId: ctx.organizationId,
    ...(status ? { status } : {}),
    ...(clientId ? { clientId } : {}),
    ...(params.q
      ? {
          OR: [
            { number: { contains: params.q, mode: "insensitive" } },
            { title: { contains: params.q, mode: "insensitive" } },
            { client: { name: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.QuoteOrderByWithRelationInput[] = {
    date: [{ issueDate: params.dir }, { number: params.dir }],
    number: [{ number: params.dir }],
    client: [{ client: { name: params.dir } }, { issueDate: "desc" as const }],
    total: [{ totalCents: params.dir }],
    validity: [{ validUntil: params.dir }],
  }[params.sort];

  const [rows, total, sums] = await Promise.all([
    db.quote.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      include: { client: { select: { id: true, name: true } } },
    }),
    db.quote.count({ where }),
    db.quote.aggregate({ where, _sum: { totalCents: true } }),
  ]);
  const filtered = Boolean(params.q || status || clientId);

  return (
    <PageContainer>
      <PageHeader title="Devis" description="Propositions commerciales et leur suivi.">
        <Button asChild>
          <Link href="/devis/nouveau">
            <PlusIcon data-icon="inline-start" />
            Nouveau devis
          </Link>
        </Button>
      </PageHeader>

      <ListToolbar>
        <SearchInput placeholder="Numéro, objet, client…" />
        <FilterSelect
          name="statut"
          label="Statut"
          allLabel="Tous les statuts"
          options={STATUSES.map((value) => ({ value, label: QUOTE_STATUS_LABELS[value] }))}
        />
        {total > 0 ? (
          <p className="text-sm text-muted-foreground sm:ml-auto">
            Total :{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatMoney(sums._sum.totalCents ?? 0)}
            </span>
          </p>
        ) : null}
      </ListToolbar>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={FileTextIcon}
            title="Aucun devis ne correspond"
            description="Modifiez la recherche ou les filtres."
          />
        ) : (
          <EmptyState
            icon={FileTextIcon}
            title="Aucun devis pour l'instant"
            description="Composez un devis à partir de votre catalogue, puis convertissez-le en facture une fois accepté."
          >
            <Button asChild>
              <Link href="/devis/nouveau">
                <PlusIcon data-icon="inline-start" />
                Nouveau devis
              </Link>
            </Button>
          </EmptyState>
        )
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead column="number" defaultDir="desc">
                    Numéro
                  </SortableHead>
                  <SortableHead column="client">Client</SortableHead>
                  <SortableHead column="date" isDefault defaultDir="desc" className="hidden sm:table-cell">
                    Date
                  </SortableHead>
                  <SortableHead column="validity" defaultDir="asc" className="hidden md:table-cell">
                    Validité
                  </SortableHead>
                  <SortableHead column="total" align="right" defaultDir="desc">
                    Total HT
                  </SortableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <Link href={`/devis/${quote.id}`} className="font-medium hover:underline">
                        {quote.number}
                      </Link>
                      <div className="max-w-40 truncate text-xs text-muted-foreground sm:max-w-64">{quote.title}</div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clients/${quote.client.id}`} className="hover:underline">
                        {quote.client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">
                      {formatDate(quote.issueDate)}
                    </TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell">
                      {formatDate(quote.validUntil)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(quote.totalCents)}
                    </TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={quote.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={params.page} pageCount={pageCount(total)} total={total} label="devis" />
        </>
      )}
    </PageContainer>
  );
}
