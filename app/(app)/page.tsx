import { CircleCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { ColumnChart, DualSeriesChart } from "@/components/charts/series-charts";
import { BarList, Funnel, Meter, StatusBreakdown } from "@/components/charts/simple-charts";
import { AlertList } from "@/components/dashboard/alerts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { PeriodFilter } from "@/components/shared/period-filter";
import { PeriodFrame, PeriodFrameBody } from "@/components/shared/period-frame";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { minDate, toISO, today } from "@/lib/dates";
import { db } from "@/lib/db";
import {
  formatDate,
  formatDays,
  formatMoney,
  formatPercent,
  formatRelative,
} from "@/lib/format";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES } from "@/lib/labels";
import { resolvePeriod } from "@/lib/periods";
import { getAlerts } from "@/lib/server/alerts";
import { getDashboard } from "@/lib/server/dashboard";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Tableau de bord" };

const PRESETS = ["7d", "30d", "3m", "6m", "year", "last-year", "custom"] as const;

const CEILING_LEVELS = {
  ok: { label: "Sous les seuils", tone: "success" },
  warning: { label: "Seuil d'alerte atteint", tone: "warning" },
  critical: { label: "Seuil critique atteint", tone: "danger" },
  exceeded: { label: "Plafond dépassé", tone: "danger" },
} as const;

const GRANULARITY_LABELS = { day: "par jour", week: "par semaine", month: "par mois" } as const;

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const ctx = await getAppContext();
  const todayDate = today();
  const requested = resolvePeriod(await searchParams, todayDate, "year");
  // Une période en cours s'arrête à aujourd'hui : on ne compare pas une année
  // entamée à une année complète.
  const end = minDate(requested.to, todayDate);
  const period = { from: requested.from, to: end < requested.from ? requested.to : end };

  const [data, alerts, activity] = await Promise.all([
    getDashboard(ctx, period, todayDate),
    getAlerts(ctx),
    db.activityLog.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, summary: true, amountCents: true, createdAt: true, entity: true },
    }),
  ]);

  const { kpis, funnel, ceiling } = data;
  const now = new Date();
  const rangeLabel = `${formatDate(period.from)} – ${formatDate(period.to)}`;
  const previousLabel = `${formatDate(data.previous.from)} – ${formatDate(data.previous.to)}`;
  const money = (value: number | null) => (value === null ? "—" : formatMoney(value));
  const percent = (value: number | null) => (value === null ? "—" : formatPercent(value, 0));
  const ceilingLevel = CEILING_LEVELS[ceiling.level];
  const hasRevenue = data.series.some((point) => point.collected !== 0 || point.invoiced !== 0);
  const hasComparison = data.yearOverYear.some((point) => point.current !== 0 || point.previous !== 0);

  return (
    <PeriodFrame>
      <PageContainer size="wide">
        <PageHeader
          title="Tableau de bord"
          description={`Bonjour ${ctx.user.name.split(" ")[0]} — ${rangeLabel}, comparé à ${previousLabel}.`}
        >
          <PeriodFilter
            presets={PRESETS}
            value={requested.preset}
            from={toISO(period.from)}
            to={toISO(period.to)}
          />
        </PageHeader>

        <PeriodFrameBody className="flex flex-col gap-6">
          {/* ── Indicateurs clés ── */}
          <section aria-label="Indicateurs clés" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            <KpiCard
              label="CA encaissé"
              value={formatMoney(kpis.collected.value ?? 0)}
              kpi={kpis.collected}
              href="/comptabilite/recettes"
            />
            <KpiCard
              label="CA facturé"
              value={formatMoney(kpis.invoiced.value ?? 0)}
              kpi={kpis.invoiced}
              href="/factures"
            />
            <KpiCard
              label="En attente de paiement"
              value={formatMoney(kpis.outstanding.value ?? 0)}
              kpi={kpis.outstanding}
              polarity="down-good"
              hint={`au ${formatDate(data.asOf)}`}
              href="/factures?statut=a-encaisser"
            />
            <KpiCard
              label="En retard"
              value={formatMoney(kpis.overdue.value ?? 0)}
              kpi={kpis.overdue}
              polarity="down-good"
              hint={
                data.overdueCount > 0
                  ? `${data.overdueCount} facture${data.overdueCount > 1 ? "s" : ""} échue${data.overdueCount > 1 ? "s" : ""}`
                  : "aucune facture échue"
              }
              href="/factures?statut=OVERDUE"
            />
            <KpiCard
              label="Devis envoyés"
              value={String(kpis.quotesSent.value ?? 0)}
              kpi={kpis.quotesSent}
              href="/devis"
            />
            <KpiCard
              label="Devis acceptés"
              value={String(kpis.quotesAccepted.value ?? 0)}
              kpi={kpis.quotesAccepted}
              href="/devis?statut=ACCEPTED"
            />
            <KpiCard
              label="Conversion pré-devis → devis"
              value={percent(kpis.preQuoteConversion.value)}
              kpi={kpis.preQuoteConversion}
              unit="points"
              hint={`${funnel.preQuotesConverted} sur ${funnel.preQuotesSent} pré-devis`}
            />
            <KpiCard
              label="Conversion devis → facture"
              value={percent(kpis.quoteConversion.value)}
              kpi={kpis.quoteConversion}
              unit="points"
              hint={`${funnel.quotesInvoiced} sur ${funnel.quotesSent} devis`}
            />
            <KpiCard
              label="Panier moyen"
              value={money(kpis.averageInvoice.value === null ? null : Math.round(kpis.averageInvoice.value))}
              kpi={kpis.averageInvoice}
              hint={`${data.totals.invoiceCount} facture${data.totals.invoiceCount > 1 ? "s" : ""} émise${data.totals.invoiceCount > 1 ? "s" : ""}`}
            />
            <KpiCard
              label="Délai moyen de paiement"
              value={kpis.paymentDelay.value === null ? "—" : formatDays(kpis.paymentDelay.value)}
              kpi={kpis.paymentDelay}
              unit="days"
              polarity="down-good"
            />
            <KpiCard
              label="Cotisations URSSAF estimées"
              value={formatMoney(kpis.contributions.value ?? 0)}
              kpi={kpis.contributions}
              polarity="neutral"
              href="/comptabilite/urssaf"
            />
            <KpiCard
              label="Bénéfice estimé"
              value={formatMoney(kpis.profit.value ?? 0)}
              kpi={kpis.profit}
              hint="encaissé − cotisations − dépenses"
            />
          </section>

          {/* ── Chiffre d'affaires et alertes ── */}
          <div className="grid gap-6 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="Chiffre d'affaires encaissé et facturé"
              description={`Évolution ${GRANULARITY_LABELS[data.granularity]} sur la période.`}
              empty={!hasRevenue}
              table={{
                columns: ["Période", "Encaissé", "Facturé"],
                rows: data.series.map((point) => [
                  point.label,
                  formatMoney(point.collected),
                  formatMoney(point.invoiced),
                ]),
              }}
            >
              <DualSeriesChart
                primaryLabel="CA encaissé"
                secondaryLabel="CA facturé"
                data={data.series.map((point) => ({
                  label: point.label,
                  primary: point.collected,
                  secondary: point.invoiced,
                }))}
              />
            </ChartCard>

            <Card>
              <CardHeader>
                <CardTitle>Alertes</CardTitle>
                <CardDescription>Ce qui demande votre attention aujourd&apos;hui.</CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                    <CircleCheckIcon className="size-6 text-success" />
                    Rien à signaler : aucun retard, aucune échéance proche.
                  </div>
                ) : (
                  <AlertList alerts={alerts} className="-my-3" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Comparaison annuelle, plafond ── */}
          <div className="grid gap-6 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="Comparaison avec l'année précédente"
              description={`CA encaissé, face à la même période un an plus tôt (${formatDate(data.lastYear.from)} – ${formatDate(data.lastYear.to)}) : ${formatMoney(kpis.collected.value ?? 0)} contre ${formatMoney(data.lastYearCollected)}.`}
              empty={!hasComparison}
              table={{
                columns: ["Période", "Cette période", "Un an plus tôt"],
                rows: data.yearOverYear.map((point) => [
                  point.label,
                  formatMoney(point.current),
                  formatMoney(point.previous),
                ]),
              }}
            >
              <DualSeriesChart
                primaryAsArea={false}
                primaryLabel="Cette période"
                secondaryLabel="Un an plus tôt"
                data={data.yearOverYear.map((point) => ({
                  label: point.label,
                  primary: point.current,
                  secondary: point.previous,
                }))}
              />
            </ChartCard>

            <Card>
              <CardHeader>
                <CardTitle>Plafond de CA {ceiling.year}</CardTitle>
                <CardDescription>
                  {ceiling.prorated ? "Plafond proratisé sur l'année de création." : "Chiffre d'affaires encaissé sur l'année civile."}
                </CardDescription>
                <CardAction>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/comptabilite/plafonds">Détail</Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight">
                      {formatPercent(ceiling.percent, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(ceiling.revenueCents)} sur {formatMoney(ceiling.ceilingCents)}
                    </p>
                  </div>
                  <StatusBadge tone={ceilingLevel.tone}>{ceilingLevel.label}</StatusBadge>
                </div>
                <Meter
                  percent={ceiling.percent}
                  level={ceiling.level}
                  label={`Chiffre d'affaires encaissé : ${formatPercent(ceiling.percent, 0)} du plafond`}
                  projectionPercent={
                    ceiling.projectedCents !== null && ceiling.ceilingCents > 0
                      ? (ceiling.projectedCents / ceiling.ceilingCents) * 100
                      : null
                  }
                  markers={[
                    { percent: ctx.settings.ceilingWarningPct, label: "Seuil d'alerte" },
                    { percent: ctx.settings.ceilingCriticalPct, label: "Seuil critique" },
                  ]}
                />
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Marge restante</dt>
                    <dd className="font-medium tabular-nums">{formatMoney(ceiling.remainingCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Projection fin d&apos;année</dt>
                    <dd className="font-medium tabular-nums">
                      {ceiling.projectedCents === null ? "—" : formatMoney(ceiling.projectedCents)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* ── Répartitions ── */}
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <ChartCard
              title="CA par client"
              description="Dix premiers clients, en chiffre d'affaires encaissé."
              empty={data.clients.every((client) => client.collectedCents <= 0)}
            >
              <BarList
                items={data.clients
                  .filter((client) => client.collectedCents > 0)
                  .map((client) => ({
                    id: client.id,
                    name: client.name,
                    value: client.collectedCents,
                    href: `/clients/${client.id}`,
                  }))}
              />
            </ChartCard>

            <ChartCard
              title="CA par catégorie de prestation"
              description="Chiffre d'affaires facturé, remises et acomptes répartis."
              empty={data.categorySlices.length === 0}
            >
              <DonutChart data={data.categorySlices} totalLabel="Facturé" />
            </ChartCard>

            <ChartCard
              title="Factures par statut"
              description="Factures datées de la période, en nombre et en montant."
              empty={data.statuses.every((status) => status.count === 0)}
            >
              <StatusBreakdown
                segments={data.statuses
                  .filter((status) => status.count > 0)
                  .map((status) => ({
                    key: status.status,
                    label: INVOICE_STATUS_LABELS[status.status],
                    tone: INVOICE_STATUS_TONES[status.status],
                    count: status.count,
                    amount: status.amount,
                    href: `/factures?statut=${status.status}`,
                  }))}
              />
            </ChartCard>

            <ChartCard
              title="Entonnoir de conversion"
              description="Des pré-devis envoyés sur la période jusqu'aux devis facturés."
              empty={funnel.preQuotesSent + funnel.quotesSent === 0}
            >
              <Funnel
                stages={[
                  { label: "Pré-devis envoyés", count: funnel.preQuotesSent },
                  {
                    label: "Devis envoyés",
                    count: funnel.quotesSent,
                    hint: `dont ${funnel.preQuotesConverted} issu${funnel.preQuotesConverted > 1 ? "s" : ""} d'un pré-devis`,
                    rate: kpis.preQuoteConversion.value,
                    rateLabel: "des pré-devis convertis en devis",
                  },
                  {
                    label: "Devis acceptés",
                    count: funnel.quotesAccepted,
                    rate: funnel.quotesSent > 0 ? (funnel.quotesAccepted / funnel.quotesSent) * 100 : null,
                    rateLabel: "des devis envoyés",
                  },
                  {
                    label: "Devis facturés",
                    count: funnel.quotesInvoiced,
                    rate:
                      funnel.quotesAccepted > 0
                        ? (funnel.quotesInvoiced / funnel.quotesAccepted) * 100
                        : null,
                    rateLabel: "des devis acceptés",
                  },
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Dépenses par catégorie"
              description={`${formatMoney(data.expensesTotal)} de dépenses sur la période.`}
              empty={data.expenses.length === 0}
              emptyMessage="Aucune dépense sur cette période."
            >
              <BarList
                items={data.expenses.map((expense) => ({
                  id: expense.id,
                  name: expense.name,
                  value: expense.value,
                  hint: `${expense.count} dépense${expense.count > 1 ? "s" : ""}`,
                  href: `/comptabilite/depenses?categorie=${expense.id}`,
                }))}
              />
            </ChartCard>

            <ChartCard
              title="Cotisations URSSAF par période"
              description="Montants déclarés, ou estimés pour les périodes non déclarées."
              empty={data.urssaf.every((item) => item.value === 0)}
              emptyMessage="Aucune cotisation sur cette période."
              table={{
                columns: ["Période", "Cotisations", "Nature"],
                rows: data.urssaf.map((item) => [
                  item.label,
                  formatMoney(item.value),
                  item.estimated ? "Estimation" : "Déclaré",
                ]),
              }}
            >
              <ColumnChart
                seriesLabel="Cotisations"
                data={data.urssaf.map((item) => ({ label: item.label, value: item.value }))}
              />
            </ChartCard>
          </div>

          {/* ── Trésorerie ── */}
          <ChartCard
            title="Prévisionnel de trésorerie"
            description={`${formatMoney(data.forecastTotal)} restent à encaisser, répartis par semaine d'échéance (situation à ce jour, indépendante de la période).`}
            empty={data.forecastTotal === 0}
            emptyMessage="Aucune facture en attente de paiement."
            table={{
              columns: ["Échéance (semaine du)", "À encaisser"],
              rows: data.forecast.map((bucket) => [bucket.label, formatMoney(bucket.value)]),
            }}
          >
            <ColumnChart seriesLabel="À encaisser" data={data.forecast} />
          </ChartCard>

          {/* ── Clients et activité ── */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top clients</CardTitle>
                <CardDescription>Activité de la période et encours actuel.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.clients.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Aucune activité client sur cette période.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Factures</TableHead>
                          <TableHead className="text-right">Facturé</TableHead>
                          <TableHead className="text-right">Encaissé</TableHead>
                          <TableHead className="text-right">En attente</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.clients.slice(0, 5).map((client) => (
                          <TableRow key={client.id}>
                            <TableCell>
                              <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                                {client.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{client.invoiceCount}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(client.invoicedCents)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(client.collectedCents)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {client.outstandingCents > 0 ? formatMoney(client.outstandingCents) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
                <CardDescription>Derniers documents créés et paiements reçus.</CardDescription>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    L&apos;activité apparaîtra ici dès votre premier document.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {activity.map((entry) => (
                      <li key={entry.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                        <span className="min-w-0 flex-1">{entry.summary}</span>
                        {entry.amountCents !== null ? (
                          <span className="shrink-0 font-medium tabular-nums">
                            {formatMoney(entry.amountCents)}
                          </span>
                        ) : null}
                        <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                          {formatRelative(entry.createdAt, now)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </PeriodFrameBody>
      </PageContainer>
    </PeriodFrame>
  );
}
