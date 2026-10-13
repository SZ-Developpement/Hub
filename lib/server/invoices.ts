import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { InvoiceStatus, InvoiceType } from "@/generated/prisma/enums";
import { addDays, toDate, today } from "@/lib/dates";
import { db, type Tx } from "@/lib/db";
import { buildInvoiceSnapshot } from "@/lib/documents/build";
import type { InvoiceSnapshot } from "@/lib/documents/types";
import { AppError } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/format";
import { amountDueCents, computeInvoiceStatus } from "@/lib/invoice-status";
import { INVOICE_TYPE_LABELS, REMINDER_LEVEL_LABELS } from "@/lib/labels";
import { computeTotals } from "@/lib/money";
import { loadAssets, renderInvoicePdf } from "@/lib/pdf/render";
import { logActivity } from "@/lib/server/activity";
import { prepareLines, requireClient } from "@/lib/server/documents";
import { readFile, saveFile } from "@/lib/server/files";
import { allocateNumber } from "@/lib/server/numbering";
import type { AppContext } from "@/lib/session";
import { deleteObject, type StoredObject } from "@/lib/storage";
import type {
  CreditNoteValues,
  InvoiceValues,
  PaymentValues,
  ReminderValues,
} from "@/lib/validation/documents";

// L'émission rend le PDF et l'envoie au stockage à l'intérieur de la transaction.
const ISSUE_TRANSACTION = { timeout: 30_000, maxWait: 10_000 };

const snapshotInclude = {
  client: true,
  lines: { orderBy: { position: "asc" } },
  quote: { select: { number: true, issueDate: true } },
  creditedInvoice: { select: { number: true, issueDate: true } },
  deductedDeposits: {
    where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
    orderBy: { issueDate: "asc" },
    select: { number: true, issueDate: true, netCents: true, creditedCents: true },
  },
} satisfies Prisma.InvoiceInclude;

type InvoiceForSnapshot = Prisma.InvoiceGetPayload<{ include: typeof snapshotInclude }>;

function depositDeduction(invoice: Pick<InvoiceForSnapshot, "deductedDeposits">): number {
  return invoice.deductedDeposits.reduce(
    (sum, deposit) => sum + deposit.netCents - deposit.creditedCents,
    0,
  );
}

// ───────────────────────────── Brouillons ─────────────────────────────

async function draftData(organizationId: string, values: InvoiceValues, deductionCents = 0) {
  const lines = await prepareLines(organizationId, values.lines);
  const totals = computeTotals({
    lines,
    discountType: values.discountType,
    discountValue: values.discountValue,
    depositDeductionCents: deductionCents,
  });
  return {
    lines,
    data: {
      clientId: values.clientId,
      title: values.title,
      issueDate: toDate(values.issueDate),
      paymentTermDays: values.paymentTermDays,
      dueDate: toDate(values.dueDate),
      serviceStart: values.serviceStart ? toDate(values.serviceStart) : null,
      serviceEnd: values.serviceEnd ? toDate(values.serviceEnd) : null,
      discountType: values.discountType,
      discountValue: values.discountType === "NONE" ? 0 : values.discountValue,
      ...totals,
      notes: values.notes,
      terms: values.terms,
    },
  };
}

export async function createInvoiceDraft(ctx: AppContext, values: InvoiceValues) {
  await requireClient(ctx.organizationId, values.clientId);
  const { lines, data } = await draftData(ctx.organizationId, values);
  return db.invoice.create({
    data: {
      ...data,
      organizationId: ctx.organizationId,
      type: "STANDARD",
      lines: { create: lines },
    },
  });
}

export async function updateInvoiceDraft(ctx: AppContext, id: string, values: InvoiceValues) {
  const existing = await db.invoice.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { status: true, deductedDeposits: snapshotInclude.deductedDeposits },
  });
  if (!existing) throw new AppError("Cette facture n'existe plus.");
  if (existing.status !== "DRAFT") {
    throw new AppError(
      "Une facture émise ne peut plus être modifiée. Pour la corriger, créez un avoir.",
    );
  }
  await requireClient(ctx.organizationId, values.clientId);
  const { lines, data } = await draftData(ctx.organizationId, values, depositDeduction(existing));

  await db.$transaction([
    db.invoiceLine.deleteMany({ where: { invoiceId: id } }),
    db.invoice.update({ where: { id }, data: { ...data, lines: { create: lines } } }),
  ]);
}

export async function deleteInvoiceDraft(ctx: AppContext, id: string) {
  const deleted = await db.invoice.deleteMany({
    where: { id, organizationId: ctx.organizationId, status: "DRAFT" },
  });
  if (deleted.count === 0) {
    throw new AppError("Seule une facture en brouillon peut être supprimée.");
  }
}

export async function duplicateInvoice(ctx: AppContext, id: string) {
  const source = await db.invoice.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { lines: { orderBy: { position: "asc" } }, client: { select: { paymentTermDays: true } } },
  });
  if (!source) throw new AppError("Cette facture n'existe plus.");
  if (source.type === "CREDIT_NOTE") throw new AppError("Un avoir ne peut pas être dupliqué.");

  const issueDate = today();
  const paymentTermDays = source.client.paymentTermDays ?? ctx.settings.paymentTermDays;
  // La copie est une facture simple : ni lien de devis, ni acomptes déduits.
  const lines = source.lines.map(({ id: _lineId, invoiceId: _invoiceId, ...line }) => line);
  const totals = computeTotals({
    lines,
    discountType: source.discountType,
    discountValue: source.discountValue,
  });

  return db.invoice.create({
    data: {
      organizationId: ctx.organizationId,
      clientId: source.clientId,
      type: "STANDARD",
      title: source.title,
      issueDate,
      paymentTermDays,
      dueDate: addDays(issueDate, paymentTermDays),
      discountType: source.discountType,
      discountValue: source.discountValue,
      ...totals,
      notes: source.notes,
      terms: source.terms,
      lines: { create: lines },
    },
  });
}

// ───────────────────────────── État d'une facture ─────────────────────────────

/**
 * Recalcule les montants dénormalisés (payé, crédité) et le statut d'une facture émise
 * à partir de ses paiements et de ses avoirs. Appelé après toute opération qui les touche.
 */
export async function refreshInvoiceState(
  tx: Tx,
  invoiceId: string,
  todayDate: Date = today(),
): Promise<void> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { type: true, status: true, netCents: true, dueDate: true },
  });
  if (invoice.status === "DRAFT" || invoice.type === "CREDIT_NOTE") return;

  const [payments, credits] = await Promise.all([
    tx.payment.aggregate({
      where: { invoiceId },
      _sum: { amountCents: true },
      _max: { paidOn: true },
    }),
    tx.invoice.aggregate({
      where: { creditedInvoiceId: invoiceId, status: { not: "DRAFT" } },
      _sum: { netCents: true },
    }),
  ]);
  const paidCents = payments._sum.amountCents ?? 0;
  const creditedCents = -(credits._sum.netCents ?? 0);
  const status = computeInvoiceStatus(
    { type: invoice.type, issued: true, netCents: invoice.netCents, paidCents, creditedCents, dueDate: invoice.dueDate },
    todayDate,
  );

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      paidCents,
      creditedCents,
      status,
      paidOn: status === "PAID" ? (payments._max.paidOn ?? todayDate) : null,
    },
  });
}

type LockedInvoice = {
  id: string;
  type: InvoiceType;
  status: InvoiceStatus;
  number: string | null;
  netCents: number;
  paidCents: number;
  creditedCents: number;
};

/** Verrouille la ligne de la facture jusqu'à la fin de la transaction. */
async function lockInvoice(tx: Tx, organizationId: string, id: string): Promise<LockedInvoice> {
  const rows = await tx.$queryRaw<LockedInvoice[]>`
    SELECT id, type, status, number, "netCents", "paidCents", "creditedCents"
    FROM invoice
    WHERE id = ${id} AND "organizationId" = ${organizationId}
    FOR UPDATE
  `;
  if (rows.length === 0) throw new AppError("Cette facture n'existe plus.");
  return rows[0];
}

// ───────────────────────────── Émission ─────────────────────────────

function assertSellerReady(settings: AppContext["settings"]): void {
  const missing: string[] = [];
  if (!settings.companyName.trim()) missing.push("le nom commercial");
  if (!settings.addressLine1.trim() || !settings.postalCode.trim() || !settings.city.trim()) {
    missing.push("l'adresse de l'entreprise");
  }
  if (!`${settings.ownerFirstName}${settings.ownerLastName}`.trim()) {
    missing.push("votre prénom et votre nom");
  }
  if (missing.length > 0) {
    throw new AppError(
      `Mentions obligatoires manquantes : complétez ${missing.join(", ")} dans Paramètres › Entreprise avant d'émettre.`,
    );
  }
}

function assertBuyerReady(client: InvoiceForSnapshot["client"]): void {
  if (!client.addressLine1.trim() || !client.city.trim()) {
    throw new AppError(
      `L'adresse de ${client.name} est incomplète : c'est une mention obligatoire. Complétez sa fiche avant d'émettre.`,
    );
  }
}

/** Dernière pièce émise de la série : la numérotation doit suivre l'ordre chronologique. */
async function assertChronology(
  tx: Tx,
  organizationId: string,
  series: "INVOICE" | "CREDIT_NOTE",
  issueDate: Date,
): Promise<void> {
  const last = await tx.invoice.findFirst({
    where: {
      organizationId,
      number: { not: null },
      type: series === "CREDIT_NOTE" ? "CREDIT_NOTE" : { not: "CREDIT_NOTE" },
    },
    orderBy: [{ issueDate: "desc" }],
    select: { number: true, issueDate: true },
  });
  if (last && issueDate < last.issueDate) {
    throw new AppError(
      `La date d'émission ne peut pas précéder celle de la dernière pièce émise (${last.number} du ${formatDate(last.issueDate)}) : la numérotation doit rester chronologique.`,
    );
  }
}

/**
 * Rend le PDF de la photographie, l'archive et renvoie le fichier. Si la transaction
 * échoue ensuite, `onUploaded` permet à l'appelant de supprimer le blob orphelin.
 */
async function archivePdf(
  tx: Tx | typeof db,
  ctx: AppContext,
  snapshot: InvoiceSnapshot,
  onUploaded?: (object: StoredObject) => void,
) {
  const assets = await loadAssets(ctx.organizationId, snapshot.style);
  const pdf = await renderInvoicePdf(snapshot, assets);
  const file = await saveFile(
    {
      organizationId: ctx.organizationId,
      kind: "INVOICE_PDF",
      buffer: pdf,
      contentType: "application/pdf",
      fileName: `${snapshot.number}.pdf`,
      uploadedById: ctx.user.id,
    },
    tx,
  );
  onUploaded?.(file);
  return { file, pdf };
}

/**
 * Émet une facture : numéro définitif, photographie figée et PDF archivé, dans une
 * seule transaction.
 *
 * Le numéro est pris sous verrou, la date est contrôlée après ce verrou, et le PDF est
 * archivé avant le commit : si quoi que ce soit échoue, tout est annulé — le numéro
 * compris. Il ne peut donc y avoir ni trou, ni doublon, ni facture émise sans archive.
 */
export async function issueInvoice(ctx: AppContext, id: string, issueDateISO: string) {
  assertSellerReady(ctx.settings);
  const issueDate = toDate(issueDateISO);
  const todayDate = today();
  // Dans un objet : l'affectation a lieu dans la transaction, la lecture dans le catch.
  const uploaded: { object: StoredObject | null } = { object: null };

  try {
    return await db.$transaction(async (tx) => {
      const locked = await lockInvoice(tx, ctx.organizationId, id);
      if (locked.status !== "DRAFT") throw new AppError("Cette facture est déjà émise.");

      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id },
        include: snapshotInclude,
      });
      assertBuyerReady(invoice.client);
      if (invoice.lines.length === 0) throw new AppError("La facture ne contient aucune ligne.");

      const totals = computeTotals({
        lines: invoice.lines,
        discountType: invoice.discountType,
        discountValue: invoice.discountValue,
        depositDeductionCents: depositDeduction(invoice),
      });
      if (totals.netCents <= 0) {
        throw new AppError("Le net à payer doit être supérieur à zéro.");
      }

      const allocated = await allocateNumber(tx, ctx.organizationId, "INVOICE", issueDate);
      await assertChronology(tx, ctx.organizationId, "INVOICE", issueDate);

      // Si la date d'émission a changé depuis le brouillon, l'échéance suit le délai de paiement.
      const dueDate =
        invoice.issueDate.getTime() === issueDate.getTime() && invoice.dueDate >= issueDate
          ? invoice.dueDate
          : addDays(issueDate, invoice.paymentTermDays);

      // La date de prestation est une mention obligatoire : faute de précision,
      // c'est la date d'émission (un acompte, lui, précède la prestation).
      const serviceStart =
        invoice.serviceStart ?? (invoice.type === "DEPOSIT" ? null : issueDate);

      const snapshot = buildInvoiceSnapshot(
        { ...invoice, ...totals, number: allocated.number, issueDate, dueDate, serviceStart },
        ctx.settings,
      );
      const { file } = await archivePdf(tx, ctx, snapshot, (object) => {
        uploaded.object = object;
      });

      await tx.invoice.update({
        where: { id },
        data: {
          ...totals,
          number: allocated.number,
          sequenceYear: allocated.year,
          sequenceValue: allocated.value,
          issueDate,
          dueDate,
          serviceStart,
          status: computeInvoiceStatus(
            {
              type: invoice.type,
              issued: true,
              netCents: totals.netCents,
              paidCents: 0,
              creditedCents: 0,
              dueDate,
            },
            todayDate,
          ),
          issuedAt: new Date(),
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          pdfFileId: file.id,
        },
      });
      await logActivity(
        {
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          action: "invoice.issued",
          entity: "INVOICE",
          entityId: id,
          summary: `${INVOICE_TYPE_LABELS[invoice.type]} ${allocated.number} émise — ${invoice.client.name}`,
          amountCents: totals.netCents,
        },
        tx,
      );
      return { number: allocated.number };
    }, ISSUE_TRANSACTION);
  } catch (error) {
    if (uploaded.object) await deleteObject(uploaded.object).catch(() => undefined);
    throw error;
  }
}

// ───────────────────────────── Paiements ─────────────────────────────

export async function recordPayment(ctx: AppContext, values: PaymentValues) {
  const paidOn = toDate(values.paidOn);
  const todayDate = today();
  if (paidOn > todayDate) throw new AppError("La date du paiement ne peut pas être dans le futur.");

  await db.$transaction(async (tx) => {
    const invoice = await lockInvoice(tx, ctx.organizationId, values.invoiceId);
    if (invoice.status === "DRAFT") {
      throw new AppError("Émettez la facture avant d'enregistrer un paiement.");
    }
    if (invoice.type === "CREDIT_NOTE") {
      throw new AppError("Le remboursement d'un avoir s'enregistre sur la facture d'origine.");
    }

    const due = amountDueCents(invoice);
    if (values.amountCents > 0 && values.amountCents > due) {
      throw new AppError(
        due > 0
          ? `Le montant dépasse le reste dû (${formatMoney(due)}).`
          : "Cette facture est déjà soldée.",
      );
    }
    if (values.amountCents < 0 && invoice.paidCents + values.amountCents < 0) {
      throw new AppError(
        `Le remboursement dépasse les sommes encaissées (${formatMoney(invoice.paidCents)}).`,
      );
    }

    const payment = await tx.payment.create({
      data: {
        organizationId: ctx.organizationId,
        invoiceId: invoice.id,
        paidOn,
        amountCents: values.amountCents,
        method: values.method,
        reference: values.reference,
        note: values.note,
      },
    });
    await refreshInvoiceState(tx, invoice.id, todayDate);

    const client = await tx.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      select: { client: { select: { name: true } } },
    });
    await logActivity(
      {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: values.amountCents < 0 ? "payment.refunded" : "payment.recorded",
        entity: "PAYMENT",
        entityId: payment.id,
        summary:
          values.amountCents < 0
            ? `Remboursement sur ${invoice.number} — ${client.client.name}`
            : `Paiement reçu pour ${invoice.number} — ${client.client.name}`,
        amountCents: values.amountCents,
      },
      tx,
    );
  });
}

export async function deletePayment(ctx: AppContext, paymentId: string) {
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, organizationId: ctx.organizationId },
      select: { id: true, invoiceId: true, amountCents: true },
    });
    if (!payment) return;
    const invoice = await lockInvoice(tx, ctx.organizationId, payment.invoiceId);
    await tx.payment.delete({ where: { id: payment.id } });
    await refreshInvoiceState(tx, invoice.id);
    await logActivity(
      {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "payment.deleted",
        entity: "PAYMENT",
        entityId: payment.id,
        summary: `Paiement supprimé sur ${invoice.number}`,
        amountCents: -payment.amountCents,
      },
      tx,
    );
  });
}

// ───────────────────────────── Relances ─────────────────────────────

export async function addReminder(ctx: AppContext, values: ReminderValues) {
  const invoice = await db.invoice.findFirst({
    where: { id: values.invoiceId, organizationId: ctx.organizationId },
    select: { id: true, number: true, status: true, type: true, client: { select: { name: true } } },
  });
  if (!invoice) throw new AppError("Cette facture n'existe plus.");
  if (invoice.status === "DRAFT" || invoice.type === "CREDIT_NOTE") {
    throw new AppError("Seule une facture émise peut être relancée.");
  }
  const sentOn = toDate(values.sentOn);
  if (sentOn > today()) throw new AppError("La date de relance ne peut pas être dans le futur.");

  await db.$transaction(async (tx) => {
    await tx.invoiceReminder.create({
      data: {
        organizationId: ctx.organizationId,
        invoiceId: invoice.id,
        sentOn,
        level: values.level,
        channel: values.channel,
        note: values.note,
      },
    });
    await logActivity(
      {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "invoice.reminded",
        entity: "INVOICE",
        entityId: invoice.id,
        summary: `${REMINDER_LEVEL_LABELS[values.level]} pour ${invoice.number} — ${invoice.client.name}`,
      },
      tx,
    );
  });
}

export async function deleteReminder(ctx: AppContext, reminderId: string) {
  await db.invoiceReminder.deleteMany({
    where: { id: reminderId, organizationId: ctx.organizationId },
  });
}

// ───────────────────────────── Avoirs ─────────────────────────────

/**
 * Émet un avoir sur une facture. C'est la seule façon de corriger ou d'annuler une
 * facture émise : la facture d'origine n'est jamais modifiée, seul son solde l'est.
 */
export async function createCreditNote(ctx: AppContext, values: CreditNoteValues) {
  const issueDate = toDate(values.issueDate);
  const todayDate = today();
  // Dans un objet : l'affectation a lieu dans la transaction, la lecture dans le catch.
  const uploaded: { object: StoredObject | null } = { object: null };

  try {
    return await db.$transaction(async (tx) => {
      const locked = await lockInvoice(tx, ctx.organizationId, values.invoiceId);
      if (locked.status === "DRAFT") {
        throw new AppError("Un brouillon se modifie ou se supprime directement, sans avoir.");
      }
      if (locked.type === "CREDIT_NOTE") throw new AppError("Un avoir ne peut pas être crédité.");

      const original = await tx.invoice.findUniqueOrThrow({
        where: { id: locked.id },
        include: { client: true, lines: { orderBy: { position: "asc" } } },
      });
      const creditable = original.netCents - original.creditedCents;
      if (creditable <= 0) throw new AppError("Cette facture est déjà entièrement annulée.");
      if (issueDate < original.issueDate) {
        throw new AppError("L'avoir ne peut pas être antérieur à la facture qu'il corrige.");
      }

      const amountCents = values.mode === "FULL" ? creditable : values.amountCents;
      if (amountCents > creditable) {
        throw new AppError(
          `Le montant dépasse ce qui reste à créditer sur cette facture (${formatMoney(creditable)}).`,
        );
      }

      // Annulation complète d'une facture intacte : on reprend ses lignes, en négatif.
      const mirror =
        values.mode === "FULL" &&
        original.creditedCents === 0 &&
        original.depositDeductionCents === 0;

      const byCategory = new Map<string, number>();
      for (const line of original.lines) {
        if (line.categoryId) {
          byCategory.set(line.categoryId, (byCategory.get(line.categoryId) ?? 0) + line.totalCents);
        }
      }
      const dominantCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const lines = mirror
        ? original.lines.map(({ id: _id, invoiceId: _invoiceId, ...line }) => ({
            ...line,
            unitPriceCents: -line.unitPriceCents,
            totalCents: -line.totalCents,
          }))
        : [
            {
              position: 0,
              serviceId: null,
              categoryId: dominantCategory,
              label:
                values.label ||
                `Avoir ${values.mode === "FULL" ? "total" : "partiel"} sur la facture ${original.number}`,
              description: "",
              quantityMilli: 1000,
              unit: "FLAT" as const,
              unitPriceCents: -amountCents,
              totalCents: -amountCents,
            },
          ];
      const discountType = mirror ? original.discountType : ("NONE" as const);
      const discountValue = mirror
        ? original.discountType === "AMOUNT"
          ? -original.discountValue
          : original.discountValue
        : 0;
      const totals = computeTotals({ lines, discountType, discountValue });
      if (totals.netCents !== -amountCents) {
        throw new Error("Le total de l'avoir ne correspond pas au montant à créditer.");
      }

      const allocated = await allocateNumber(tx, ctx.organizationId, "CREDIT_NOTE", issueDate);
      await assertChronology(tx, ctx.organizationId, "CREDIT_NOTE", issueDate);

      const creditNote = await tx.invoice.create({
        data: {
          organizationId: ctx.organizationId,
          clientId: original.clientId,
          type: "CREDIT_NOTE",
          status: "ISSUED",
          number: allocated.number,
          sequenceYear: allocated.year,
          sequenceValue: allocated.value,
          title: original.title,
          issueDate,
          dueDate: issueDate,
          paymentTermDays: 0,
          discountType,
          discountValue,
          ...totals,
          creditedInvoiceId: original.id,
          creditReason: values.reason,
          issuedAt: new Date(),
          lines: { create: lines },
        },
        include: snapshotInclude,
      });

      const snapshot = buildInvoiceSnapshot(
        { ...creditNote, number: allocated.number },
        ctx.settings,
      );
      const { file } = await archivePdf(tx, ctx, snapshot, (object) => {
        uploaded.object = object;
      });
      await tx.invoice.update({
        where: { id: creditNote.id },
        data: { snapshot: snapshot as unknown as Prisma.InputJsonValue, pdfFileId: file.id },
      });

      await refreshInvoiceState(tx, original.id, todayDate);
      await logActivity(
        {
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          action: "credit_note.issued",
          entity: "INVOICE",
          entityId: creditNote.id,
          summary: `Avoir ${allocated.number} émis sur ${original.number} — ${original.client.name}`,
          amountCents: totals.netCents,
        },
        tx,
      );
      return { id: creditNote.id, number: allocated.number };
    }, ISSUE_TRANSACTION);
  } catch (error) {
    if (uploaded.object) await deleteObject(uploaded.object).catch(() => undefined);
    throw error;
  }
}

// ───────────────────────────── PDF ─────────────────────────────

/**
 * PDF d'une facture.
 *  - Émise : le fichier archivé, octet pour octet. Jamais régénéré avec les réglages du jour.
 *  - Émise sans archive (cas de reprise) : rendu à partir de la photographie figée, puis archivé.
 *  - Brouillon : aperçu avec les réglages en cours.
 */
export async function getInvoicePdf(
  ctx: AppContext,
  id: string,
): Promise<{ pdf: Buffer; fileName: string } | null> {
  const invoice = await db.invoice.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { ...snapshotInclude, pdfFile: true },
  });
  if (!invoice) return null;

  if (invoice.status === "DRAFT" || !invoice.number) {
    const totals = computeTotals({
      lines: invoice.lines,
      discountType: invoice.discountType,
      discountValue: invoice.discountValue,
      depositDeductionCents: depositDeduction(invoice),
    });
    const draft = buildInvoiceSnapshot({ ...invoice, ...totals, number: "BROUILLON" }, ctx.settings);
    const pdf = await renderInvoicePdf(draft, await loadAssets(ctx.organizationId, draft.style));
    return { pdf, fileName: "Facture-brouillon.pdf" };
  }

  const fileName = `${invoice.type === "CREDIT_NOTE" ? "Avoir" : "Facture"}-${invoice.number}.pdf`;
  if (invoice.pdfFile) {
    const archived = await readFile(invoice.pdfFile);
    if (archived) return { pdf: archived, fileName };
  }

  const snapshot =
    (invoice.snapshot as InvoiceSnapshot | null) ??
    buildInvoiceSnapshot({ ...invoice, number: invoice.number }, ctx.settings);
  if (invoice.pdfFile) {
    // L'archive est référencée mais illisible : on sert un rendu de la photographie sans y toucher.
    const pdf = await renderInvoicePdf(snapshot, await loadAssets(ctx.organizationId, snapshot.style));
    return { pdf, fileName };
  }
  const { file, pdf } = await archivePdf(db, ctx, snapshot);
  await db.invoice.updateMany({
    where: { id: invoice.id, pdfFileId: null },
    data: { pdfFileId: file.id, snapshot: snapshot as unknown as Prisma.InputJsonValue },
  });
  return { pdf, fileName };
}
