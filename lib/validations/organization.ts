import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  legalName: z.string().max(150).optional().or(z.literal("")),
  siret: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  vatApplicable: z.boolean(),
  vatRate: z.coerce.number().min(0).max(100).optional(),
});

export const newFounderSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
});

export type OrganizationFormValues = z.infer<typeof organizationSchema>;
export type NewFounderFormValues = z.infer<typeof newFounderSchema>;
