"use client";

import { unstable_rethrow } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/action";

type RunOptions<T> = {
  /** Message du toast de succès. */
  success?: string;
  onSuccess?: (data: T) => void;
  onError?: (result: Extract<ActionResult<T>, { ok: false }>) => void;
};

/**
 * Exécute une Server Action dans une transition : expose l'état d'attente et
 * affiche le résultat dans un toast.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T>(call: () => Promise<ActionResult<T>>, options: RunOptions<T> = {}) => {
      startTransition(async () => {
        let result: ActionResult<T>;
        try {
          result = await call();
        } catch (error) {
          // Une action qui se termine par redirect() rejette sa promesse côté client :
          // ce n'est pas un échec, le routeur a déjà navigué.
          unstable_rethrow(error);
          toast.error("La requête a échoué. Vérifiez votre connexion et réessayez.");
          return;
        }
        if (!result.ok) {
          toast.error(result.error);
          options.onError?.(result);
          return;
        }
        if (options.success) toast.success(options.success);
        options.onSuccess?.(result.data);
      });
    },
    [],
  );

  return { pending, run };
}

/** Reporte dans le formulaire les erreurs de champ renvoyées par le serveur. */
export function applyFieldErrors<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  result: { fieldErrors?: Record<string, string[]> },
): void {
  for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
    if (messages?.[0]) {
      form.setError(name as Path<Values>, { type: "server", message: messages[0] });
    }
  }
}
