import { prisma } from "@/lib/prisma";
import { InvoiceType } from "@/generated/prisma/client";

export async function generateInvoiceNumber(
  organizationId: string,
  type: InvoiceType,
): Promise<string> {
  // Récupère l'année en cours
  const year = new Date().getFullYear();
  const prefix = type === "QUOTE" ? "DEV" : "FACT";

  // Compte les factures/devis existants de ce type, cette année, pour cette organisation
  const count = await prisma.invoice.count({
    where: {
      organizationId,
      type,
      // Filtre sur l'année en cours via issuedAt
      issuedAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  // Le prochain numéro est count + 1, formaté sur 3 chiffres
  const sequence = String(count + 1).padStart(3, "0");

  // Retourne le numéro de facture/devis au format : PREFIX-YYYY-XXX
  return `${prefix}-${year}-${sequence}`;
}
