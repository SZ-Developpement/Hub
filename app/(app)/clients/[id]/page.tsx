import { FilePlusIcon, ReceiptTextIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ClientMenu } from "@/components/clients/client-menu";
import { DetailItem, PageContainer, PageHeader } from "@/components/shared/page";
import { StatCard } from "@/components/shared/stat-card";
import {
  InvoiceStatusBadge,
  PreQuoteStatusBadge,
  QuoteStatusBadge,
  StatusBadge,
} from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import { formatDate, formatDays, formatMoney, formatSiret } from "@/lib/format";
import {
  CLIENT_TYPE_LABELS,
  INVOICE_TYPE_SHORT_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/labels";
import { getClientStats } from "@/lib/server/clients";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Fiche client" };

const LIMIT = 50;

function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const ctx = await getAppContext();
  const where = { clientId: id, organizationId: ctx.organizationId };

  const [client, stats, invoices, quotes, preQuotes, payments] = await Promise.all([
    db.client.findFirst({ where: { id, organizationId: ctx.organizationId } }),
    getClientStats(ctx.organizationId, id),
    db.invoice.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: LIMIT,
      select: {
        id: true,
        number: true,
        type: true,
        status: true,
        title: true,
        issueDate: true,
        dueDate: true,
        netCents: true,
      },
    }),
    db.quote.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: LIMIT,
      select: {
        id: true,
        number: true,
        status: true,
        title: true,
        issueDate: true,
        validUntil: true,
        totalCents: true,
      },
    }),
    db.preQuote.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: LIMIT,
      select: {
        id: true,
        number: true,
        status: true,
        title: true,
        issueDate: true,
        priceMinCents: true,
        priceMaxCents: true,
      },
    }),
    db.payment.findMany({
      where: { organizationId: ctx.organizationId, invoice: { clientId: id } },
      orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
      take: LIMIT,
      select: {
        id: true,
        paidOn: true,
        amountCents: true,
        method: true,
        reference: true,
        invoice: { select: { id: true, number: true } },
      },
    }),
  ]);
  if (!client) notFound();

  const hasDocuments = invoices.length + quotes.length + preQuotes.length > 0;
  const address = [
    client.addressLine1,
    client.addressLine2,
    `${client.postalCode} ${client.city}`.trim(),
    client.country,
  ].filter(Boolean);
  const termDays = client.paymentTermDays ?? ctx.settings.paymentTermDays;

  return (
    <PageContainer>
      <PageHeader
        title={client.name}
        back={{ href: "/clients", label: "Clients" }}
        badge={
          <>
            <StatusBadge tone="neutral">{CLIENT_TYPE_LABELS[client.type]}</StatusBadge>
            {client.archivedAt ? <StatusBadge tone="warning">Archivé</StatusBadge> : null}
          </>
        }
      >
        {!client.archivedAt ? (
          <>
            <Button asChild variant="outline">
              <Link href={`/devis/nouveau?client=${client.id}`}>
                <FilePlusIcon data-icon="inline-start" />
                Devis
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/factures/nouveau?client=${client.id}`}>
                <ReceiptTextIcon data-icon="inline-start" />
                Facture
              </Link>
            </Button>
          </>
        ) : null}
        <ClientMenu
          redirectAfterDelete
          client={{
            id: client.id,
            name: client.name,
            archived: client.archivedAt !== null,
            hasDocuments,
          }}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="CA encaissé"
          value={formatMoney(stats.paidCents)}
          hint={`${formatMoney(stats.invoicedCents)} facturés au total`}
        />
        <StatCard
          label="En attente de paiement"
          value={formatMoney(stats.outstandingCents)}
          tone={stats.outstandingCents > 0 ? "warning" : "default"}
        />
        <StatCard
          label="En retard"
          value={formatMoney(stats.overdueCents)}
          tone={stats.overdueCents > 0 ? "danger" : "default"}
          hint={
            stats.overdueCount > 0
              ? `${stats.overdueCount} facture${stats.overdueCount > 1 ? "s" : ""} échue${stats.overdueCount > 1 ? "s" : ""}`
              : "Aucune facture échue"
          }
        />
        <StatCard
          label="Délai moyen de paiement"
          value={stats.averagePaymentDays === null ? "—" : formatDays(stats.averagePaymentDays)}
          hint={
            stats.paidInvoiceCount > 0
              ? `${stats.latePaidCount} paiement${stats.latePaidCount > 1 ? "s" : ""} hors délai sur ${stats.paidInvoiceCount}`
              : "Aucune facture soldée"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Tabs defaultValue="invoices" className="lg:col-span-2">
          <TabsList>
            <TabsTrigger value="invoices">Factures ({invoices.length})</TabsTrigger>
            <TabsTrigger value="quotes">Devis ({quotes.length})</TabsTrigger>
            <TabsTrigger value="prequotes">Pré-devis ({preQuotes.length})</TabsTrigger>
            <TabsTrigger value="payments">Paiements ({payments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            {invoices.length === 0 ? (
              <EmptyRow>Aucune facture pour ce client.</EmptyRow>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Échéance</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Link href={`/factures/${invoice.id}`} className="font-medium hover:underline">
                            {invoice.number ?? "Brouillon"}
                          </Link>
                          <div className="max-w-56 truncate text-xs text-muted-foreground">
                            {invoice.type !== "STANDARD"
                              ? `${INVOICE_TYPE_SHORT_LABELS[invoice.type]} · `
                              : ""}
                            {invoice.title}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell className="hidden tabular-nums sm:table-cell">
                          {invoice.type === "CREDIT_NOTE" ? "—" : formatDate(invoice.dueDate)}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(invoice.netCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotes">
            {quotes.length === 0 ? (
              <EmptyRow>Aucun devis pour ce client.</EmptyRow>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Validité</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell>
                          <Link href={`/devis/${quote.id}`} className="font-medium hover:underline">
                            {quote.number}
                          </Link>
                          <div className="max-w-56 truncate text-xs text-muted-foreground">{quote.title}</div>
                        </TableCell>
                        <TableCell className="tabular-nums">{formatDate(quote.issueDate)}</TableCell>
                        <TableCell className="hidden tabular-nums sm:table-cell">
                          {formatDate(quote.validUntil)}
                        </TableCell>
                        <TableCell>
                          <QuoteStatusBadge status={quote.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(quote.totalCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="prequotes">
            {preQuotes.length === 0 ? (
              <EmptyRow>Aucun pré-devis pour ce client.</EmptyRow>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Fourchette</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preQuotes.map((preQuote) => (
                      <TableRow key={preQuote.id}>
                        <TableCell>
                          <Link href={`/pre-devis/${preQuote.id}`} className="font-medium hover:underline">
                            {preQuote.number}
                          </Link>
                          <div className="max-w-56 truncate text-xs text-muted-foreground">
                            {preQuote.title}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{formatDate(preQuote.issueDate)}</TableCell>
                        <TableCell>
                          <PreQuoteStatusBadge status={preQuote.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(preQuote.priceMinCents)} – {formatMoney(preQuote.priceMaxCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments">
            {payments.length === 0 ? (
              <EmptyRow>Aucun paiement enregistré pour ce client.</EmptyRow>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead className="hidden sm:table-cell">Moyen</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="tabular-nums">{formatDate(payment.paidOn)}</TableCell>
                        <TableCell>
                          <Link
                            href={`/factures/${payment.invoice.id}`}
                            className="font-medium hover:underline"
                          >
                            {payment.invoice.number}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {PAYMENT_METHOD_LABELS[payment.method]}
                          {payment.reference ? (
                            <span className="text-muted-foreground"> · {payment.reference}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(payment.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                {client.contactName ? (
                  <DetailItem label="Interlocuteur">
                    {client.contactName}
                    {client.contactRole ? (
                      <span className="text-muted-foreground"> · {client.contactRole}</span>
                    ) : null}
                  </DetailItem>
                ) : null}
                <DetailItem label="E-mail">
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="hover:underline">
                      {client.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </DetailItem>
                <DetailItem label="Téléphone">
                  {client.phone ? (
                    <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="hover:underline">
                      {client.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </DetailItem>
                <DetailItem label="Adresse de facturation">
                  {address.length > 0
                    ? address.map((line) => <div key={line}>{line}</div>)
                    : "—"}
                </DetailItem>
                {client.type === "COMPANY" ? (
                  <>
                    <DetailItem label={client.siret.length === 9 ? "SIREN" : "SIRET"}>
                      {client.siret ? formatSiret(client.siret) : "—"}
                    </DetailItem>
                    {client.vatNumber ? (
                      <DetailItem label="N° de TVA">{client.vatNumber}</DetailItem>
                    ) : null}
                  </>
                ) : null}
                <DetailItem label="Délai de paiement">
                  {termDays === 0 ? "À réception" : `${termDays} jours`}
                  {client.paymentTermDays === null ? (
                    <span className="text-muted-foreground"> · par défaut</span>
                  ) : null}
                </DetailItem>
              </dl>
            </CardContent>
          </Card>

          {client.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes internes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
