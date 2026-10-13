import { requiredText, z } from "@/lib/validation/zod";

export const MIN_PASSWORD_LENGTH = 10;

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`)
  .max(128);

export const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(1, "Saisissez votre mot de passe."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const setupSchema = z
  .object({
    firstName: requiredText(80),
    lastName: requiredText(80),
    companyName: requiredText(120),
    email: z.email("Adresse e-mail invalide."),
    password,
    passwordConfirm: z.string(),
    setupToken: z.string().max(200),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Les deux mots de passe ne correspondent pas.",
  });
export type SetupValues = z.infer<typeof setupSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel."),
    newPassword: password,
    newPasswordConfirm: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .refine((values) => values.newPassword === values.newPasswordConfirm, {
    path: ["newPasswordConfirm"],
    message: "Les deux mots de passe ne correspondent pas.",
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const profileSchema = z.object({
  name: requiredText(120),
  email: z.email("Adresse e-mail invalide."),
});
export type ProfileValues = z.infer<typeof profileSchema>;
