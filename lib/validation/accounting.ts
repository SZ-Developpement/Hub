import { PaymentMethod } from "@/generated/prisma/enums";
import {
  cents,
  id,
  isoDate,
  optionalText,
  positiveCents,
  requiredText,
  z,
} from "@/lib/validation/zod";

export const expenseSchema = z.object({
  id: id.nullable(),
  date: isoDate,
  supplier: requiredText(120),
  label: optionalText(200),
  categoryId: z.string().min(1, "Sélectionnez une catégorie.").max(64),
  amountCents: cents.min(1, "Indiquez un montant."),
  method: z.enum(PaymentMethod),
  notes: optionalText(1000),
});
export type ExpenseValues = z.infer<typeof expenseSchema>;

export const expenseCategorySchema = z.object({
  id: id.nullable(),
  name: requiredText(60),
});

export const declareUrssafSchema = z.object({
  id,
  declaredRevenueCents: positiveCents,
  contributionsCents: positiveCents,
  declaredOn: isoDate,
});
export type DeclareUrssafValues = z.infer<typeof declareUrssafSchema>;

export const payUrssafSchema = z.object({ id, paidOn: isoDate });
