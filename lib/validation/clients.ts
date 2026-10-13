import { ClientType } from "@/generated/prisma/enums";
import { id, optionalEmail, optionalText, requiredText, z } from "@/lib/validation/zod";

export const clientSchema = z.object({
  type: z.enum(ClientType),
  name: requiredText(160),
  siret: z
    .string()
    .trim()
    .refine((value) => value === "" || /^(\d{9}|\d{14})$/.test(value.replace(/\s/g, "")), {
      message: "Saisissez un SIREN (9 chiffres) ou un SIRET (14 chiffres).",
    }),
  vatNumber: optionalText(20),
  contactName: optionalText(120),
  contactRole: optionalText(80),
  email: optionalEmail,
  phone: optionalText(30),
  addressLine1: optionalText(160),
  addressLine2: optionalText(160),
  postalCode: optionalText(12),
  city: optionalText(80),
  country: optionalText(60),
  /** Délai de paiement spécifique ; `null` = délai par défaut. */
  paymentTermDays: z.int().min(0).max(120, "120 jours maximum.").nullable(),
  notes: optionalText(4000),
});
export type ClientValues = z.infer<typeof clientSchema>;

export const updateClientSchema = clientSchema.extend({ id });

export const EMPTY_CLIENT: ClientValues = {
  type: "COMPANY",
  name: "",
  siret: "",
  vatNumber: "",
  contactName: "",
  contactRole: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "France",
  paymentTermDays: null,
  notes: "",
};
