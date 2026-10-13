import { PackageIcon } from "lucide-react";
import type { Metadata } from "next";

import {
  CategoriesButton,
  NewServiceButton,
  ServiceMenu,
} from "@/components/catalog/catalog-controls";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FilterSelect,
  ListToolbar,
  Pagination,
  SearchInput,
  SortableHead,
} from "@/components/shared/list-controls";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/labels";
import { listParams, pageCount, param } from "@/lib/list-params";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Catalogue" };

const SORTS = ["name", "category", "price"] as const;
const NO_CATEGORY = "aucune";

export default async function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  const ctx = await getAppContext();
  const query = await searchParams;
  const params = listParams(query, { sortable: SORTS, defaultSort: "name", defaultDir: "asc" });
  const categoryFilter = param(query, "categorie");
  const archived = param(query, "statut") === "archivees";

  const where: Prisma.ServiceWhereInput = {
    organizationId: ctx.organizationId,
    archivedAt: archived ? { not: null } : null,
    ...(categoryFilter === NO_CATEGORY ? { categoryId: null } : {}),
    ...(categoryFilter && categoryFilter !== NO_CATEGORY ? { categoryId: categoryFilter } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ServiceOrderByWithRelationInput[] =
    params.sort === "price"
      ? [{ unitPriceCents: params.dir }, { name: "asc" }]
      : params.sort === "category"
        ? [{ category: { name: params.dir } }, { name: "asc" }]
        : [{ name: params.dir }];

  const [services, total, categories] = await Promise.all([
    db.service.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      include: {
        category: { select: { name: true } },
        _count: { select: { quoteLines: true, invoiceLines: true } },
      },
    }),
    db.service.count({ where }),
    db.serviceCategory.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, _count: { select: { services: true } } },
    }),
  ]);

  const categoryOptions = categories.map(({ id, name }) => ({ id, name }));
  const filtered = Boolean(params.q || categoryFilter || archived);

  return (
    <PageContainer>
      <PageHeader
        title="Catalogue"
        description="Vos prestations réutilisables dans les devis et les factures."
      >
        <CategoriesButton
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            count: category._count.services,
          }))}
        />
        <NewServiceButton categories={categoryOptions} />
      </PageHeader>

      <ListToolbar>
        <SearchInput placeholder="Rechercher une prestation…" />
        <FilterSelect
          name="categorie"
          label="Catégorie"
          allLabel="Toutes les catégories"
          options={[
            ...categories.map((category) => ({ value: category.id, label: category.name })),
            { value: NO_CATEGORY, label: "Sans catégorie" },
          ]}
        />
        <FilterSelect
          name="statut"
          label="Statut"
          allLabel="Prestations actives"
          options={[{ value: "archivees", label: "Prestations archivées" }]}
        />
      </ListToolbar>

      {services.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={PackageIcon}
            title="Aucune prestation ne correspond"
            description="Modifiez la recherche ou les filtres."
          />
        ) : (
          <EmptyState
            icon={PackageIcon}
            title="Votre catalogue est vide"
            description="Ajoutez vos prestations habituelles (site vitrine, TJM, maintenance mensuelle…) pour composer vos devis en quelques clics."
          >
            <NewServiceButton categories={categoryOptions} />
          </EmptyState>
        )
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead column="name" isDefault defaultSortDir="asc">
                    Prestation
                  </SortableHead>
                  <SortableHead column="category" className="hidden md:table-cell">
                    Catégorie
                  </SortableHead>
                  <TableHead className="hidden sm:table-cell">Unité</TableHead>
                  <SortableHead column="price" align="right" defaultDir="desc">
                    Prix unitaire HT
                  </SortableHead>
                  <TableHead className="hidden text-right lg:table-cell">Utilisations</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => {
                  const uses = service._count.quoteLines + service._count.invoiceLines;
                  return (
                    <TableRow key={service.id}>
                      <TableCell className="max-w-80">
                        <div className="font-medium">{service.name}</div>
                        {service.description ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {service.description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {service.category ? (
                          <StatusBadge tone="neutral">{service.category.name}</StatusBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{UNIT_LABELS[service.unit]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(service.unitPriceCents)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                        {uses}
                      </TableCell>
                      <TableCell>
                        <ServiceMenu
                          categories={categoryOptions}
                          archived={service.archivedAt !== null}
                          used={uses > 0}
                          service={{
                            id: service.id,
                            name: service.name,
                            description: service.description,
                            categoryId: service.categoryId,
                            unit: service.unit,
                            unitPriceCents: service.unitPriceCents,
                          }}
                        />
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
            label={total > 1 ? "prestations" : "prestation"}
          />
        </>
      )}
    </PageContainer>
  );
}
