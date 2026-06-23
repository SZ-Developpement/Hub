import { InvoiceType } from "@/generated/prisma/client";

// Recuper le type de document (devis ou facture) et replace le text par un text plus lisible
// exemple: "QUOTE" => "Devis" et "INVOICE" => "Facture"
export const getReadableType = (type: InvoiceType) => {
  switch (type) {
    case "QUOTE":
      return "Devis";
    case "INVOICE":
      return "Facture";
    default:
      return type;
  }
};
