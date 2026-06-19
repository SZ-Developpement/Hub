import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  description: z.string().max(1000).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum([
    "PLANNING",
    "IN_PROGRESS",
    "ON_HOLD",
    "COMPLETED",
    "CANCELLED",
  ]),
  clientId: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
