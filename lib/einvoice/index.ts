// Facturation électronique — point d'extension, non implémenté.
//
// La réforme française impose progressivement des factures au format structuré
// (Factur-X, UBL ou CII). Rien n'est généré aujourd'hui, mais le modèle de données est
// prêt à recevoir un export Factur-X sans migration ni reprise de l'historique :
//
//  1. Chaque facture émise conserve sa photographie complète (`Invoice.snapshot`,
//     type `InvoiceSnapshot`) : vendeur, acheteur, lignes, totaux, mentions, références.
//     C'est exactement le contenu qu'exige le XML CII embarqué dans un Factur-X —
//     y compris pour les factures émises avant que l'export n'existe.
//  2. Le PDF archivé (`Invoice.pdfFile`) est conservé tel quel. Un Factur-X est ce même
//     PDF, converti en PDF/A-3, avec le XML en pièce jointe.
//  3. Les colonnes `Invoice.eInvoiceFormat` et `Invoice.eInvoiceFileId` (type de fichier
//     `EINVOICE`) sont réservées pour référencer le fichier produit.
//
// Pour l'implémenter : écrire un `EInvoiceExporter` qui transforme un `InvoiceSnapshot`
// en XML (profil MINIMUM ou BASIC WL pour commencer), l'attacher au PDF archivé, stocker
// le résultat via `saveFile({ kind: "EINVOICE" })`, puis l'exposer par une route
// `/api/pdf/invoice/[id]?format=facturx`.

import type { InvoiceSnapshot } from "@/lib/documents/types";

export type EInvoiceFormat = "FACTUR_X";

export type EInvoiceFile = {
  format: EInvoiceFormat;
  /** Profil Factur-X : MINIMUM, BASIC WL, BASIC, EN 16931… */
  profile: string;
  fileName: string;
  contentType: string;
  content: Buffer;
};

export interface EInvoiceExporter {
  readonly format: EInvoiceFormat;
  /**
   * Produit le fichier structuré d'une facture émise.
   * @param snapshot photographie figée de la facture
   * @param archivedPdf PDF archivé à l'émission, à embarquer tel quel
   */
  export(snapshot: InvoiceSnapshot, archivedPdf: Buffer): Promise<EInvoiceFile>;
}

/** Exportateurs disponibles. Vide tant qu'aucun format n'est implémenté. */
export const E_INVOICE_EXPORTERS: Partial<Record<EInvoiceFormat, EInvoiceExporter>> = {};

/**
 * Correspondance entre les champs de la photographie et les termes de la norme EN 16931,
 * pour guider l'implémentation du XML.
 */
export const EN16931_MAPPING = {
  "BT-1 (numéro de facture)": "number",
  "BT-2 (date d'émission)": "issueDate",
  "BT-3 (type de facture : 380 facture, 381 avoir, 386 acompte)": "type",
  "BT-9 (date d'échéance)": "dueDate",
  "BT-25 (facture antérieure, pour un avoir)": "creditedInvoice.number",
  "BT-27 (nom du vendeur)": "seller.companyName",
  "BT-30 (identifiant légal du vendeur : SIREN)": "seller.siret",
  "BT-31 (n° de TVA du vendeur)": "seller.vatNumber",
  "BT-44 (nom de l'acheteur)": "buyer.name",
  "BT-47 (identifiant légal de l'acheteur : SIREN)": "buyer.siret",
  "BT-73 / BT-74 (période de facturation)": "serviceStart / serviceEnd",
  "BT-106 (somme des lignes)": "totals.subtotalCents",
  "BT-107 (remises au niveau document)": "totals.discountCents",
  "BT-109 (total HT)": "totals.totalCents",
  "BT-113 (montant déjà payé : acomptes)": "totals.depositDeductionCents",
  "BT-115 (montant à payer)": "totals.netCents",
  "BT-120 (motif d'exonération de TVA)": "legal.vatMention",
  "BG-25 (lignes de facture)": "lines[]",
} as const satisfies Record<string, string>;
