import { PlusIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ClientMenu } from "@/components/clients/client-menu";
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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { CLIENT_TYPE_LABELS } from "@/lib/labels";
import { enumParam, listParams, pageCount, param } from "@/lib/list-params";
import { CLIENT_SORTS, listClients } from "@/lib/server/clients";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const ctx = await getAppContext();
  const query = await searchParams;
  const params = listParams(query, { sortable: CLIENT_SORTS, defaultSort: "name", defaultDir: "asc" });
  const type = enumParam(query, "type", ["COMPANY", "INDIVIDUAL"] as const);
  const archived = param(query, "statut") === "archives";

  const { rows, total } = await listClients(ctx.organizationId, params, { type, archived });
  const filtered = Boolean(params.q || type || archived);

  return (
    <PageContainer>
      <PageHeader title="Clients" description="Particuliers et professionnels, avec leurs encours.">
        <Button asChild>
          <Link href="/clients/nouveau">
            <PlusIcon data-icon="inline-start" />
            Nouveau client
          </Link>
        </Button>
      </PageHeader>

      <ListToolbar>
        <SearchInput placeholder="Nom, contact, ville, SIRET…" />
        <FilterSelect
          name="type"
          label="Type de client"
          allLabel="Tous les types"
          options={[
            { value: "COMPANY", label: CLIENT_TYPE_LABELS.COMPANY },
            { value: "INDIVIDUAL", label: CLIENT_TYPE_LABELS.INDIVIDUAL },
          ]}
        />
        <FilterSelect
          name="statut"
          label="Statut"
          allLabel="Clients actifs"
          options={[{ value: "archives", label: "Clients archivés" }]}
        />
      </ListToolbar>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={UsersIcon}
            title="Aucun client ne correspond"
            description="Modifiez la recherche ou les filtres."
          />
        ) : (
          <EmptyState
            icon={UsersIcon}
            title="Aucun client pour l'instant"
            description="Créez votre premier client pour pouvoir établir un devis ou une facture."
          >
            <Button asChild>
              <Link href="/clients/nouveau">
                <PlusIcon data-icon="inline-start" />
                Nouveau client
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
                  <SortableHead column="name" isDefault defaultSortDir="asc">
                    Client
                  </SortableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <SortableHead column="city" className="hidden lg:table-cell">
                    Ville
                  </SortableHead>
                  <SortableHead column="paid" align="right" defaultDir="desc">
                    CA encaissé
                  </SortableHead>
                  <SortableHead column="outstanding" align="right" defaultDir="desc">
                    En attente
                  </SortableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                        {client.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {CLIENT_TYPE_LABELS[client.type]}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>{client.contactName || "—"}</div>
                      {client.email ? (
                        <div className="text-xs text-muted-foreground">{client.email}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{client.city || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(client.paidCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {client.outstandingCents > 0 ? formatMoney(client.outstandingCents) : "—"}
                      {client.overdueCents > 0 ? (
                        <div className="mt-0.5">
                          <StatusBadge tone="danger">
                            {formatMoney(client.overdueCents)} en retard
                          </StatusBadge>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <ClientMenu
                        client={{
                          id: client.id,
                          name: client.name,
                          archived: client.archivedAt !== null,
                          hasDocuments: client.hasDocuments,
                        }}
                      />
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
            label={total > 1 ? "clients" : "client"}
          />
        </>
      )}
    </PageContainer>
  );
}
