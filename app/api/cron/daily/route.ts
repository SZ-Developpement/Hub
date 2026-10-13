import { timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { runDailySync } from "@/lib/server/sync";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/**
 * Tâche quotidienne (Vercel Cron) : devis expirés, factures en retard, périodes URSSAF.
 * L'application fait déjà cette synchronisation au premier chargement de la journée ;
 * le cron garantit simplement que les statuts sont à jour même sans visite.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Non autorisé", { status: 401 });

  const organizations = await db.organization.findMany({
    select: {
      id: true,
      settings: { select: { urssafPeriodicity: true, activityStartDate: true } },
    },
  });
  for (const organization of organizations) {
    if (organization.settings) await runDailySync(organization.id, organization.settings);
  }
  return Response.json({ synchronized: organizations.length });
}
