"use server";

import { action } from "@/lib/action";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/lib/server/activity";
import { countClientDocuments } from "@/lib/server/clients";
import { clientSchema, updateClientSchema, type ClientValues } from "@/lib/validation/clients";
import { idSchema } from "@/lib/validation/zod";

function normalize(values: ClientValues) {
  return {
    ...values,
    siret: values.siret.replace(/\s/g, ""),
    // Un particulier n'a ni SIRET ni numéro de TVA.
    ...(values.type === "INDIVIDUAL" ? { siret: "", vatNumber: "" } : {}),
  };
}

export const createClient = action(clientSchema, async (values, ctx) => {
  const client = await db.client.create({
    data: { ...normalize(values), organizationId: ctx.organizationId },
  });
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "client.created",
    entity: "CLIENT",
    entityId: client.id,
    summary: `Client ${client.name} créé`,
  });
  return { id: client.id, name: client.name };
});

export const updateClient = action(updateClientSchema, async ({ id, ...values }, ctx) => {
  const updated = await db.client.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: normalize(values),
  });
  if (updated.count === 0) throw new AppError("Ce client n'existe plus.");
});

export const archiveClient = action(idSchema, async ({ id }, ctx) => {
  await db.client.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { archivedAt: new Date() },
  });
});

export const restoreClient = action(idSchema, async ({ id }, ctx) => {
  await db.client.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { archivedAt: null },
  });
});

/** Suppression définitive, possible uniquement pour un client sans aucun document. */
export const deleteClient = action(idSchema, async ({ id }, ctx) => {
  const client = await db.client.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!client) return;
  if ((await countClientDocuments(id)) > 0) {
    throw new AppError(
      "Ce client a des documents (pré-devis, devis ou factures) : il ne peut pas être supprimé. Archivez-le.",
    );
  }
  await db.client.delete({ where: { id } });
});
