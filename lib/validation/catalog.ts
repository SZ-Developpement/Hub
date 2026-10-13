import { Unit } from "@/generated/prisma/enums";
import { id, optionalText, positiveCents, requiredText, z } from "@/lib/validation/zod";

export const serviceSchema = z.object({
  id: id.nullable(),
  name: requiredText(160),
  description: optionalText(1000),
  categoryId: id.nullable(),
  unit: z.enum(Unit),
  unitPriceCents: positiveCents,
});
export type ServiceValues = z.infer<typeof serviceSchema>;

export const categorySchema = z.object({
  id: id.nullable(),
  name: requiredText(60),
});
export type CategoryValues = z.infer<typeof categorySchema>;
