import "server-only";

import { cache } from "react";

import { addDays, diffDays, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { getCeilingStatus } from "@/lib/server/accounting";
import type { AppContext } from "@/lib/session";
import { periodLabel } from "@/lib/urssaf-periods";

export type Alert = {
  id: string;
  severity: "danger" | "warning" | "info";
  title: string;
  description: string;
  href: string;
};

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/**
 * Points d'attention du moment : retards de paiement, devis sur le point d'expirer,
 * échéances URSSAF, plafonds, réglages manquants. Les plus urgents d'abord.
 */
export const getAlerts = cache(async (ctx: AppContext): Promise<Alert[]> => {
  const { organizationId, settings } = ctx;
  const todayDate = today();
  const alerts: Alert[] = [];

  const [overdue, expiringQuotes, declarations, ceiling, rateCount] = await Promise.all([
    db.invoice.aggregate({
      where: { organizationId, status: "OVERDUE" },
      _count: true,
      _sum: { netCents: true, paidCents: true, creditedCents: true },
      _min: { dueDate: true },
    }),
    db.quote.findMany({
      where: {
        organizationId,
        status: "SENT",
        validUntil: { gte: todayDate, lte: addDays(todayDate, settings.quoteExpiryAlertDays) },
      },
      orderBy: { validUntil: "asc" },
      select: { id: true, number: true, validUntil: true, totalCents: true },
    }),
    db.urssafDeclaration.findMany({
      where: { organizationId, status: { in: ["TO_DECLARE", "DECLARED"] }, periodEnd: { lt: todayDate } },
      orderBy: { dueDate: "asc" },
      select: { id: true, status: true, periodStart: true, periodEnd: true, dueDate: true },
    }),
    getCeilingStatus(organizationId, settings, todayDate),
    db.contributionRate.count({ where: { organizationId } }),
  ]);

  // ── Factures en retard
  if (overdue._count > 0) {
    const amount =
      (overdue._sum.netCents ?? 0) - (overdue._sum.paidCents ?? 0) - (overdue._sum.creditedCents ?? 0);
    const oldest = overdue._min.dueDate ? diffDays(overdue._min.dueDate, todayDate) : 0;
    alerts.push({
      id: "overdue-invoices",
      severity: "danger",
      title: `${plural(overdue._count, "facture")} en retard`,
      description: `${formatMoney(amount)} à recouvrer · retard le plus ancien : ${oldest} jour${oldest > 1 ? "s" : ""}.`,
      href: "/factures?statut=OVERDUE",
    });
  }

  // ── URSSAF : déclarations à faire, cotisations à payer
  for (const declaration of declarations) {
    const days = diffDays(todayDate, declaration.dueDate);
    const label = periodLabel(declaration.periodStart, declaration.periodEnd);
    if (declaration.status === "TO_DECLARE") {
      if (days < 0) {
        alerts.push({
          id: `urssaf-${declaration.id}`,
          severity: "danger",
          title: `Déclaration URSSAF ${label} en retard`,
          description: `L'échéance était le ${formatDate(declaration.dueDate)}.`,
          href: "/comptabilite/urssaf",
        });
      } else if (days <= settings.urssafReminderDays) {
        alerts.push({
          id: `urssaf-${declaration.id}`,
          severity: "warning",
          title: `Déclaration URSSAF ${label} à faire`,
          description:
            days === 0
              ? "À déclarer aujourd'hui."
              : `À déclarer avant le ${formatDate(declaration.dueDate)} (dans ${days} jour${days > 1 ? "s" : ""}).`,
          href: "/comptabilite/urssaf",
        });
      }
    } else if (days < 0) {
      alerts.push({
        id: `urssaf-pay-${declaration.id}`,
        severity: "warning",
        title: `Cotisations ${label} non marquées comme payées`,
        description: `Déclarées, échéance du ${formatDate(declaration.dueDate)} dépassée.`,
        href: "/comptabilite/urssaf",
      });
    }
  }

  // ── Devis qui expirent bientôt
  if (expiringQuotes.length === 1) {
    const [quote] = expiringQuotes;
    const days = diffDays(todayDate, quote.validUntil);
    alerts.push({
      id: "expiring-quotes",
      severity: "warning",
      title: `Le devis ${quote.number} expire ${days === 0 ? "aujourd'hui" : `dans ${days} jour${days > 1 ? "s" : ""}`}`,
      description: `${formatMoney(quote.totalCents)} en attente de réponse.`,
      href: `/devis/${quote.id}`,
    });
  } else if (expiringQuotes.length > 1) {
    const total = expiringQuotes.reduce((sum, quote) => sum + quote.totalCents, 0);
    alerts.push({
      id: "expiring-quotes",
      severity: "warning",
      title: `${expiringQuotes.length} devis expirent bientôt`,
      description: `${formatMoney(total)} en attente de réponse, premier le ${formatDate(expiringQuotes[0].validUntil)}.`,
      href: "/devis?statut=SENT&sort=validity&dir=asc",
    });
  }

  // ── Plafond de chiffre d'affaires
  if (ceiling.level !== "ok") {
    alerts.push({
      id: "revenue-ceiling",
      severity: ceiling.level === "warning" ? "warning" : "danger",
      title:
        ceiling.level === "exceeded"
          ? "Plafond de chiffre d'affaires dépassé"
          : `Plafond de chiffre d'affaires atteint à ${formatPercent(ceiling.percent, 0)}`,
      description: `${formatMoney(ceiling.revenueCents)} encaissés sur ${formatMoney(ceiling.ceilingCents)} en ${ceiling.year}.`,
      href: "/comptabilite/plafonds",
    });
  } else if (
    ceiling.projectedCents !== null &&
    ceiling.projectedCents > ceiling.ceilingCents
  ) {
    alerts.push({
      id: "revenue-ceiling-projection",
      severity: "info",
      title: "Au rythme actuel, le plafond serait dépassé en fin d'année",
      description: `Projection : ${formatMoney(ceiling.projectedCents)} pour un plafond de ${formatMoney(ceiling.ceilingCents)}.`,
      href: "/comptabilite/plafonds",
    });
  }

  // ── Franchise de TVA
  if (ceiling.vat && ceiling.vat.level !== "ok") {
    const exceeded = ceiling.vat.level !== "warning";
    alerts.push({
      id: "vat-threshold",
      severity: exceeded ? "danger" : "warning",
      title: exceeded
        ? ceiling.vat.level === "upper-exceeded"
          ? "Seuil majoré de franchise de TVA dépassé"
          : "Seuil de franchise de TVA dépassé"
        : "Seuil de franchise de TVA proche",
      description: `${formatMoney(ceiling.revenueCents)} encaissés pour un seuil de ${formatMoney(ceiling.vat.thresholdCents)}.`,
      href: "/comptabilite/plafonds",
    });
  }

  // ── Réglages à compléter
  if (rateCount === 0) {
    alerts.push({
      id: "missing-rate",
      severity: "info",
      title: "Taux de cotisations non configuré",
      description: "Les cotisations et le bénéfice estimés ne peuvent pas être calculés.",
      href: "/parametres/comptabilite",
    });
  }
  if (!settings.addressLine1.trim() || !settings.city.trim() || !settings.ownerLastName.trim()) {
    alerts.push({
      id: "incomplete-company",
      severity: "info",
      title: "Informations de l'entreprise incomplètes",
      description: "Adresse et identité sont obligatoires pour émettre une facture.",
      href: "/parametres/entreprise",
    });
  }

  const order = { danger: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
});
