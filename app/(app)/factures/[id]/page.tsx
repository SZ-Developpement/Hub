import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentLinesTable } from "@/components/documents/lines-table";
import { DeleteEntryButton, InvoiceActions } from "@/components/invoices/invoice-actions";
import { DetailItem, PageContainer, PageHeader } from "@/components/shared/page";
import { InvoiceStatusBadge, StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { diffDays, maxDate, toISO, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatMoney, formatRate } from "@/lib/format";
import { amountDueCents } from "@/lib/invoice-status";
import {
  INVOICE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  REMINDER_CHANNEL_LABELS,
  REMINDER_LEVEL_LABELS,
} from "@/lib/labels";
import { peekNextNumber } from "@/lib/server/numbering";
import { getAppContext } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Facture" };

function BalanceRow({
  label,
  value,
  strong = false,
  className,
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        strong ? "border-t pt-3 text-base font-semibold" : "text-sm",
        className,
      )}
    >
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export default async function InvoicePage({ params }: PageProps<"/factures/[id]">) {
  const { id } = await params;
  const ctx = await getAppContext();
  const { organizationId } = ctx;
  const todayDate = today();

  const invoice = await db.invoice.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, name: true, city: true } },
      quote: { select: { id: true, number: true } },
      lines: { orderBy: { position: "asc" } },
      payments: { orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }] },
      reminders: { orderBy: [{ sentOn: "desc" }, { createdAt: "desc" }] },
      creditedInvoice: { select: { id: true, number: true } },
      creditNotes: {
        where: { status: { not: "DRAFT" } },
        orderBy: { issueDate: "asc" },
        select: { id: true, number: true, issueDate: true, netCents: true },
      },
      deductedDeposits: {
        where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
        orderBy: { issueDate: "asc" },
        select: { id: true, number: true, netCents: true, creditedCents: true },
      },
      balanceInvoice: { select: { id: true, number: true } },
    },
  });
  if (!invoice) notFound();

  const isDraft = invoice.status === "DRAFT";
  const isCreditNote = invoice.type === "CREDIT_NOTE";

  const [next, lastInvoice, lastCreditNote] = await Promise.all([
    isDraft ? peekNextNumber(organizationId, "INVOICE", todayDate) : null,
    isDraft
      ? db.invoice.findFirst({
          where: { organizationId, number: { not: null }, type: { not: "CREDIT_NOTE" } },
          orderBy: { issueDate: "desc" },
          select: { issueDate: true },
        })
      : null,
    !isDraft && !isCreditNote
      ? db.invoice.findFirst({
          where: { organizationId, type: "CREDIT_NOTE", number: { not: null } },
          orderBy: { issueDate: "desc" },
          select: { issueDate: true },
        })
      : null,
  ]);

  const dueCents = amountDueCents(invoice);
  const overdueDays = invoice.status === "OVERDUE" ? diffDays(invoice.dueDate, todayDate) : 0;
  const lastReminderLevel = invoice.reminders.reduce((level, item) => Math.max(level, item.level), 0);
  const typeLabel = INVOICE_TYPE_LABELS[invoice.type];
  const title = invoice.number ?? (isCreditNote ? "Avoir" : "Facture en brouillon");

  return (
    <PageContainer>
      <PageHeader
        title={title}
        description={invoice.title}
        back={{ href: "/factures", label: "Factures" }}
        badge={
          <>
            {invoice.type !== "STANDARD" ? <StatusBadge tone="neutral">{typeLabel}</StatusBadge> : null}
            {!isCreditNote ? <InvoiceStatusBadge status={invoice.status} /> : null}
          </>
        }
      >
        <InvoiceActions
          today={toISO(todayDate)}
          defaultMethod={ctx.settings.acceptedPaymentMethods[0] ?? "TRANSFER"}
          nextReminderLevel={Math.min(lastReminderLevel + 1, 4)}
          creditNoteMinDate={toISO(
            lastCreditNote ? maxDate(invoice.issueDate, lastCreditNote.issueDate) : invoice.issueDate,
          )}
          issue={{
            nextNumber: next?.preview ?? "",
            minDate: lastInvoice ? toISO(lastInvoice.issueDate) : null,
          }}
          invoice={{
            id: invoice.id,
            number: invoice.number,
            type: invoice.type,
            status: invoice.status,
            netCents: invoice.netCents,
            dueCents,
            creditableCents: invoice.netCents - invoice.creditedCents,
            issueDate: toISO(invoice.issueDate),
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
                lines={invoice.lines}
                subtotalCents={invoice.subtotalCents}
                discountType={invoice.discountType}
                discountValue={invoice.discountValue}
                discountCents={invoice.discountCents}
                deductions={invoice.deductedDeposits.map((deposit) => ({
                  label: `Acompte ${deposit.number}`,
                  amountCents: deposit.netCents - deposit.creditedCents,
                }))}
                finalLabel={isCreditNote ? "Montant de l'avoir" : "Net à payer"}
                finalCents={invoice.netCents}
                vatMention={ctx.settings.vatMention}
              />
            </CardContent>
          </Card>

          {!isDraft && !isCreditNote ? (
            <Card>
              <CardHeader>
                <CardTitle>Paiements</CardTitle>
                <CardDescription>
                  Chaque encaissement alimente le livre des recettes à sa date.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoice.payments.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Aucun paiement enregistré.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead className="hidden sm:table-cell">Référence</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="tabular-nums">{formatDate(payment.paidOn)}</TableCell>
                            <TableCell>
                              {PAYMENT_METHOD_LABELS[payment.method]}
                              {payment.amountCents < 0 ? (
                                <StatusBadge tone="warning" className="ml-2">
                                  Remboursement
                                </StatusBadge>
                              ) : null}
                            </TableCell>
                            <TableCell className="hidden max-w-56 truncate text-muted-foreground sm:table-cell">
                              {[payment.reference, payment.note].filter(Boolean).join(" · ") || "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatMoney(payment.amountCents)}
                            </TableCell>
                            <TableCell>
                              <DeleteEntryButton
                                kind="payment"
                                id={payment.id}
                                label="Supprimer le paiement"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {invoice.reminders.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Relances</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-lg border">
                  {invoice.reminders.map((reminder) => (
                    <li key={reminder.id} className="flex items-start gap-3 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {REMINDER_LEVEL_LABELS[reminder.level]}
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {formatDate(reminder.sentOn)} · {REMINDER_CHANNEL_LABELS[reminder.channel]}
                          </span>
                        </p>
                        {reminder.note ? (
                          <p className="whitespace-pre-wrap text-muted-foreground">{reminder.note}</p>
                        ) : null}
                      </div>
                      <DeleteEntryButton kind="reminder" id={reminder.id} label="Supprimer la relance" />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {invoice.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          ) : null}
          {invoice.terms ? (
            <Card>
              <CardHeader>
                <CardTitle>Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {!isDraft && !isCreditNote ? (
            <Card>
              <CardHeader>
                <CardTitle>Solde</CardTitle>
                {overdueDays > 0 ? (
                  <CardDescription className="text-destructive">
                    Échue depuis {overdueDays} jour{overdueDays > 1 ? "s" : ""}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <BalanceRow label="Net à payer" value={formatMoney(invoice.netCents)} />
                  {invoice.creditedCents > 0 ? (
                    <BalanceRow label="Avoirs" value={formatMoney(-invoice.creditedCents)} />
                  ) : null}
                  <BalanceRow label="Encaissé" value={formatMoney(-invoice.paidCents)} />
                  <BalanceRow
                    strong
                    label={dueCents < 0 ? "Trop-perçu à rembourser" : "Reste dû"}
                    value={formatMoney(Math.abs(dueCents))}
                    className={
                      dueCents < 0
                        ? "text-warning"
                        : invoice.status === "OVERDUE"
                          ? "text-destructive"
                          : dueCents === 0
                            ? "text-success"
                            : undefined
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <DetailItem label="Client">
                  <Link href={`/clients/${invoice.client.id}`} className="font-medium hover:underline">
                    {invoice.client.name}
                  </Link>
                  {invoice.client.city ? (
                    <span className="text-muted-foreground"> · {invoice.client.city}</span>
                  ) : null}
                </DetailItem>
                <DetailItem label={isDraft ? "Date d'émission prévue" : "Date d'émission"}>
                  {formatDate(invoice.issueDate)}
                </DetailItem>
                {!isCreditNote ? (
                  <DetailItem label="Échéance">
                    {formatDate(invoice.dueDate)}
                    <span className="text-muted-foreground">
                      {" "}
                      ·{" "}
                      {invoice.paymentTermDays === 0
                        ? "à réception"
                        : `${invoice.paymentTermDays} jours`}
                    </span>
                  </DetailItem>
                ) : null}
                {invoice.serviceStart ? (
                  <DetailItem label="Prestation">
                    {invoice.serviceEnd && invoice.serviceEnd.getTime() !== invoice.serviceStart.getTime()
                      ? `Du ${formatDate(invoice.serviceStart)} au ${formatDate(invoice.serviceEnd)}`
                      : formatDate(invoice.serviceStart)}
                  </DetailItem>
                ) : null}
                {invoice.paidOn ? (
                  <DetailItem label="Soldée le">{formatDate(invoice.paidOn)}</DetailItem>
                ) : null}
                {invoice.depositRateBp ? (
                  <DetailItem label="Acompte">{formatRate(invoice.depositRateBp)} du devis</DetailItem>
                ) : null}
                {invoice.quote ? (
                  <DetailItem label="Devis d'origine">
                    <Link href={`/devis/${invoice.quote.id}`} className="hover:underline">
                      {invoice.quote.number}
                    </Link>
                  </DetailItem>
                ) : null}
                {invoice.creditedInvoice ? (
                  <DetailItem label="Facture corrigée">
                    <Link href={`/factures/${invoice.creditedInvoice.id}`} className="hover:underline">
                      {invoice.creditedInvoice.number}
                    </Link>
                    {invoice.creditReason ? (
                      <div className="text-muted-foreground">Motif : {invoice.creditReason}</div>
                    ) : null}
                  </DetailItem>
                ) : null}
                {invoice.balanceInvoice ? (
                  <DetailItem label="Déduit dans la facture de solde">
                    <Link href={`/factures/${invoice.balanceInvoice.id}`} className="hover:underline">
                      {invoice.balanceInvoice.number ?? "Brouillon"}
                    </Link>
                  </DetailItem>
                ) : null}
                {invoice.creditNotes.length > 0 ? (
                  <DetailItem label="Avoirs émis">
                    <ul className="space-y-1">
                      {invoice.creditNotes.map((creditNote) => (
                        <li key={creditNote.id} className="flex justify-between gap-2">
                          <Link href={`/factures/${creditNote.id}`} className="hover:underline">
                            {creditNote.number}
                          </Link>
                          <span className="tabular-nums">{formatMoney(creditNote.netCents)}</span>
                        </li>
                      ))}
                    </ul>
                  </DetailItem>
                ) : null}
                {invoice.issuedAt ? (
                  <DetailItem label="Émise le">
                    {formatDateTime(invoice.issuedAt)}
                    <div className="text-xs text-muted-foreground">
                      Document verrouillé, PDF archivé.
                    </div>
                  </DetailItem>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
