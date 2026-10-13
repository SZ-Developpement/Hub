"use server";

import type { QuoteStatus } from "@/generated/prisma/enums";
import { action } from "@/lib/action";
import { addDays, toDate, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { formatRate } from "@/lib/format";
import { QUOTE_STATUS_LABELS } from "@/lib/labels";
import { applyRate, computeTotals } from "@/lib/money";
import { logActivity } from "@/lib/server/activity";
import { prepareLines, requireClient } from "@/lib/server/documents";
import { allocateNumber } from "@/lib/server/numbering";
import { quoteInvoicing } from "@/lib/server/quotes";
import {
  convertQuoteSchema,
  createQuoteSchema,
  updateQuoteSchema,
  type QuoteValues,
} from "@/lib/validation/documents";
import { id as idField, idSchema, isoDate, z } from "@/lib/validation/zod";

async function quoteData(organizationId: string, values: QuoteValues) {
  const lines = await prepareLines(organizationId, values.lines);
  const totals = computeTotals({
    lines,
    discountType: values.discountType,
    discountValue: values.discountValue,
  });
  return {
    lines,
    data: {
      clientId: values.clientId,
      title: values.title,
      issueDate: toDate(values.issueDate),
      validUntil: toDate(values.validUntil),
      discountType: values.discountType,
      discountValue: values.discountType === "NONE" ? 0 : values.discountValue,
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      totalCents: totals.totalCents,
      depositRateBp: values.depositRateBp,
      notes: values.notes,
      terms: values.terms,
    },
  };
}

export const createQuote = action(createQuoteSchema, async ({ preQuoteId, ...values }, ctx) => {
  const client = await requireClient(ctx.organizationId, values.clientId);
  const { lines, data } = await quoteData(ctx.organizationId, values);

  const linkedPreQuote = preQuoteId
    ? await db.preQuote.findFirst({
        where: { id: preQuoteId, organizationId: ctx.organizationId },
        select: { id: true },
      })
    : null;

  const quote = await db.$transaction(async (tx) => {
    const { number } = await allocateNumber(tx, ctx.organizationId, "QUOTE", data.issueDate);
    const created = await tx.quote.create({
      data: {
        ...data,
        organizationId: ctx.organizationId,
        preQuoteId: linkedPreQuote?.id ?? null,
        number,
        lines: { create: lines },
      },
    });
    await logActivity(
      {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "quote.created",
        entity: "QUOTE",
        entityId: created.id,
        summary: `Devis ${number} créé — ${client.name}`,
        amountCents: created.totalCents,
      },
      tx,
    );
    return created;
  });

  return { id: quote.id };
});

export const updateQuote = action(updateQuoteSchema, async ({ id, ...values }, ctx) => {
  const existing = await db.quote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { status: true },
  });
  if (!existing) throw new AppError("Ce devis n'existe plus.");
  if (existing.status !== "DRAFT") {
    throw new AppError("Seul un devis en brouillon peut être modifié. Remettez-le en brouillon.");
  }
  await requireClient(ctx.organizationId, values.clientId);
  const { lines, data } = await quoteData(ctx.organizationId, values);

  await db.$transaction([
    db.quoteLine.deleteMany({ where: { quoteId: id } }),
    db.quote.update({ where: { id }, data: { ...data, lines: { create: lines } } }),
  ]);
});

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "DECLINED", "DRAFT"],
  ACCEPTED: ["SENT"],
  DECLINED: ["DRAFT"],
  EXPIRED: ["DRAFT"],
};

export const setQuoteStatus = action(
  z.object({ id: idField, status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED"]) }),
  async ({ id, status }, ctx) => {
    const quote = await db.quote.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { client: { select: { name: true } }, _count: { select: { invoices: true } } },
    });
    if (!quote) throw new AppError("Ce devis n'existe plus.");
    if (!TRANSITIONS[quote.status].includes(status)) {
      throw new AppError(
        `Un devis « ${QUOTE_STATUS_LABELS[quote.status].toLowerCase()} » ne peut pas passer à « ${QUOTE_STATUS_LABELS[status].toLowerCase()} ».`,
      );
    }
    if (quote._count.invoices > 0 && status !== "ACCEPTED") {
      throw new AppError("Ce devis a déjà été facturé : son statut ne peut plus être modifié.");
    }

    const todayDate = today();
    if (status === "SENT" && quote.validUntil < todayDate) {
      throw new AppError(
        "La date de validité est dépassée. Modifiez-la avant de marquer le devis comme envoyé.",
      );
    }

    await db.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          status,
          sentOn: status === "SENT" ? (quote.sentOn ?? todayDate) : status === "DRAFT" ? null : undefined,
          acceptedOn: status === "ACCEPTED" ? todayDate : null,
          declinedOn: status === "DECLINED" ? todayDate : null,
        },
      });
      if (status !== "DRAFT") {
        await logActivity(
          {
            organizationId: ctx.organizationId,
            userId: ctx.user.id,
            action: `quote.${status.toLowerCase()}`,
            entity: "QUOTE",
            entityId: id,
            summary: `Devis ${quote.number} ${QUOTE_STATUS_LABELS[status].toLowerCase()} — ${quote.client.name}`,
            amountCents: quote.totalCents,
          },
          tx,
        );
      }
    });
  },
);

/** Prolonge un devis envoyé ou expiré : il redevient « envoyé » avec sa nouvelle échéance. */
export const extendQuote = action(
  z.object({ id: idField, validUntil: isoDate }),
  async ({ id, validUntil }, ctx) => {
    const quote = await db.quote.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: { status: true },
    });
    if (!quote) throw new AppError("Ce devis n'existe plus.");
    if (quote.status !== "SENT" && quote.status !== "EXPIRED") {
      throw new AppError("Seul un devis envoyé ou expiré peut être prolongé.");
    }
    const date = toDate(validUntil);
    if (date < today()) throw new AppError("La nouvelle date de validité doit être à venir.");

    await db.quote.update({ where: { id }, data: { validUntil: date, status: "SENT" } });
  },
);

export const duplicateQuote = action(idSchema, async ({ id }, ctx) => {
  const source = await db.quote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!source) throw new AppError("Ce devis n'existe plus.");

  const issueDate = today();
  const copy = await db.$transaction(async (tx) => {
    const { number } = await allocateNumber(tx, ctx.organizationId, "QUOTE", issueDate);
    return tx.quote.create({
      data: {
        organizationId: ctx.organizationId,
        clientId: source.clientId,
        number,
        title: source.title,
        issueDate,
        validUntil: addDays(issueDate, ctx.settings.quoteValidityDays),
        discountType: source.discountType,
        discountValue: source.discountValue,
        subtotalCents: source.subtotalCents,
        discountCents: source.discountCents,
        totalCents: source.totalCents,
        depositRateBp: source.depositRateBp,
        notes: source.notes,
        terms: source.terms,
        lines: {
          create: source.lines.map(({ id: _lineId, quoteId: _quoteId, ...line }) => line),
        },
      },
    });
  });
  return { id: copy.id };
});

export const deleteQuote = action(idSchema, async ({ id }, ctx) => {
  const quote = await db.quote.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { _count: { select: { invoices: true } } },
  });
  if (!quote) return;
  if (quote._count.invoices > 0) {
    throw new AppError("Ce devis est lié à des factures : il ne peut pas être supprimé.");
  }
  await db.quote.delete({ where: { id } });
});

/**
 * Crée une facture en brouillon à partir du devis :
 *  - FULL : toutes les lignes du devis ;
 *  - DEPOSIT : une ligne d'acompte, en pourcentage du total ;
 *  - BALANCE : toutes les lignes, acomptes déjà émis déduits.
 * Rien n'est numéroté ici : la facture reste modifiable jusqu'à son émission.
 */
export const convertQuoteToInvoice = action(
  convertQuoteSchema,
  async ({ id, mode, depositRateBp }, ctx) => {
    const quote = await db.quote.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        client: true,
        lines: { orderBy: { position: "asc" } },
        invoices: {
          select: {
            id: true,
            type: true,
            status: true,
            netCents: true,
            creditedCents: true,
            balanceInvoiceId: true,
          },
        },
      },
    });
    if (!quote) throw new AppError("Ce devis n'existe plus.");
    if (quote.status !== "SENT" && quote.status !== "ACCEPTED") {
      throw new AppError("Le devis doit être envoyé ou accepté pour être facturé.");
    }

    const invoicing = quoteInvoicing(quote.totalCents, quote.invoices);
    if (invoicing.hasFinalInvoice) {
      throw new AppError("Ce devis fait déjà l'objet d'une facture totale ou de solde.");
    }

    const issueDate = today();
    const paymentTermDays = quote.client.paymentTermDays ?? ctx.settings.paymentTermDays;
    const base = {
      organizationId: ctx.organizationId,
      clientId: quote.clientId,
      quoteId: quote.id,
      title: quote.title,
      issueDate,
      paymentTermDays,
      dueDate: addDays(issueDate, paymentTermDays),
      notes: ctx.settings.invoiceDefaultNotes,
      terms: ctx.settings.invoiceDefaultTerms,
    };
    const quoteLines = quote.lines.map(({ id: _lineId, quoteId: _quoteId, ...line }) => line);
    const quoteTotals = {
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      totalCents: quote.totalCents,
    };

    const invoice = await db.$transaction(async (tx) => {
      let created;

      if (mode === "FULL") {
        if (!invoicing.canInvoiceFull) {
          throw new AppError(
            "Des factures existent déjà pour ce devis : créez une facture de solde.",
          );
        }
        created = await tx.invoice.create({
          data: {
            ...base,
            ...quoteTotals,
            type: "STANDARD",
            netCents: quote.totalCents,
            lines: { create: quoteLines },
          },
        });
      } else if (mode === "DEPOSIT") {
        const amountCents = applyRate(quote.totalCents, depositRateBp);
        const draftDeposits = quote.invoices
          .filter((item) => item.type === "DEPOSIT" && item.status === "DRAFT")
          .reduce((sum, item) => sum + item.netCents, 0);
        if (amountCents <= 0) throw new AppError("Le montant de l'acompte est nul.");
        if (invoicing.depositedCents + draftDeposits + amountCents >= quote.totalCents) {
          throw new AppError(
            "Le total des acomptes atteindrait le montant du devis. Réduisez le pourcentage ou créez une facture de solde.",
          );
        }

        // L'acompte est rattaché à la catégorie dominante du devis (ventilation du CA).
        const byCategory = new Map<string, number>();
        for (const line of quote.lines) {
          if (line.categoryId) {
            byCategory.set(line.categoryId, (byCategory.get(line.categoryId) ?? 0) + line.totalCents);
          }
        }
        const dominantCategory =
          [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        created = await tx.invoice.create({
          data: {
            ...base,
            type: "DEPOSIT",
            depositRateBp,
            subtotalCents: amountCents,
            totalCents: amountCents,
            netCents: amountCents,
            lines: {
              create: [
                {
                  position: 0,
                  categoryId: dominantCategory,
                  label: `Acompte de ${formatRate(depositRateBp)} sur le devis ${quote.number}`,
                  description: quote.title,
                  quantityMilli: 1000,
                  unit: "FLAT",
                  unitPriceCents: amountCents,
                  totalCents: amountCents,
                },
              ],
            },
          },
        });
      } else {
        if (invoicing.hasDraftDeposit) {
          throw new AppError(
            "Une facture d'acompte est encore en brouillon : émettez-la ou supprimez-la d'abord.",
          );
        }
        if (!invoicing.canInvoiceBalance) {
          throw new AppError("Aucun acompte émis à déduire : créez une facture totale.");
        }
        created = await tx.invoice.create({
          data: {
            ...base,
            ...quoteTotals,
            type: "BALANCE",
            depositDeductionCents: invoicing.pendingDepositCents,
            netCents: quote.totalCents - invoicing.pendingDepositCents,
            lines: { create: quoteLines },
          },
        });
        await tx.invoice.updateMany({
          where: {
            quoteId: quote.id,
            organizationId: ctx.organizationId,
            type: "DEPOSIT",
            status: { notIn: ["DRAFT", "CANCELLED"] },
            balanceInvoiceId: null,
          },
          data: { balanceInvoiceId: created.id },
        });
      }

      // Facturer un devis envoyé vaut acceptation.
      if (quote.status === "SENT") {
        await tx.quote.update({
          where: { id: quote.id },
          data: { status: "ACCEPTED", acceptedOn: issueDate },
        });
      }
      return created;
    });

    return { invoiceId: invoice.id };
  },
);
