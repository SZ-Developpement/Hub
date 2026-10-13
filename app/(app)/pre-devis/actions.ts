"use server";

import type { PreQuoteStatus } from "@/generated/prisma/enums";
import { action } from "@/lib/action";
import { addDays, toDate, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { PRE_QUOTE_STATUS_LABELS } from "@/lib/labels";
import { computeTotals, lineTotalCents } from "@/lib/money";
import { logActivity } from "@/lib/server/activity";
import { requireClient } from "@/lib/server/documents";
import { allocateNumber } from "@/lib/server/numbering";
import {
  preQuoteSchema,
  updatePreQuoteSchema,
  type PreQuoteValues,
} from "@/lib/validation/documents";
import { idSchema, z } from "@/lib/validation/zod";

function preQuoteData(values: PreQuoteValues) {
  return {
    clientId: values.clientId,
    title: values.title,
    issueDate: toDate(values.issueDate),
    need: values.need,
    dailyRateCents: values.dailyRateCents,
    totalDaysMilli: values.items.reduce((sum, item) => sum + item.daysMilli, 0),
    priceMinCents: values.priceMinCents,
    priceMaxCents: values.priceMaxCents,
    notes: values.notes,
  };
}

export const createPreQuote = action(preQuoteSchema, async (values, ctx) => {
  const client = await requireClient(ctx.organizationId, values.clientId);
  const data = preQuoteData(values);

  const preQuote = await db.$transaction(async (tx) => {
    const { number } = await allocateNumber(tx, ctx.organizationId, "PRE_QUOTE", data.issueDate);
    const created = await tx.preQuote.create({
      data: {
        ...data,
        organizationId: ctx.organizationId,
        number,
        items: { create: values.items.map((item, position) => ({ ...item, position })) },
      },
    });
    await logActivity(
      {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "pre_quote.created",
        entity: "PRE_QUOTE",
        entityId: created.id,
        summary: `Pré-devis ${number} créé — ${client.name}`,
        amountCents: created.priceMaxCents,
      },
      tx,
    );
    return created;
  });

  return { id: preQuote.id };
});

export const updatePreQuote = action(updatePreQuoteSchema, async ({ id, ...values }, ctx) => {
  const existing = await db.preQuote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { status: true },
  });
  if (!existing) throw new AppError("Ce pré-devis n'existe plus.");
  if (existing.status !== "DRAFT") {
    throw new AppError("Seul un pré-devis en brouillon peut être modifié. Remettez-le en brouillon.");
  }
  await requireClient(ctx.organizationId, values.clientId);

  await db.$transaction([
    db.preQuoteItem.deleteMany({ where: { preQuoteId: id } }),
    db.preQuote.update({
      where: { id },
      data: {
        ...preQuoteData(values),
        items: { create: values.items.map((item, position) => ({ ...item, position })) },
      },
    }),
  ]);
});

const TRANSITIONS: Record<PreQuoteStatus, PreQuoteStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "DECLINED", "DRAFT"],
  ACCEPTED: ["SENT"],
  DECLINED: ["DRAFT", "SENT"],
};

export const setPreQuoteStatus = action(
  z.object({ id: idSchema.shape.id, status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED"]) }),
  async ({ id, status }, ctx) => {
    const preQuote = await db.preQuote.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { client: { select: { name: true } } },
    });
    if (!preQuote) throw new AppError("Ce pré-devis n'existe plus.");
    if (!TRANSITIONS[preQuote.status].includes(status)) {
      throw new AppError(
        `Un pré-devis « ${PRE_QUOTE_STATUS_LABELS[preQuote.status].toLowerCase()} » ne peut pas passer à « ${PRE_QUOTE_STATUS_LABELS[status].toLowerCase()} ».`,
      );
    }

    const todayDate = today();
    await db.$transaction(async (tx) => {
      await tx.preQuote.update({
        where: { id },
        data: {
          status,
          sentOn: status === "SENT" ? (preQuote.sentOn ?? todayDate) : status === "DRAFT" ? null : undefined,
          respondedOn:
            status === "ACCEPTED" || status === "DECLINED" ? todayDate : null,
        },
      });
      if (status !== "DRAFT") {
        await logActivity(
          {
            organizationId: ctx.organizationId,
            userId: ctx.user.id,
            action: `pre_quote.${status.toLowerCase()}`,
            entity: "PRE_QUOTE",
            entityId: id,
            summary: `Pré-devis ${preQuote.number} ${PRE_QUOTE_STATUS_LABELS[status].toLowerCase()} — ${preQuote.client.name}`,
          },
          tx,
        );
      }
    });
  },
);

export const duplicatePreQuote = action(idSchema, async ({ id }, ctx) => {
  const source = await db.preQuote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!source) throw new AppError("Ce pré-devis n'existe plus.");

  const issueDate = today();
  const copy = await db.$transaction(async (tx) => {
    const { number } = await allocateNumber(tx, ctx.organizationId, "PRE_QUOTE", issueDate);
    return tx.preQuote.create({
      data: {
        organizationId: ctx.organizationId,
        clientId: source.clientId,
        number,
        title: source.title,
        issueDate,
        need: source.need,
        dailyRateCents: source.dailyRateCents,
        totalDaysMilli: source.totalDaysMilli,
        priceMinCents: source.priceMinCents,
        priceMaxCents: source.priceMaxCents,
        notes: source.notes,
        items: {
          create: source.items.map(({ position, label, description, daysMilli }) => ({
            position,
            label,
            description,
            daysMilli,
          })),
        },
      },
    });
  });
  return { id: copy.id };
});

export const deletePreQuote = action(idSchema, async ({ id }, ctx) => {
  const preQuote = await db.preQuote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { _count: { select: { quotes: true } } },
  });
  if (!preQuote) return;
  if (preQuote._count.quotes > 0) {
    throw new AppError("Ce pré-devis a été converti en devis : il ne peut pas être supprimé.");
  }
  await db.preQuote.delete({ where: { id } });
});

/**
 * Crée un devis en brouillon pré-rempli à partir du pré-devis : une ligne par
 * fonctionnalité, chiffrée en jours au TJM de référence.
 */
export const convertPreQuoteToQuote = action(idSchema, async ({ id }, ctx) => {
  const preQuote = await db.preQuote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { items: { orderBy: { position: "asc" } }, client: { select: { name: true } } },
  });
  if (!preQuote) throw new AppError("Ce pré-devis n'existe plus.");

  const dailyRate = preQuote.dailyRateCents ?? 0;
  const lines =
    preQuote.items.length > 0
      ? preQuote.items.map((item) => {
          const estimated = item.daysMilli > 0;
          return {
            label: item.label,
            description: item.description,
            quantityMilli: estimated ? item.daysMilli : 1000,
            unit: estimated ? ("DAY" as const) : ("FLAT" as const),
            unitPriceCents: estimated ? dailyRate : 0,
          };
        })
      : [
          {
            label: preQuote.title,
            description: "",
            quantityMilli: 1000,
            unit: "FLAT" as const,
            unitPriceCents: Math.round((preQuote.priceMinCents + preQuote.priceMaxCents) / 2),
          },
        ];
  const totals = computeTotals({ lines, discountType: "NONE", discountValue: 0 });

  const issueDate = today();
  const { settings } = ctx;
  const quote = await db.$transaction(async (tx) => {
    const { number } = await allocateNumber(tx, ctx.organizationId, "QUOTE", issueDate);
    const created = await tx.quote.create({
      data: {
        organizationId: ctx.organizationId,
        clientId: preQuote.clientId,
        preQuoteId: preQuote.id,
        number,
        title: preQuote.title,
        issueDate,
        validUntil: addDays(issueDate, settings.quoteValidityDays),
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        totalCents: totals.totalCents,
        depositRateBp: settings.quoteDefaultDepositRateBp,
        notes: settings.quoteDefaultNotes,
        terms: settings.quoteDefaultTerms,
        lines: {
          create: lines.map((line, position) => ({
            ...line,
            position,
            totalCents: lineTotalCents(line.quantityMilli, line.unitPriceCents),
          })),
        },
      },
    });
    // Convertir vaut acceptation de l'estimation.
    if (preQuote.status !== "ACCEPTED") {
      await tx.preQuote.update({
        where: { id: preQuote.id },
        data: {
          status: "ACCEPTED",
          sentOn: preQuote.sentOn ?? issueDate,
          respondedOn: issueDate,
        },
      });
    }
    await logActivity(
      {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "quote.created",
        entity: "QUOTE",
        entityId: created.id,
        summary: `Devis ${number} créé depuis le pré-devis ${preQuote.number} — ${preQuote.client.name}`,
        amountCents: created.totalCents,
      },
      tx,
    );
    return created;
  });

  return { quoteId: quote.id };
});
