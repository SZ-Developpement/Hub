import { PlusIcon, ReceiptTextIcon } from "lucide-react";
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
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
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
import { InvoiceStatus, InvoiceType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { amountDueCents } from "@/lib/invoice-status";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
  INVOICE_TYPE_SHORT_LABELS,
} from "@/lib/labels";
import { enumParam, listParams, pageCount, param } from "@/lib/list-params";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Factures" };

const SORTS = ["date", "number", "client", "due", "total"] as const;
const UNPAID = "a-encaisser";
const UNPAID_STATUSES: InvoiceStatus[] = ["ISSUED", "PARTIALLY_PAID", "OVERDUE"];
const STATUS_FILTERS = [UNPAID, ...Object.values(InvoiceStatus)] as const;

export default async function InvoicesPage({ searchParams }: PageProps<"/factures">) {
  const ctx = await getAppContext();
  const query = await searchParams;
  const params = listParams(query, { sortable: SORTS, defaultSort: "date" });
  const status = enumParam(query, "statut", STATUS_FILTERS);
  const type = enumParam(query, "type", Object.values(InvoiceType));
  const clientId = param(query, "client");

  const where: Prisma.InvoiceWhereInput = {
    organizationId: ctx.organizationId,
    ...(status === UNPAID
      ? { status: { in: UNPAID_STATUSES }, type: { not: "CREDIT_NOTE" } }
      : status
        ? { status }
        : {}),
    ...(type ? { type } : {}),
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
  const orderBy: Prisma.InvoiceOrderByWithRelationInput[] = {
    date: [{ issueDate: params.dir }, { number: { sort: params.dir, nulls: "first" as const } }],
    number: [{ number: { sort: params.dir, nulls: "last" as const } }],
    client: [{ client: { name: params.dir } }, { issueDate: "desc" as const }],
    due: [{ dueDate: params.dir }],
    total: [{ netCents: params.dir }],
  }[params.sort];

  const [rows, total, sums, unpaid] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      include: { client: { select: { id: true, name: true } } },
    }),
    db.invoice.count({ where }),
    db.invoice.aggregate({ where: { ...where, NOT: { status: "DRAFT" } }, _sum: { netCents: true } }),
    db.invoice.aggregate({
      where: { AND: [where, { status: { in: UNPAID_STATUSES }, type: { not: "CREDIT_NOTE" } }] },
      _sum: { netCents: true, paidCents: true, creditedCents: true },
    }),
  ]);
  const unpaidCents =
    (unpaid._sum.netCents ?? 0) - (unpaid._sum.paidCents ?? 0) - (unpaid._sum.creditedCents ?? 0);
  const filtered = Boolean(params.q || status || type || clientId);

  return (
    <PageContainer>
      <PageHeader title="Factures" description="Factures, acomptes, soldes et avoirs.">
        <Button asChild>
          <Link href="/factures/nouveau">
            <PlusIcon data-icon="inline-start" />
            Nouvelle facture
          </Link>
        </Button>
      </PageHeader>

      <ListToolbar>
        <SearchInput placeholder="Numéro, objet, client…" />
        <FilterSelect
          name="statut"
          label="Statut"
          allLabel="Tous les statuts"
          options={[
            { value: UNPAID, label: "À encaisser" },
            ...Object.values(InvoiceStatus).map((value) => ({
              value,
              label: INVOICE_STATUS_LABELS[value],
            })),
          ]}
        />
        <FilterSelect
          name="type"
          label="Type"
          allLabel="Tous les types"
          options={Object.values(InvoiceType).map((value) => ({
            value,
            label: INVOICE_TYPE_LABELS[value],
          }))}
        />
        {total > 0 ? (
          <p className="text-sm text-muted-foreground sm:ml-auto">
            Facturé :{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatMoney(sums._sum.netCents ?? 0)}
            </span>
            {" · "}À encaisser :{" "}
            <span className="font-medium text-foreground tabular-nums">{formatMoney(unpaidCents)}</span>
          </p>
        ) : null}
      </ListToolbar>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={ReceiptTextIcon}
            title="Aucune facture ne correspond"
            description="Modifiez la recherche ou les filtres."
          />
        ) : (
          <EmptyState
            icon={ReceiptTextIcon}
            title="Aucune facture pour l'instant"
            description="Créez une facture directement, ou convertissez un devis accepté en facture totale, d'acompte ou de solde."
          >
            <Button asChild>
              <Link href="/factures/nouveau">
                <PlusIcon data-icon="inline-start" />
                Nouvelle facture
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
                  <SortableHead column="due" defaultDir="asc" className="hidden md:table-cell">
                    Échéance
                  </SortableHead>
                  <SortableHead column="total" align="right" defaultDir="desc">
                    Net HT
                  </SortableHead>
                  <TableHead className="hidden text-right lg:table-cell">Reste dû</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((invoice) => {
                  const due = amountDueCents(invoice);
                  const isCreditNote = invoice.type === "CREDIT_NOTE";
                  const showDue = !isCreditNote && invoice.status !== "DRAFT" && due !== 0;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link href={`/factures/${invoice.id}`} className="font-medium hover:underline">
                          {invoice.number ?? "Brouillon"}
                        </Link>
                        <div className="max-w-40 truncate text-xs text-muted-foreground sm:max-w-64">
                          {invoice.type !== "STANDARD"
                            ? `${INVOICE_TYPE_SHORT_LABELS[invoice.type]} · `
                            : ""}
                          {invoice.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/clients/${invoice.client.id}`} className="hover:underline">
                          {invoice.client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell className="hidden tabular-nums md:table-cell">
                        {isCreditNote ? "—" : formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(invoice.netCents)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums lg:table-cell">
                        {showDue ? formatMoney(due) : "—"}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={params.page}
            pageCount={pageCount(total)}
            total={total}
            label={total > 1 ? "factures" : "facture"}
          />
        </>
      )}
    </PageContainer>
  );
}
