"use server";

import { Prisma } from "@/generated/prisma/client";
import { action, formAction } from "@/lib/action";
import { toDate, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertUpload, RECEIPT_MIME_TYPES } from "@/lib/images";
import { logActivity } from "@/lib/server/activity";
import { removeFile, saveFile } from "@/lib/server/files";
import { periodLabel } from "@/lib/urssaf-periods";
import {
  declareUrssafSchema,
  expenseCategorySchema,
  expenseSchema,
  payUrssafSchema,
} from "@/lib/validation/accounting";
import { idSchema } from "@/lib/validation/zod";

// ───────────────────────────── Dépenses ─────────────────────────────

/** Formulaire multipart : les champs sont dans `data` (JSON), le justificatif dans `receipt`. */
export const saveExpense = formAction(async (formData, ctx) => {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("data") ?? ""));
  } catch {
    throw new AppError("Formulaire invalide.");
  }
  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Certains champs sont invalides.");
  }
  const { id, date, ...values } = parsed.data;

  const category = await db.expenseCategory.findFirst({
    where: { id: values.categoryId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!category) throw new AppError("Cette catégorie n'existe plus.");

  const existing = id
    ? await db.expense.findFirst({
        where: { id, organizationId: ctx.organizationId },
        select: { id: true, receiptFileId: true },
      })
    : null;
  if (id && !existing) throw new AppError("Cette dépense n'existe plus.");

  const upload = formData.get("receipt");
  const receipt = upload instanceof File && upload.size > 0 ? upload : null;
  const removeReceipt = formData.get("removeReceipt") === "1";

  let receiptFileId = existing?.receiptFileId ?? null;
  if (receipt) {
    assertUpload(receipt, RECEIPT_MIME_TYPES);
    const stored = await saveFile({
      organizationId: ctx.organizationId,
      kind: "RECEIPT",
      buffer: Buffer.from(await receipt.arrayBuffer()),
      contentType: receipt.type,
      fileName: receipt.name,
      uploadedById: ctx.user.id,
    });
    receiptFileId = stored.id;
  } else if (removeReceipt) {
    receiptFileId = null;
  }

  const data = { ...values, date: toDate(date), receiptFileId };
  if (existing) {
    await db.expense.update({ where: { id: existing.id }, data });
  } else {
    const expense = await db.expense.create({
      data: { ...data, organizationId: ctx.organizationId },
    });
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "expense.created",
      entity: "EXPENSE",
      entityId: expense.id,
      summary: `Dépense enregistrée — ${values.supplier}`,
      amountCents: -values.amountCents,
    });
  }

  // L'ancien justificatif n'est plus référencé : on le retire du stockage.
  if (existing?.receiptFileId && existing.receiptFileId !== receiptFileId) {
    await removeFile(ctx.organizationId, existing.receiptFileId);
  }
});

export const deleteExpense = action(idSchema, async ({ id }, ctx) => {
  const expense = await db.expense.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, receiptFileId: true },
  });
  if (!expense) return;
  await db.expense.delete({ where: { id: expense.id } });
  if (expense.receiptFileId) await removeFile(ctx.organizationId, expense.receiptFileId);
});

export const saveExpenseCategory = action(expenseCategorySchema, async ({ id, name }, ctx) => {
  try {
    if (id) {
      await db.expenseCategory.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { name },
      });
      return;
    }
    const last = await db.expenseCategory.aggregate({
      where: { organizationId: ctx.organizationId },
      _max: { position: true },
    });
    await db.expenseCategory.create({
      data: { organizationId: ctx.organizationId, name, position: (last._max.position ?? -1) + 1 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Une catégorie porte déjà ce nom.");
    }
    throw error;
  }
});

export const deleteExpenseCategory = action(idSchema, async ({ id }, ctx) => {
  const category = await db.expenseCategory.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { _count: { select: { expenses: true } } },
  });
  if (!category) return;
  if (category._count.expenses > 0) {
    throw new AppError(
      "Des dépenses utilisent cette catégorie : reclassez-les avant de la supprimer.",
    );
  }
  await db.expenseCategory.delete({ where: { id } });
});

// ───────────────────────────── URSSAF ─────────────────────────────

async function requireDeclaration(organizationId: string, id: string) {
  const declaration = await db.urssafDeclaration.findFirst({ where: { id, organizationId } });
  if (!declaration) throw new AppError("Cette période n'existe plus.");
  return declaration;
}

/** Fige le CA déclaré et les cotisations de la période. */
export const declareUrssaf = action(declareUrssafSchema, async ({ id, declaredOn, ...amounts }, ctx) => {
  const declaration = await requireDeclaration(ctx.organizationId, id);
  if (declaration.status === "PAID") {
    throw new AppError("Cette période est déjà payée. Rouvrez-la pour la corriger.");
  }
  const date = toDate(declaredOn);
  if (date > today()) throw new AppError("La date de déclaration ne peut pas être dans le futur.");

  await db.$transaction(async (tx) => {
    await tx.urssafDeclaration.update({
      where: { id },
      data: { ...amounts, status: "DECLARED", declaredOn: date, paidOn: null },
    });
    await logActivity(
      {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "urssaf.declared",
        entity: "URSSAF",
        entityId: id,
        summary: `Déclaration URSSAF ${periodLabel(declaration.periodStart, declaration.periodEnd)} effectuée`,
        amountCents: -amounts.contributionsCents,
      },
      tx,
    );
  });
});

export const payUrssaf = action(payUrssafSchema, async ({ id, paidOn }, ctx) => {
  const declaration = await requireDeclaration(ctx.organizationId, id);
  if (declaration.status !== "DECLARED") {
    throw new AppError("Enregistrez d'abord la déclaration de cette période.");
  }
  const date = toDate(paidOn);
  if (date > today()) throw new AppError("La date de paiement ne peut pas être dans le futur.");

  await db.urssafDeclaration.update({ where: { id }, data: { status: "PAID", paidOn: date } });
});

/** Rouvre une période : les montants figés sont effacés, l'estimation en direct reprend. */
export const reopenUrssaf = action(idSchema, async ({ id }, ctx) => {
  await requireDeclaration(ctx.organizationId, id);
  await db.urssafDeclaration.update({
    where: { id },
    data: {
      status: "TO_DECLARE",
      declaredRevenueCents: null,
      contributionsCents: null,
      declaredOn: null,
      paidOn: null,
    },
  });
});
