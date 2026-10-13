import { z } from "zod";

import { isValidISODate } from "@/lib/dates";

// Messages d'erreur par défaut en français, pour tous les schémas de l'application.
z.config(z.locales.fr());

export { z };

/** Texte obligatoire, espaces de bord retirés. */
export const requiredText = (max = 200) =>
  z.string().trim().min(1, "Ce champ est obligatoire.").max(max);

/** Texte facultatif (chaîne vide acceptée). */
export const optionalText = (max = 2000) => z.string().trim().max(max);

/** Date calendaire au format AAAA-MM-JJ. */
export const isoDate = z.string().refine(isValidISODate, "Date invalide.");

export const optionalIsoDate = isoDate.nullable();

/** Montant en centimes (entier). */
export const cents = z.int("Montant invalide.");

export const positiveCents = cents.min(0, "Le montant ne peut pas être négatif.");

export const id = z.string().min(1).max(64);

/** Entrée des actions qui ne portent que sur un identifiant. */
export const idSchema = z.object({ id });

export const optionalEmail = z.union([z.literal(""), z.email("Adresse e-mail invalide.")]);

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format attendu : #RRGGBB).");
