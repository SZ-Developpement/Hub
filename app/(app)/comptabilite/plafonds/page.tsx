import type { Metadata } from "next";
import Link from "next/link";

import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/series-charts";
import { Meter } from "@/components/charts/simple-charts";
import { FilterSelect } from "@/components/shared/list-controls";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { today, utcDate } from "@/lib/dates";
import { formatMoney, formatMonthYear, formatPercent } from "@/lib/format";
import type { Tone } from "@/lib/labels";
import { param } from "@/lib/list-params";
import {
  getCeilingStatus,
  getMonthlyRevenue,
  listActiveYears,
  type CeilingLevel,
} from "@/lib/server/accounting";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Plafonds" };

const LEVELS: Record<CeilingLevel, { label: string; tone: Tone }> = {
  ok: { label: "Sous les seuils", tone: "success" },
  warning: { label: "Seuil d'alerte atteint", tone: "warning" },
  critical: { label: "Seuil critique atteint", tone: "danger" },
  exceeded: { label: "Plafond dépassé", tone: "danger" },
};

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export default async function CeilingsPage({ searchParams }: PageProps<"/comptabilite/plafonds">) {
  const ctx = await getAppContext();
  const { settings, organizationId } = ctx;
  const todayDate = today();
  const currentYear = todayDate.getUTCFullYear();

  const years = await listActiveYears(organizationId, todayDate);
  const requested = Number.parseInt(param(await searchParams, "annee") ?? "", 10);
  const year = years.includes(requested) ? requested : currentYear;

  const [status, monthly] = await Promise.all([
    getCeilingStatus(organizationId, settings, todayDate, year),
    getMonthlyRevenue(organizationId, year),
  ]);
  const level = LEVELS[status.level];
  const projectionPercent =
    status.projectedCents !== null && status.ceilingCents > 0
      ? (status.projectedCents / status.ceilingCents) * 100
      : null;
  const vat = status.vat;
  const vatScale = vat ? Math.max(vat.upperThresholdCents, vat.thresholdCents) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Plafonds"
        description="Suivi du chiffre d'affaires encaissé par rapport aux seuils du régime micro-entrepreneur."
      >
        <FilterSelect
          name="annee"
          label="Année"
          allLabel={`Année ${currentYear}`}
          options={years
            .filter((value) => value !== currentYear)
            .map((value) => ({ value: String(value), label: `Année ${value}` }))}
        />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plafond de chiffre d&apos;affaires {year}</CardTitle>
            <CardDescription>
              {status.prorated
                ? `Plafond proratisé sur l'année de création (plafond annuel : ${formatMoney(status.fullCeilingCents)}).`
                : "Au-delà de ce plafond deux années de suite, le régime micro ne s'applique plus."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold tracking-tight">{formatMoney(status.revenueCents)}</p>
                <p className="text-sm text-muted-foreground">
                  sur {formatMoney(status.ceilingCents)} · {formatPercent(status.percent, 1)}
                </p>
              </div>
              <StatusBadge tone={level.tone}>{level.label}</StatusBadge>
            </div>
            <Meter
              percent={status.percent}
              level={status.level}
              label={`Chiffre d'affaires encaissé : ${formatPercent(status.percent, 0)} du plafond`}
              projectionPercent={projectionPercent}
              markers={[
                { percent: settings.ceilingWarningPct, label: "Seuil d'alerte" },
                { percent: settings.ceilingCriticalPct, label: "Seuil critique" },
              ]}
            >
              <p className="text-xs text-muted-foreground">
                Repères : seuil d&apos;alerte à {settings.ceilingWarningPct} %, seuil critique à{" "}
                {settings.ceilingCriticalPct} %
                {projectionPercent !== null ? " ; pointillé : projection de fin d'année" : ""}.
              </p>
            </Meter>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Marge restante</dt>
                <dd className="font-medium tabular-nums">{formatMoney(status.remainingCents)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Projection au 31 décembre</dt>
                <dd className="font-medium tabular-nums">
                  {status.projectedCents === null
                    ? "—"
                    : `${formatMoney(status.projectedCents)} (${formatPercent(projectionPercent ?? 0, 0)})`}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Franchise en base de TVA {year}</CardTitle>
            <CardDescription>
              Tant que le chiffre d&apos;affaires reste sous le seuil, aucune TVA n&apos;est facturée.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {vat ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight">
                      {formatMoney(status.revenueCents)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      seuil de base {formatMoney(vat.thresholdCents)}
                      {vat.upperThresholdCents > 0
                        ? ` · seuil majoré ${formatMoney(vat.upperThresholdCents)}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge
                    tone={vat.level === "ok" ? "success" : vat.level === "warning" ? "warning" : "danger"}
                  >
                    {vat.level === "ok"
                      ? "Sous le seuil"
                      : vat.level === "warning"
                        ? "Seuil de base proche"
                        : vat.level === "exceeded"
                          ? "Seuil de base dépassé"
                          : "Seuil majoré dépassé"}
                  </StatusBadge>
                </div>
                <Meter
                  percent={vatScale > 0 ? (status.revenueCents / vatScale) * 100 : 0}
                  level={vat.level === "ok" ? "ok" : vat.level === "warning" ? "warning" : "critical"}
                  label="Chiffre d'affaires encaissé par rapport aux seuils de franchise de TVA"
                  markers={
                    vat.upperThresholdCents > vat.thresholdCents
                      ? [
                          {
                            percent: (vat.thresholdCents / vatScale) * 100,
                            label: "Seuil de base",
                          },
                        ]
                      : []
                  }
                >
                  <p className="text-xs text-muted-foreground">
                    Seuil de base dépassé : la TVA s&apos;applique l&apos;année suivante. Seuil majoré
                    dépassé : elle s&apos;applique dès le mois du dépassement. Vérifiez les règles en
                    vigueur avant toute décision.
                  </p>
                </Meter>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Le suivi des seuils de TVA est désactivé.{" "}
                <Link href="/parametres/comptabilite" className="font-medium text-foreground underline underline-offset-4">
                  Renseigner les seuils
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <ChartCard
        title={`Chiffre d'affaires encaissé par mois — ${year}`}
        empty={status.revenueCents === 0}
        emptyMessage="Aucun encaissement sur cette année."
        table={{
          columns: ["Mois", "Encaissé", "Cumul"],
          rows: monthly.map((amount, month) => [
            formatMonthYear(utcDate(year, month, 1)),
            formatMoney(amount),
            formatMoney(monthly.slice(0, month + 1).reduce((sum, value) => sum + value, 0)),
          ]),
        }}
      >
        <ColumnChart
          seriesLabel="CA encaissé"
          data={monthly.map((value, month) => ({ label: MONTHS[month], value }))}
        />
      </ChartCard>

      <p className="text-sm text-muted-foreground">
        Les plafonds et seuils se règlent dans{" "}
        <Link href="/parametres/comptabilite" className="font-medium text-foreground underline underline-offset-4">
          Paramètres › Comptabilité
        </Link>
        . Ils sont révisés périodiquement par l&apos;administration : l&apos;application n&apos;en fixe aucun.
      </p>
    </PageContainer>
  );
}
