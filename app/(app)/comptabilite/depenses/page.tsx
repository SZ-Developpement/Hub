import { DownloadIcon, PaperclipIcon, WalletIcon } from "lucide-react";
import type { Metadata } from "next";

import {
  ExpenseCategoriesButton,
  ExpenseMenu,
  NewExpenseButton,
} from "@/components/accounting/expense-controls";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FilterSelect,
  ListToolbar,
  Pagination,
  SearchInput,
  SortableHead,
} from "@/components/shared/list-controls";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { PeriodFilter } from "@/components/shared/period-filter";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { toISO, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { listParams, pageCount, param } from "@/lib/list-params";
import { resolvePeriod } from "@/lib/periods";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Dépenses" };

const PRESETS = ["month", "quarter", "year", "last-year", "30d", "custom"] as const;
const SORTS = ["date", "supplier", "amount"] as const;

export default async function ExpensesPage({ searchParams }: PageProps<"/comptabilite/depenses">) {
  const ctx = await getAppContext();
  const { organizationId } = ctx;
  const query = await searchParams;
  const todayDate = today();
  const period = resolvePeriod(query, todayDate, "year");
  const params = listParams(query, { sortable: SORTS, defaultSort: "date" });
  const categoryId = param(query, "categorie");

  const where: Prisma.ExpenseWhereInput = {
    organizationId,
    date: { gte: period.from, lte: period.to },
    ...(categoryId ? { categoryId } : {}),
    ...(params.q
      ? {
          OR: [
            { supplier: { contains: params.q, mode: "insensitive" } },
            { label: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ExpenseOrderByWithRelationInput[] = {
    date: [{ date: params.dir }, { createdAt: params.dir }],
    supplier: [{ supplier: params.dir }, { date: "desc" as const }],
    amount: [{ amountCents: params.dir }],
  }[params.sort];

  const [rows, aggregate, categories, byCategory] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      include: {
        category: { select: { name: true } },
        receiptFile: { select: { id: true, originalName: true } },
      },
    }),
    db.expense.aggregate({ where, _count: true, _sum: { amountCents: true } }),
    db.expenseCategory.findMany({
      where: { organizationId },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, _count: { select: { expenses: true } } },
    }),
    db.expense.groupBy({
      by: ["categoryId"],
      where,
      _sum: { amountCents: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 1,
    }),
  ]);

  const total = aggregate._count;
  const totalCents = aggregate._sum.amountCents ?? 0;
  const categoryOptions = categories.map(({ id, name }) => ({ id, name }));
  const topCategory = categories.find((category) => category.id === byCategory[0]?.categoryId);
  const todayIso = toISO(todayDate);
  const exportQuery = new URLSearchParams({ du: toISO(period.from), au: toISO(period.to) });

  return (
    <PageContainer>
      <PageHeader
        title="Dépenses"
        description="Suivi personnel de vos frais. En micro-entreprise, ils ne sont pas déductibles : ils servent à estimer votre bénéfice réel."
      >
        <Button asChild variant="outline">
          <a href={`/api/export/depenses?${exportQuery.toString()}`}>
            <DownloadIcon data-icon="inline-start" />
            CSV
          </a>
        </Button>
        <ExpenseCategoriesButton
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            count: category._count.expenses,
          }))}
        />
        <NewExpenseButton categories={categoryOptions} today={todayIso} />
      </PageHeader>

      <ListToolbar>
        <PeriodFilter
          presets={PRESETS}
          value={period.preset}
          from={toISO(period.from)}
          to={toISO(period.to)}
        />
        <FilterSelect
          name="categorie"
          label="Catégorie"
          allLabel="Toutes les catégories"
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
        />
        <SearchInput placeholder="Fournisseur, objet…" className="sm:ml-auto" />
      </ListToolbar>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total des dépenses" value={formatMoney(totalCents)} hint={period.label} />
        <StatCard label="Nombre de dépenses" value={String(total)} />
        <StatCard
          label="Premier poste"
          value={topCategory?.name ?? "—"}
          hint={topCategory ? formatMoney(byCategory[0]?._sum.amountCents ?? 0) : undefined}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title="Aucune dépense sur cette période"
          description="Enregistrez vos abonnements, votre matériel ou vos déplacements, avec leur justificatif."
        >
          <NewExpenseButton categories={categoryOptions} today={todayIso} />
        </EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead column="date" isDefault defaultDir="desc">
                    Date
                  </SortableHead>
                  <SortableHead column="supplier">Fournisseur</SortableHead>
                  <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                  <TableHead className="hidden lg:table-cell">Paiement</TableHead>
                  <SortableHead column="amount" align="right" defaultDir="desc">
                    Montant
                  </SortableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="tabular-nums">{formatDate(expense.date)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{expense.supplier}</div>
                      {expense.label ? (
                        <div className="max-w-64 truncate text-xs text-muted-foreground">
                          {expense.label}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusBadge tone="neutral">{expense.category.name}</StatusBadge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {PAYMENT_METHOD_LABELS[expense.method]}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(expense.amountCents)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        {expense.receiptFile ? (
                          <Button asChild variant="ghost" size="icon-sm">
                            <a
                              href={`/api/files/${expense.receiptFile.id}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Ouvrir le justificatif"
                            >
                              <PaperclipIcon />
                            </a>
                          </Button>
                        ) : null}
                        <ExpenseMenu
                          categories={categoryOptions}
                          today={todayIso}
                          receiptName={expense.receiptFile?.originalName ?? null}
                          expense={{
                            id: expense.id,
                            date: toISO(expense.date),
                            supplier: expense.supplier,
                            label: expense.label,
                            categoryId: expense.categoryId,
                            amountCents: expense.amountCents,
                            method: expense.method,
                            notes: expense.notes,
                          }}
                        />
                      </div>
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
            label={total > 1 ? "dépenses" : "dépense"}
          />
        </>
      )}
    </PageContainer>
  );
}
