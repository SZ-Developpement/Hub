"use server";

import { Prisma } from "@/generated/prisma/client";
import { action } from "@/lib/action";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { categorySchema, serviceSchema } from "@/lib/validation/catalog";
import { idSchema } from "@/lib/validation/zod";

async function assertCategory(organizationId: string, categoryId: string | null): Promise<void> {
  if (!categoryId) return;
  const category = await db.serviceCategory.findFirst({
    where: { id: categoryId, organizationId },
    select: { id: true },
  });
  if (!category) throw new AppError("Cette catégorie n'existe plus.");
}

export const saveService = action(serviceSchema, async ({ id, ...values }, ctx) => {
  await assertCategory(ctx.organizationId, values.categoryId);
  if (id) {
    const updated = await db.service.updateMany({
      where: { id, organizationId: ctx.organizationId },
      data: values,
    });
    if (updated.count === 0) throw new AppError("Cette prestation n'existe plus.");
    return;
  }
  await db.service.create({ data: { ...values, organizationId: ctx.organizationId } });
});

export const archiveService = action(idSchema, async ({ id }, ctx) => {
  await db.service.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { archivedAt: new Date() },
  });
});

export const restoreService = action(idSchema, async ({ id }, ctx) => {
  await db.service.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { archivedAt: null },
  });
});

/** Suppression définitive : refusée dès que la prestation figure dans un devis ou une facture. */
export const deleteService = action(idSchema, async ({ id }, ctx) => {
  const service = await db.service.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, _count: { select: { quoteLines: true, invoiceLines: true } } },
  });
  if (!service) return;
  if (service._count.quoteLines + service._count.invoiceLines > 0) {
    throw new AppError(
      "Cette prestation est utilisée dans des documents : elle ne peut pas être supprimée. Archivez-la.",
    );
  }
  await db.service.delete({ where: { id } });
});

export const saveCategory = action(categorySchema, async ({ id, name }, ctx) => {
  try {
    if (id) {
      await db.serviceCategory.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { name },
      });
      return;
    }
    const last = await db.serviceCategory.aggregate({
      where: { organizationId: ctx.organizationId },
      _max: { position: true },
    });
    await db.serviceCategory.create({
      data: { organizationId: ctx.organizationId, name, position: (last._max.position ?? -1) + 1 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Une catégorie porte déjà ce nom.");
    }
    throw error;
  }
});

/** Les prestations de la catégorie supprimée deviennent « sans catégorie ». */
export const deleteCategory = action(idSchema, async ({ id }, ctx) => {
  await db.serviceCategory.deleteMany({ where: { id, organizationId: ctx.organizationId } });
});
