import "server-only";

import type { ActivityEntity } from "@/generated/prisma/enums";
import { db, type Tx } from "@/lib/db";

export type ActivityInput = {
  organizationId: string;
  userId?: string | null;
  /** Identifiant technique : « invoice.issued », « payment.recorded »… */
  action: string;
  entity: ActivityEntity;
  entityId?: string | null;
  /** Phrase lisible affichée dans le fil d'activité. */
  summary: string;
  amountCents?: number | null;
};

/** Consigne un évènement dans le journal d'activité (dans la transaction si fournie). */
export async function logActivity(input: ActivityInput, client: Tx | typeof db = db): Promise<void> {
  await client.activityLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      summary: input.summary,
      amountCents: input.amountCents ?? null,
    },
  });
}
