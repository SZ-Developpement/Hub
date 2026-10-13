import "server-only";

import type { DocumentKind } from "@/generated/prisma/enums";
import { db, type Tx } from "@/lib/db";
import {
  counterYear,
  DEFAULT_NUMBERING,
  formatDocumentNumber,
  type NumberingConfig,
} from "@/lib/numbering";

export async function getNumberingConfig(
  client: Tx | typeof db,
  organizationId: string,
  kind: DocumentKind,
): Promise<NumberingConfig> {
  const format = await client.numberingFormat.findUnique({
    where: { organizationId_kind: { organizationId, kind } },
  });
  return format ?? DEFAULT_NUMBERING[kind];
}

export type AllocatedNumber = { number: string; year: number; value: number };

/**
 * Attribue le prochain numéro de la série.
 *
 * À appeler **dans** la transaction qui crée ou émet le document : l'incrément verrouille
 * la ligne du compteur jusqu'au commit. Deux émissions simultanées sont donc sérialisées
 * (pas de doublon) et un rollback rend le numéro (pas de trou).
 */
export async function allocateNumber(
  tx: Tx,
  organizationId: string,
  kind: DocumentKind,
  date: Date,
): Promise<AllocatedNumber> {
  const config = await getNumberingConfig(tx, organizationId, kind);
  const year = counterYear(config, date);

  const rows = await tx.$queryRaw<{ lastValue: number }[]>`
    INSERT INTO number_counter (id, "organizationId", kind, year, "lastValue", "updatedAt")
    VALUES (gen_random_uuid()::text, ${organizationId}, ${kind}::"DocumentKind", ${year}, 1, now())
    ON CONFLICT ("organizationId", kind, year)
    DO UPDATE SET "lastValue" = number_counter."lastValue" + 1, "updatedAt" = now()
    RETURNING "lastValue"
  `;
  const value = rows[0].lastValue;

  return { number: formatDocumentNumber(config, date.getUTCFullYear(), value), year, value };
}

/** Prochain numéro qui serait attribué à la date donnée (aperçu, sans rien réserver). */
export async function peekNextNumber(
  organizationId: string,
  kind: DocumentKind,
  date: Date,
): Promise<{ next: number; preview: string }> {
  const config = await getNumberingConfig(db, organizationId, kind);
  const year = counterYear(config, date);
  const counter = await db.numberCounter.findUnique({
    where: { organizationId_kind_year: { organizationId, kind, year } },
  });
  const next = (counter?.lastValue ?? 0) + 1;
  return { next, preview: formatDocumentNumber(config, date.getUTCFullYear(), next) };
}
