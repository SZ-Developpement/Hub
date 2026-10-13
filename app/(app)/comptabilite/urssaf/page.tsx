import { DownloadIcon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { UrssafActions } from "@/components/accounting/urssaf-actions";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, UrssafStatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { diffDays, toISO, today } from "@/lib/dates";
import { formatDate, formatMoney, formatRate } from "@/lib/format";
import { URSSAF_PERIODICITY_LABELS } from "@/lib/labels";
import { declarationAmounts, getCurrentRate, listUrssafDeclarations } from "@/lib/server/accounting";
import { getAppContext } from "@/lib/session";
import { periodLabel } from "@/lib/urssaf-periods";

export const metadata: Metadata = { title: "Déclarations URSSAF" };

export default async function UrssafPage() {
  const ctx = await getAppContext();
  const todayDate = today();
  const [declarations, rate] = await Promise.all([
    listUrssafDeclarations(ctx.organizationId),
    getCurrentRate(ctx.organizationId, todayDate),
  ]);

  // Périodes closes restant à déclarer, la plus ancienne d'abord.
  const pending = declarations
    .filter((row) => row.status === "TO_DECLARE" && row.periodEnd < todayDate)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const next = pending[0];
  const unpaidCents = declarations
    .filter((row) => row.status !== "PAID" && row.periodEnd < todayDate)
    .reduce((sum, row) => sum + declarationAmounts(row).contributionsCents, 0);
  const yearPaidCents = declarations
    .filter((row) => row.status === "PAID" && row.paidOn?.getUTCFullYear() === todayDate.getUTCFullYear())
    .reduce((sum, row) => sum + (row.contributionsCents ?? 0), 0);
  const totalRateBp = rate ? rate.socialRateBp + rate.cfpRateBp + rate.incomeTaxRateBp : null;
  const daysToNext = next ? diffDays(todayDate, next.dueDate) : null;

  return (
    <PageContainer>
      <PageHeader
        title="Déclarations URSSAF"
        description={`Périodicité ${URSSAF_PERIODICITY_LABELS[ctx.settings.urssafPeriodicity].toLowerCase()}. Le chiffre d'affaires à déclarer est celui encaissé sur la période.`}
      >
        <Button asChild variant="outline">
          <a href="/api/export/urssaf">
            <DownloadIcon data-icon="inline-start" />
            CSV
          </a>
        </Button>
      </PageHeader>

      {totalRateBp === null ? (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>Aucun taux de cotisations configuré</AlertTitle>
          <AlertDescription>
            Les cotisations estimées restent à 0 € tant qu&apos;aucun taux n&apos;est saisi.{" "}
            <Link href="/parametres/comptabilite" className="font-medium underline underline-offset-4">
              Configurer les taux
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Prochaine échéance"
          value={next ? formatDate(next.dueDate) : "—"}
          tone={daysToNext !== null && daysToNext < 0 ? "danger" : daysToNext !== null && daysToNext <= ctx.settings.urssafReminderDays ? "warning" : "default"}
          hint={
            next && daysToNext !== null
              ? daysToNext < 0
                ? `${periodLabel(next.periodStart, next.periodEnd)} · en retard de ${-daysToNext} j`
                : `${periodLabel(next.periodStart, next.periodEnd)} · dans ${daysToNext} j`
              : "Aucune déclaration en attente"
          }
        />
        <StatCard
          label="Cotisations à régler"
          value={formatMoney(unpaidCents)}
          hint="Périodes closes non payées"
        />
        <StatCard
          label={`Cotisations payées en ${todayDate.getUTCFullYear()}`}
          value={formatMoney(yearPaidCents)}
        />
        <StatCard
          label="Taux en vigueur"
          value={totalRateBp === null ? "—" : formatRate(totalRateBp)}
          hint={
            rate
              ? `Depuis le ${formatDate(rate.effectiveFrom)}${rate.note ? ` · ${rate.note}` : ""}`
              : undefined
          }
        />
      </div>

      {declarations.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Les périodes de déclaration apparaîtront ici dès le premier encaissement, ou dès que la date
          de début d&apos;activité est renseignée dans les paramètres.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">CA encaissé</TableHead>
                <TableHead className="text-right">Cotisations</TableHead>
                <TableHead className="hidden md:table-cell">Échéance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {declarations.map((row) => {
                const amounts = declarationAmounts(row);
                const label = periodLabel(row.periodStart, row.periodEnd);
                const open = row.periodEnd >= todayDate;
                const late = row.status === "TO_DECLARE" && row.dueDate < todayDate;
                const frozen = row.status !== "TO_DECLARE";
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium capitalize">{label}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(amounts.revenueCents)}
                      {frozen && amounts.revenueCents !== row.revenueCents ? (
                        <div className="text-xs text-muted-foreground">
                          encaissé : {formatMoney(row.revenueCents)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(amounts.contributionsCents)}
                      {!frozen ? <div className="text-xs text-muted-foreground">estimation</div> : null}
                    </TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell">
                      {formatDate(row.dueDate)}
                    </TableCell>
                    <TableCell>
                      {open && row.status === "TO_DECLARE" ? (
                        <StatusBadge tone="neutral">En cours</StatusBadge>
                      ) : late ? (
                        <StatusBadge tone="danger">En retard</StatusBadge>
                      ) : (
                        <UrssafStatusBadge status={row.status} />
                      )}
                    </TableCell>
                    <TableCell>
                      {!open || row.status !== "TO_DECLARE" ? (
                        <UrssafActions
                          today={toISO(todayDate)}
                          declaration={{
                            id: row.id,
                            label,
                            status: row.status,
                            revenueCents: row.revenueCents,
                            estimatedCents: row.estimatedCents,
                          }}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </PageContainer>
  );
}
