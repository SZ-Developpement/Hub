import { BookOpenTextIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect, ListToolbar, Pagination, SearchInput } from "@/components/shared/list-controls";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { PeriodFilter } from "@/components/shared/period-filter";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentMethod } from "@/generated/prisma/enums";
import { toISO, today } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { enumParam, listParams, pageCount } from "@/lib/list-params";
import { resolvePeriod } from "@/lib/periods";
import { listReceipts } from "@/lib/server/accounting";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Livre des recettes" };

const PRESETS = ["month", "quarter", "year", "last-year", "30d", "custom"] as const;

export default async function ReceiptsPage({ searchParams }: PageProps<"/comptabilite/recettes">) {
  const ctx = await getAppContext();
  const query = await searchParams;
  const period = resolvePeriod(query, today(), "year");
  const params = listParams(query, { sortable: ["date"] as const, defaultSort: "date" });
  const method = enumParam(query, "mode", Object.values(PaymentMethod));

  const { rows, total, totalCents } = await listReceipts(
    ctx.organizationId,
    { from: period.from, to: period.to, method, q: params.q },
    { skip: params.skip, take: params.take },
  );

  const exportQuery = new URLSearchParams({ du: toISO(period.from), au: toISO(period.to) });
  if (method) exportQuery.set("mode", method);

  return (
    <PageContainer>
      <PageHeader
        title="Livre des recettes"
        description="Tenu automatiquement : chaque paiement enregistré sur une facture y figure à sa date d'encaissement."
      >
        <Button asChild variant="outline">
          <a href={`/api/export/recettes?${exportQuery.toString()}&format=csv`}>
            <DownloadIcon data-icon="inline-start" />
            CSV
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/export/recettes?${exportQuery.toString()}&format=pdf`} target="_blank" rel="noreferrer">
            <FileTextIcon data-icon="inline-start" />
            PDF
          </a>
        </Button>
      </PageHeader>

      <ListToolbar>
        <PeriodFilter
          presets={PRESETS}
          value={period.preset}
          from={toISO(period.from)}
          to={toISO(period.to)}
        />
        <FilterSelect
          name="mode"
          label="Mode de règlement"
          allLabel="Tous les modes"
          options={Object.values(PaymentMethod).map((value) => ({
            value,
            label: PAYMENT_METHOD_LABELS[value],
          }))}
        />
        <SearchInput placeholder="Client, facture, référence…" className="sm:ml-auto" />
      </ListToolbar>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Recettes encaissées" value={formatMoney(totalCents)} hint={period.label} />
        <StatCard label="Encaissements" value={String(total)} />
        <StatCard
          label="Encaissement moyen"
          value={total > 0 ? formatMoney(Math.round(totalCents / total)) : "—"}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpenTextIcon}
          title="Aucune recette sur cette période"
          description="Les recettes apparaissent ici dès qu'un paiement est enregistré sur une facture."
        >
          <Button asChild variant="outline">
            <Link href="/factures?statut=a-encaisser">Voir les factures à encaisser</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Facture</TableHead>
                  <TableHead className="hidden md:table-cell">Mode de règlement</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="tabular-nums">{formatDate(receipt.paidOn)}</TableCell>
                    <TableCell>
                      <Link href={`/clients/${receipt.invoice.client.id}`} className="hover:underline">
                        {receipt.invoice.client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/factures/${receipt.invoice.id}`} className="font-medium hover:underline">
                        {receipt.invoice.number}
                      </Link>
                      <div className="max-w-56 truncate text-xs text-muted-foreground">
                        {receipt.invoice.title}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {PAYMENT_METHOD_LABELS[receipt.method]}
                      {receipt.reference ? (
                        <span className="text-muted-foreground"> · {receipt.reference}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(receipt.amountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total de la période</TableCell>
                  <TableCell className="hidden md:table-cell" />
                  <TableCell className="text-right tabular-nums">{formatMoney(totalCents)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <Pagination
            page={params.page}
            pageCount={pageCount(total)}
            total={total}
            label={total > 1 ? "encaissements" : "encaissement"}
          />
        </>
      )}
    </PageContainer>
  );
}
