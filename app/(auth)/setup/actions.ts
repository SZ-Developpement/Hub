"use server";

import { timingSafeEqual } from "node:crypto";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";

import type { ActionResult } from "@/lib/action";
import { auth } from "@/lib/auth";
import { BRANDING_TAG } from "@/lib/branding";
import { AppError } from "@/lib/errors";
import { createOwnerAccount } from "@/lib/server/organization";
import { setupSchema, type SetupValues } from "@/lib/validation/auth";
import { z } from "@/lib/validation/zod";

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setupAccount(raw: SetupValues): Promise<ActionResult> {
  const parsed = setupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Certains champs sont invalides.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  const values = parsed.data;

  // Verrou optionnel : si SETUP_TOKEN est défini, il faut le connaître pour créer le compte.
  const expectedToken = process.env.SETUP_TOKEN;
  if (expectedToken && !tokenMatches(values.setupToken, expectedToken)) {
    return {
      ok: false,
      error: "Code de configuration incorrect.",
      fieldErrors: { setupToken: ["Code de configuration incorrect."] },
    };
  }

  try {
    await createOwnerAccount(values);
    await auth.api.signInEmail({
      body: { email: values.email, password: values.password, rememberMe: true },
      headers: await headers(),
    });
    updateTag(BRANDING_TAG);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "La configuration a échoué. Réessayez." };
  }

  redirect("/");
}
