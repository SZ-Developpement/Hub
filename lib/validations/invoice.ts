import { z } from "zod";

export const invoiceItemSchema = z.object({
  id: z.string().optional(), // présent si édition d'une ligne existante
  description: z.string().min(1, "La description est requise"),
  quantity: z.coerce.number().min(0.01, "La quantité doit être positive"),
  unitPrice: z.coerce
    .number()
    .min(0, "Le prix unitaire ne peut pas être négatif"),
});

export const invoiceSchema = z.object({
  type: z.enum(["QUOTE", "INVOICE"]),
  clientId: z.string().min(1, "Le client est requis"),
  projectId: z.string().optional().or(z.literal("")),
  issuedAt: z.string().min(1, "La date d'émission est requise"),
  dueAt: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  items: z.array(invoiceItemSchema).min(1, "Au moins une ligne est requise"),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>;
