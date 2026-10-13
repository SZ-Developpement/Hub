import { LightbulbIcon, PlusIcon } from "lucide-react";
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
import { PreQuoteStatusBadge } from "@/components/shared/status-badge";
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
import { PreQuoteStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import { PRE_QUOTE_STATUS_LABELS } from "@/lib/labels";
import { enumParam, listParams, pageCount, param } from "@/lib/list-params";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Pré-devis" };

const SORTS = ["date", "number", "client", "price"] as const;
const STATUSES = Object.values(PreQuoteStatus);

export default async function PreQuotesPage({ searchParams }: PageProps<"/pre-devis">) {
  const ctx = await getAppContext();
  const query = await searchParams;
  const params = listParams(query, { sortable: SORTS, defaultSort: "date" });
  const status = enumParam(query, "statut", STATUSES);
  const clientId = param(query, "client");

  const where: Prisma.PreQuoteWhereInput = {
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
  const orderBy: Prisma.PreQuoteOrderByWithRelationInput[] = {
    date: [{ issueDate: params.dir }, { number: params.dir }],
    number: [{ number: params.dir }],
    client: [{ client: { name: params.dir } }, { issueDate: "desc" as const }],
    price: [{ priceMaxCents: params.dir }],
  }[params.sort];

  const [rows, total] = await Promise.all([
    db.preQuote.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      include: { client: { select: { id: true, name: true } } },
    }),
    db.preQuote.count({ where }),
  ]);
  const filtered = Boolean(params.q || status || clientId);

  return (
    <PageContainer>
      <PageHeader
        title="Pré-devis"
        description="Estimations rapides, avant d'engager un devis détaillé."
      >
        <Button asChild>
          <Link href="/pre-devis/nouveau">
            <PlusIcon data-icon="inline-start" />
            Nouveau pré-devis
          </Link>
        </Button>
      </PageHeader>

      <ListToolbar>
        <SearchInput placeholder="Numéro, objet, client…" />
        <FilterSelect
          name="statut"
          label="Statut"
          allLabel="Tous les statuts"
          options={STATUSES.map((value) => ({ value, label: PRE_QUOTE_STATUS_LABELS[value] }))}
        />
      </ListToolbar>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={LightbulbIcon}
            title="Aucun pré-devis ne correspond"
            description="Modifiez la recherche ou les filtres."
          />
        ) : (
          <EmptyState
            icon={LightbulbIcon}
            title="Aucun pré-devis pour l'instant"
            description="Un pré-devis donne au client une fourchette de prix et un périmètre, sans le formalisme d'un devis."
          >
            <Button asChild>
              <Link href="/pre-devis/nouveau">
                <PlusIcon data-icon="inline-start" />
                Nouveau pré-devis
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
                  <TableHead className="hidden text-right md:table-cell">Charge</TableHead>
                  <SortableHead column="price" align="right" defaultDir="desc">
                    Fourchette HT
                  </SortableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((preQuote) => (
                  <TableRow key={preQuote.id}>
                    <TableCell>
                      <Link href={`/pre-devis/${preQuote.id}`} className="font-medium hover:underline">
                        {preQuote.number}
                      </Link>
                      <div className="max-w-40 truncate text-xs text-muted-foreground sm:max-w-64">
                        {preQuote.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clients/${preQuote.client.id}`} className="hover:underline">
                        {preQuote.client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">
                      {formatDate(preQuote.issueDate)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {preQuote.totalDaysMilli > 0 ? `${formatQuantity(preQuote.totalDaysMilli)} j` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {preQuote.priceMaxCents > 0
                        ? `${formatMoney(preQuote.priceMinCents)} – ${formatMoney(preQuote.priceMaxCents)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <PreQuoteStatusBadge status={preQuote.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={params.page}
            pageCount={pageCount(total)}
            total={total}
            label="pré-devis"
          />
        </>
      )}
    </PageContainer>
  );
}
