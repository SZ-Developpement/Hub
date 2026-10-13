"use server";

import { action } from "@/lib/action";
import {
  addReminder,
  createCreditNote,
  createInvoiceDraft,
  deleteInvoiceDraft,
  deletePayment,
  deleteReminder,
  duplicateInvoice,
  issueInvoice,
  recordPayment,
  updateInvoiceDraft,
} from "@/lib/server/invoices";
import {
  creditNoteSchema,
  invoiceSchema,
  issueInvoiceSchema,
  paymentSchema,
  reminderSchema,
  updateInvoiceSchema,
} from "@/lib/validation/documents";
import { idSchema } from "@/lib/validation/zod";

export const createInvoice = action(invoiceSchema, async (values, ctx) => {
  const invoice = await createInvoiceDraft(ctx, values);
  return { id: invoice.id };
});

export const updateInvoice = action(updateInvoiceSchema, async ({ id, ...values }, ctx) => {
  await updateInvoiceDraft(ctx, id, values);
});

export const deleteInvoice = action(idSchema, async ({ id }, ctx) => {
  await deleteInvoiceDraft(ctx, id);
});

export const duplicateInvoiceAction = action(idSchema, async ({ id }, ctx) => {
  const copy = await duplicateInvoice(ctx, id);
  return { id: copy.id };
});

export const issueInvoiceAction = action(issueInvoiceSchema, async ({ id, issueDate }, ctx) => {
  return issueInvoice(ctx, id, issueDate);
});

export const recordPaymentAction = action(paymentSchema, async (values, ctx) => {
  await recordPayment(ctx, values);
});

export const deletePaymentAction = action(idSchema, async ({ id }, ctx) => {
  await deletePayment(ctx, id);
});

export const addReminderAction = action(reminderSchema, async (values, ctx) => {
  await addReminder(ctx, values);
});

export const deleteReminderAction = action(idSchema, async ({ id }, ctx) => {
  await deleteReminder(ctx, id);
});

export const createCreditNoteAction = action(creditNoteSchema, async (values, ctx) => {
  return createCreditNote(ctx, values);
});
