import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentLinesTable } from "@/components/documents/lines-table";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { DetailItem, PageContainer, PageHeader } from "@/components/shared/page";
import { InvoiceStatusBadge, QuoteStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addDays, diffDays, maxDate, toISO, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatRate } from "@/lib/format";
import { INVOICE_TYPE_SHORT_LABELS } from "@/lib/labels";
import { applyRate } from "@/lib/money";
import { quoteInvoicing } from "@/lib/server/quotes";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Devis" };

export default async function QuotePage({ params }: PageProps<"/devis/[id]">) {
  const { id } = await params;
  const ctx = await getAppContext();
  const quote = await db.quote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      client: { select: { id: true, name: true, city: true } },
      preQuote: { select: { id: true, number: true } },
      lines: { orderBy: { position: "asc" } },
      invoices: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          number: true,
          type: true,
          status: true,
          netCents: true,
          creditedCents: true,
          balanceInvoiceId: true,
        },
      },
    },
  });
  if (!quote) notFound();

  const todayDate = today();
  const invoicing = quoteInvoicing(quote.totalCents, quote.invoices);
  const daysLeft = diffDays(todayDate, quote.validUntil);
  const invoicedPct =
    quote.totalCents > 0 ? Math.min(100, (invoicing.invoicedCents / quote.totalCents) * 100) : 0;

  return (
    <PageContainer>
      <PageHeader
        title={quote.number}
        description={quote.title}
        back={{ href: "/devis", label: "Devis" }}
        badge={<QuoteStatusBadge status={quote.status} />}
      >
        <QuoteActions
          today={toISO(todayDate)}
          defaultValidUntil={toISO(
            addDays(maxDate(todayDate, quote.validUntil), ctx.settings.quoteValidityDays),
          )}
          quote={{
            id: quote.id,
            number: quote.number,
            status: quote.status,
            totalCents: quote.totalCents,
            depositRateBp: quote.depositRateBp,
            hasInvoices: quote.invoices.length > 0,
          }}
          invoicing={{
            canInvoiceFull: invoicing.canInvoiceFull,
            canInvoiceDeposit: invoicing.canInvoiceDeposit,
            canInvoiceBalance: invoicing.canInvoiceBalance,
            hasDraftDeposit: invoicing.hasDraftDeposit,
            pendingDepositCents: invoicing.pendingDepositCents,
          }}
        />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Prestations</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentLinesTable
                lines={quote.lines}
                subtotalCents={quote.subtotalCents}
                discountType={quote.discountType}
                discountValue={quote.discountValue}
                discountCents={quote.discountCents}
                finalLabel="Total HT"
                finalCents={quote.totalCents}
                vatMention={ctx.settings.vatMention}
              />
            </CardContent>
          </Card>

          {quote.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          ) : null}
          {quote.terms ? (
            <Card>
              <CardHeader>
                <CardTitle>Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.terms}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <DetailItem label="Client">
                  <Link href={`/clients/${quote.client.id}`} className="font-medium hover:underline">
                    {quote.client.name}
                  </Link>
                  {quote.client.city ? (
                    <span className="text-muted-foreground"> · {quote.client.city}</span>
                  ) : null}
                </DetailItem>
                <DetailItem label="Date du devis">{formatDate(quote.issueDate)}</DetailItem>
                <DetailItem label="Valable jusqu'au">
                  {formatDate(quote.validUntil)}
                  {quote.status === "SENT" ? (
                    <span className={daysLeft <= ctx.settings.quoteExpiryAlertDays ? "text-warning" : "text-muted-foreground"}>
                      {" "}
                      · {daysLeft === 0 ? "expire aujourd'hui" : `encore ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}
                    </span>
                  ) : null}
                </DetailItem>
                {quote.depositRateBp > 0 ? (
                  <DetailItem label="Acompte à la commande">
                    {formatRate(quote.depositRateBp)} ·{" "}
                    {formatMoney(applyRate(quote.totalCents, quote.depositRateBp))}
                  </DetailItem>
                ) : null}
                {quote.sentOn ? <DetailItem label="Envoyé le">{formatDate(quote.sentOn)}</DetailItem> : null}
                {quote.acceptedOn ? (
                  <DetailItem label="Accepté le">{formatDate(quote.acceptedOn)}</DetailItem>
                ) : null}
                {quote.declinedOn ? (
                  <DetailItem label="Refusé le">{formatDate(quote.declinedOn)}</DetailItem>
                ) : null}
                {quote.preQuote ? (
                  <DetailItem label="Pré-devis d'origine">
                    <Link href={`/pre-devis/${quote.preQuote.id}`} className="hover:underline">
                      {quote.preQuote.number}
                    </Link>
                  </DetailItem>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          {quote.invoices.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Facturation</CardTitle>
                <CardDescription>
                  {formatMoney(invoicing.invoicedCents)} facturés sur {formatMoney(quote.totalCents)}
                  {invoicing.remainingCents > 0
                    ? ` · reste ${formatMoney(invoicing.remainingCents)}`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={invoicedPct} aria-label="Part du devis déjà facturée" />
                <ul className="space-y-3">
                  {quote.invoices.map((invoice) => (
                    <li key={invoice.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        <Link href={`/factures/${invoice.id}`} className="font-medium hover:underline">
                          {invoice.number ?? "Brouillon"}
                        </Link>
                        <span className="text-muted-foreground">
                          {" "}
                          · {INVOICE_TYPE_SHORT_LABELS[invoice.type]}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">{formatMoney(invoice.netCents)}</span>
                        <InvoiceStatusBadge status={invoice.status} />
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
