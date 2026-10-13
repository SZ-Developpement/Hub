import type { MemberRole } from "@/generated/prisma/enums";
import { passwordSchema } from "@/lib/validation/auth";
import { id, requiredText, z } from "@/lib/validation/zod";

/** Rôles attribuables : le propriétaire est unique, créé à la première configuration. */
export const ASSIGNABLE_ROLES = [
  "ADMIN",
  "MEMBER",
] as const satisfies readonly MemberRole[];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const role = z.enum(ASSIGNABLE_ROLES);

export const memberSchema = z.object({
  name: requiredText(120),
  email: z.email("Adresse e-mail invalide."),
  /** Mot de passe provisoire, à transmettre à la personne. */
  password: passwordSchema,
  role,
});
export type MemberValues = z.infer<typeof memberSchema>;

export const memberRoleSchema = z.object({ id, role });

export const memberPasswordSchema = z.object({ id, password: passwordSchema });
export type MemberPasswordValues = z.infer<typeof memberPasswordSchema>;
