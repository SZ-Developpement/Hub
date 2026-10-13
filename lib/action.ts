import "server-only";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import type { MemberRole } from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { getAppContext, type AppContext } from "@/lib/session";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Options = {
  /** Rafraîchit le routeur client après succès (par défaut). */
  refresh?: boolean;
  /** Rôles autorisés ; tous les membres par défaut. */
  roles?: readonly MemberRole[];
};

/** Rôles pouvant modifier les paramètres de l'organisation. */
export const ADMIN_ROLES = ["OWNER", "ADMIN"] as const satisfies readonly MemberRole[];

function assertRole(ctx: AppContext, options: Options): void {
  if (options.roles && !options.roles.includes(ctx.role)) {
    throw new AppError("Vous n'avez pas les droits nécessaires pour cette action.");
  }
}

function failure(error: unknown): ActionResult<never> {
  // Laisse passer redirect(), notFound() et consorts.
  unstable_rethrow(error);
  if (error instanceof AppError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Une erreur inattendue est survenue. Réessayez." };
}

/**
 * Enveloppe d'une Server Action : vérifie la session, valide l'entrée avec Zod,
 * traduit les erreurs métier en message affichable et rafraîchit le routeur.
 *
 * Une action reste un point d'entrée HTTP public : l'authentification et la
 * validation ont lieu ici, à chaque appel, jamais seulement côté formulaire.
 */
export function action<Schema extends z.ZodType, Result = void>(
  schema: Schema,
  handler: (input: z.output<Schema>, ctx: AppContext) => Promise<Result>,
  options: Options = {},
) {
  return async (raw: z.input<Schema>): Promise<ActionResult<Result>> => {
    try {
      const ctx = await getAppContext();
      assertRole(ctx, options);
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const flat = z.flattenError(parsed.error);
        return {
          ok: false,
          error: flat.formErrors[0] ?? "Certains champs sont invalides.",
          fieldErrors: flat.fieldErrors as Record<string, string[]>,
        };
      }
      const data = await handler(parsed.data, ctx);
      if (options.refresh !== false) refresh();
      return { ok: true, data };
    } catch (error) {
      return failure(error);
    }
  };
}

/** Variante pour les envois de fichiers (multipart) : l'entrée est un FormData. */
export function formAction<Result = void>(
  handler: (formData: FormData, ctx: AppContext) => Promise<Result>,
  options: Options = {},
) {
  return async (formData: FormData): Promise<ActionResult<Result>> => {
    try {
      const ctx = await getAppContext();
      assertRole(ctx, options);
      const data = await handler(formData, ctx);
      if (options.refresh !== false) refresh();
      return { ok: true, data };
    } catch (error) {
      return failure(error);
    }
  };
}
