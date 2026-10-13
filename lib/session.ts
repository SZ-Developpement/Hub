import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import type { Settings } from "@/generated/prisma/client";
import type { MemberRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDailySync } from "@/lib/server/sync";

/** Session Better Auth de la requête en cours (dédupliquée par requête). */
export const getSession = cache(async () => {
  // La session se lit toujours à la requête : jamais dans un squelette prérendu ou préchargé.
  await connection();
  return auth.api.getSession({ headers: await headers() });
});

export type AppContext = {
  user: { id: string; name: string; email: string; image: string | null };
  sessionToken: string;
  organizationId: string;
  role: MemberRole;
  settings: Settings;
};

/**
 * Contexte applicatif : utilisateur authentifié, organisation et paramètres.
 *
 * Point de passage obligé de chaque page, action et route protégée : redirige vers
 * /login sans session valide. Toutes les requêtes métier doivent ensuite être
 * filtrées par `organizationId`.
 */
export const getAppContext = cache(async (): Promise<AppContext> => {
  const context = await getOptionalContext();
  if (!context) redirect("/login");
  return context;
});

/**
 * Même contexte, sans redirection : renvoie `null` si la requête n'est pas authentifiée.
 * Pour les routes d'API, qui répondent 401 au lieu de rediriger.
 */
export const getOptionalContext = cache(async (): Promise<AppContext | null> => {
  const session = await getSession();
  if (!session) return null;

  const member = await db.member.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { organization: { include: { settings: true } } },
  });
  const settings = member?.organization.settings;
  if (!member || !settings) {
    throw new Error("Ce compte n'est rattaché à aucune organisation.");
  }

  await ensureDailySync(member.organization, settings);

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
    sessionToken: session.session.token,
    organizationId: member.organizationId,
    role: member.role,
    settings,
  };
});
