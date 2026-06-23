"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import {
  invoiceSchema,
  type InvoiceFormValues,
} from "@/lib/validations/invoice";
import { generateInvoiceNumber } from "@/lib/utils/invoice-number";
import { generateUniqueInvoiceSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { InvoiceType } from "@/generated/prisma/client";

// ============================================
// Lecture
// ============================================

export async function getInvoices(type?: InvoiceType) {
  const membership = await requireRole(["FOUNDER", "ADMIN", "MEMBER"]);

  return prisma.invoice.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true, slug: true } },
      project: { select: { name: true, slug: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getInvoiceBySlug(slug: string) {
  const membership = await requireRole(["FOUNDER", "ADMIN", "MEMBER"]);

  return prisma.invoice.findFirst({
    where: { slug, organizationId: membership.organizationId },
    include: {
      client: true,
      project: true,
      items: { orderBy: { order: "asc" } },
      organization: {
        select: {
          name: true,
          legalName: true,
          siret: true,
          address: true,
          email: true,
          phone: true,
          logoUrl: true,
          vatApplicable: true,
          vatRate: true,
          paymentDelay: true,
        },
      },
    },
  });
}

// ============================================
// Création
// ============================================

export async function createInvoice(values: InvoiceFormValues) {
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  const parsed = invoiceSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { type, clientId, projectId, issuedAt, dueAt, notes, items } =
    parsed.data;

  // Récupère les infos TVA de l'organisation
  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: { vatApplicable: true, vatRate: true },
  });

  const vatRate = organization?.vatApplicable
    ? (organization.vatRate ?? 20)
    : 0;

  // Calcule les totaux
  const totalHT = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const totalTTC = organization?.vatApplicable
    ? totalHT * (1 + vatRate / 100)
    : totalHT;

  // Génère le numéro et le slug
  const number = await generateInvoiceNumber(membership.organizationId, type);
  const slug = await generateUniqueInvoiceSlug(number);

  const invoice = await prisma.invoice.create({
    data: {
      slug,
      number,
      type,
      status: "DRAFT",
      issuedAt: new Date(issuedAt),
      dueAt: dueAt ? new Date(dueAt) : null,
      notes: notes || null,
      totalHT: Math.round(totalHT * 100) / 100,
      vatRate: organization?.vatApplicable ? vatRate : null,
      totalTTC: Math.round(totalTTC * 100) / 100,
      organizationId: membership.organizationId,
      clientId,
      projectId: projectId || null,
      items: {
        create: items.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: Math.round(item.quantity * item.unitPrice * 100) / 100,
          order: index,
        })),
      },
    },
  });

  revalidatePath("/dashboard/invoices");
  return { data: invoice };
}

// ============================================
// Mise à jour
// ============================================

export async function updateInvoice(id: string, values: InvoiceFormValues) {
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  const parsed = invoiceSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { type, clientId, projectId, issuedAt, dueAt, notes, items } =
    parsed.data;

  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: { vatApplicable: true, vatRate: true },
  });

  const vatRate = organization?.vatApplicable
    ? (organization.vatRate ?? 20)
    : 0;
  const totalHT = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const totalTTC = organization?.vatApplicable
    ? totalHT * (1 + vatRate / 100)
    : totalHT;

  // Supprime les anciennes lignes et recrée les nouvelles
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

  const invoice = await prisma.invoice.update({
    where: { id, organizationId: membership.organizationId },
    data: {
      type,
      issuedAt: new Date(issuedAt),
      dueAt: dueAt ? new Date(dueAt) : null,
      notes: notes || null,
      totalHT: Math.round(totalHT * 100) / 100,
      vatRate: organization?.vatApplicable ? vatRate : null,
      totalTTC: Math.round(totalTTC * 100) / 100,
      clientId,
      projectId: projectId || null,
      items: {
        create: items.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: Math.round(item.quantity * item.unitPrice * 100) / 100,
          order: index,
        })),
      },
    },
  });

  revalidatePath("/dashboard/invoices");
  return { data: invoice };
}

// ============================================
// Actions de statut
// ============================================

export async function updateInvoiceStatus(
  id: string,
  status: "SENT" | "PAID" | "CANCELLED",
) {
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  const invoice = await prisma.invoice.update({
    where: { id, organizationId: membership.organizationId },
    data: {
      status,
      ...(status === "PAID" ? { paidAt: new Date() } : {}),
    },
  });

  revalidatePath("/dashboard/invoices");
  return { data: invoice };
}

export async function convertQuoteToInvoice(id: string) {
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  // Récupère le devis
  const quote = await prisma.invoice.findUnique({
    where: { id, organizationId: membership.organizationId },
    include: { items: true },
  });

  if (!quote || quote.type !== "QUOTE") {
    return { error: "Devis introuvable." };
  }

  // Génère un nouveau numéro de facture
  const number = await generateInvoiceNumber(
    membership.organizationId,
    "INVOICE",
  );
  const slug = await generateUniqueInvoiceSlug(number);

  // Crée la facture à partir du devis
  const invoice = await prisma.invoice.create({
    data: {
      slug,
      number,
      type: "INVOICE",
      status: "DRAFT",
      issuedAt: new Date(),
      dueAt: quote.dueAt,
      notes: quote.notes,
      totalHT: quote.totalHT,
      vatRate: quote.vatRate,
      totalTTC: quote.totalTTC,
      organizationId: membership.organizationId,
      clientId: quote.clientId,
      projectId: quote.projectId,
      items: {
        create: quote.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          order: item.order,
        })),
      },
    },
  });

  // Marque le devis comme converti (CANCELLED)
  await prisma.invoice.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/dashboard/invoices");
  return { data: invoice };
}

// ============================================
// Suppression
// ============================================

export async function deleteInvoice(id: string) {
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  await prisma.invoice.delete({
    where: { id, organizationId: membership.organizationId },
  });

  revalidatePath("/dashboard/invoices");
}
