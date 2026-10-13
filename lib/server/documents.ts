import "server-only";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { lineTotalCents } from "@/lib/money";
import type { LineValues } from "@/lib/validation/documents";

/** Client de l'organisation, ou erreur métier s'il n'existe pas (ou plus). */
export async function requireClient(organizationId: string, clientId: string) {
  const client = await db.client.findFirst({ where: { id: clientId, organizationId } });
  if (!client) throw new AppError("Ce client n'existe plus.");
  return client;
}

export type PreparedLine = {
  position: number;
  serviceId: string | null;
  categoryId: string | null;
  label: string;
  description: string;
  quantityMilli: number;
  unit: LineValues["unit"];
  unitPriceCents: number;
  totalCents: number;
};

/**
 * Prépare les lignes d'un document pour l'enregistrement : vérifie que les prestations
 * et catégories référencées appartiennent bien à l'organisation, puis calcule les totaux.
 * Rien de ce que le navigateur envoie comme total n'est repris.
 */
export async function prepareLines(
  organizationId: string,
  lines: LineValues[],
): Promise<PreparedLine[]> {
  const serviceIds = [...new Set(lines.flatMap((line) => (line.serviceId ? [line.serviceId] : [])))];
  const categoryIds = [...new Set(lines.flatMap((line) => (line.categoryId ? [line.categoryId] : [])))];

  const [services, categories] = await Promise.all([
    serviceIds.length > 0
      ? db.service.findMany({
          where: { id: { in: serviceIds }, organizationId },
          select: { id: true, categoryId: true },
        })
      : [],
    categoryIds.length > 0
      ? db.serviceCategory.findMany({
          where: { id: { in: categoryIds }, organizationId },
          select: { id: true },
        })
      : [],
  ]);
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const knownCategories = new Set(categories.map((category) => category.id));

  return lines.map((line, position) => {
    const service = line.serviceId ? serviceById.get(line.serviceId) : undefined;
    // Prestation supprimée entre-temps : la ligne devient une ligne libre.
    const categoryId = service
      ? service.categoryId
      : line.categoryId && knownCategories.has(line.categoryId)
        ? line.categoryId
        : null;
    return {
      position,
      serviceId: service?.id ?? null,
      categoryId,
      label: line.label,
      description: line.description,
      quantityMilli: line.quantityMilli,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      totalCents: lineTotalCents(line.quantityMilli, line.unitPriceCents),
    };
  });
}

/** Prestations actives du catalogue, pour le sélecteur des formulaires de documents. */
export async function listCatalogOptions(organizationId: string) {
  return db.service.findMany({
    where: { organizationId, archivedAt: null },
    orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      unit: true,
      unitPriceCents: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });
}

export type CatalogOption = Awaited<ReturnType<typeof listCatalogOptions>>[number];
