import { z } from "zod";

export const clientSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis").max(50),
  lastName: z.string().min(1, "Le nom est requis").max(50),
  company: z.string().max(100).optional().or(z.literal("")),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
