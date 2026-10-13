import "server-only";

import type { UrssafPeriodicity } from "@/generated/prisma/enums";
import { addDays, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { declarationDueDate, periodsToCover } from "@/lib/urssaf-periods";

type SyncSettings = {
  urssafPeriodicity: UrssafPeriodicity;
  activityStartDate: Date | null;
};

/** Crée les périodes de déclaration URSSAF manquantes, jusqu'à la période en cours. */
export async function ensureUrssafPeriods(
  organizationId: string,
  settings: SyncSettings,
  todayDate: Date,
): Promise<void> {
  const last = await db.urssafDeclaration.findFirst({
    where: { organizationId },
    orderBy: { periodStart: "desc" },
    select: { periodEnd: true },
  });

  let from: Date;
  if (last) {
    from = addDays(last.periodEnd, 1);
  } else {
    const firstPayment = await db.payment.findFirst({
      where: { organizationId },
      orderBy: { paidOn: "asc" },
      select: { paidOn: true },
    });
    from = settings.activityStartDate ?? firstPayment?.paidOn ?? todayDate;
  }

  const periods = periodsToCover(from, todayDate, settings.urssafPeriodicity);
  if (periods.length === 0) return;

  await db.urssafDeclaration.createMany({
    data: periods.map((period) => ({
      organizationId,
      periodStart: period.start,
      periodEnd: period.end,
      dueDate: declarationDueDate(period.end),
    })),
    skipDuplicates: true,
  });
}

/**
 * Tâches quotidiennes : devis expirés, factures passées en retard, périodes URSSAF.
 * Idempotent — peut tourner plusieurs fois par jour sans effet de bord.
 */
export async function runDailySync(
  organizationId: string,
  settings: SyncSettings,
  todayDate: Date = today(),
): Promise<void> {
  await db.$transaction([
    db.quote.updateMany({
      where: { organizationId, status: "SENT", validUntil: { lt: todayDate } },
      data: { status: "EXPIRED" },
    }),
    db.invoice.updateMany({
      where: {
        organizationId,
        type: { not: "CREDIT_NOTE" },
        status: { in: ["ISSUED", "PARTIALLY_PAID"] },
        dueDate: { lt: todayDate },
      },
      data: { status: "OVERDUE" },
    }),
    db.organization.update({
      where: { id: organizationId },
      data: { lastDailySyncOn: todayDate },
    }),
  ]);
  await ensureUrssafPeriods(organizationId, settings, todayDate);
}

/**
 * Lance la synchronisation si elle n'a pas encore tourné aujourd'hui (heure de Paris).
 * Appelée à chaque chargement de contexte : l'application reste à jour même sans cron.
 */
export async function ensureDailySync(
  organization: { id: string; lastDailySyncOn: Date | null },
  settings: SyncSettings,
): Promise<void> {
  const todayDate = today();
  if (organization.lastDailySyncOn?.getTime() === todayDate.getTime()) return;
  try {
    await runDailySync(organization.id, settings, todayDate);
  } catch (error) {
    // Ne jamais bloquer l'affichage d'une page pour une tâche de fond.
    console.error("Synchronisation quotidienne en échec", error);
  }
}
