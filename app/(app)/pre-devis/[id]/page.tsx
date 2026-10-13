import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PreQuoteActions } from "@/components/pre-quotes/pre-quote-actions";
import { DetailItem, PageContainer, PageHeader } from "@/components/shared/page";
import { PreQuoteStatusBadge, QuoteStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Pré-devis" };

export default async function PreQuotePage({ params }: PageProps<"/pre-devis/[id]">) {
  const { id } = await params;
  const ctx = await getAppContext();
  const preQuote = await db.preQuote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      client: { select: { id: true, name: true, email: true, city: true } },
      items: { orderBy: { position: "asc" } },
      quotes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, number: true, status: true, totalCents: true },
      },
    },
  });
  if (!preQuote) notFound();

  return (
    <PageContainer>
      <PageHeader
        title={preQuote.number}
        description={preQuote.title}
        back={{ href: "/pre-devis", label: "Pré-devis" }}
        badge={<PreQuoteStatusBadge status={preQuote.status} />}
      >
        <PreQuoteActions
          preQuote={{
            id: preQuote.id,
            number: preQuote.number,
            status: preQuote.status,
            hasQuotes: preQuote.quotes.length > 0,
          }}
        />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {preQuote.need ? (
            <Card>
              <CardHeader>
                <CardTitle>Besoin du client</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{preQuote.need}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Fonctionnalités et estimation</CardTitle>
            </CardHeader>
            <CardContent>
              {preQuote.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune fonctionnalité détaillée.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fonctionnalité</TableHead>
                        <TableHead className="text-right">Estimation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preQuote.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-normal">
                            <div className="font-medium">{item.label}</div>
                            {item.description ? (
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.daysMilli > 0 ? `${formatQuantity(item.daysMilli)} j` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell>Charge totale estimée</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(preQuote.totalDaysMilli)} j
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {preQuote.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{preQuote.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fourchette estimée</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {preQuote.priceMaxCents > 0
                  ? `${formatMoney(preQuote.priceMinCents)} – ${formatMoney(preQuote.priceMaxCents)}`
                  : "Non chiffrée"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                HT
                {preQuote.dailyRateCents
                  ? ` · TJM de référence ${formatMoney(preQuote.dailyRateCents)}`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <DetailItem label="Client">
                  <Link href={`/clients/${preQuote.client.id}`} className="font-medium hover:underline">
                    {preQuote.client.name}
                  </Link>
                  {preQuote.client.city ? (
                    <span className="text-muted-foreground"> · {preQuote.client.city}</span>
                  ) : null}
                </DetailItem>
                <DetailItem label="Date">{formatDate(preQuote.issueDate)}</DetailItem>
                {preQuote.sentOn ? (
                  <DetailItem label="Envoyé le">{formatDate(preQuote.sentOn)}</DetailItem>
                ) : null}
                {preQuote.respondedOn ? (
                  <DetailItem label="Réponse du client le">{formatDate(preQuote.respondedOn)}</DetailItem>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          {preQuote.quotes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Devis issus de ce pré-devis</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {preQuote.quotes.map((quote) => (
                    <li key={quote.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/devis/${quote.id}`} className="font-medium hover:underline">
                        {quote.number}
                      </Link>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">{formatMoney(quote.totalCents)}</span>
                        <QuoteStatusBadge status={quote.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
