import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

function trustedOrigins(): string[] {
  const origins = new Set<string>();
  if (process.env.BETTER_AUTH_URL) origins.add(process.env.BETTER_AUTH_URL);
  // Domaines fournis par Vercel (production et déploiements de prévisualisation).
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) origins.add(`https://${host}`);
  }
  return [...origins];
}

export const auth = betterAuth({
  appName: "SZ Dev Hub",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: trustedOrigins(),
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Application interne : aucun compte ne peut être créé depuis l'API publique.
    // Le premier compte est créé par /setup (voir lib/server/organization.ts).
    disableSignUp: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: 128,
  },
  user: {
    changeEmail: {
      enabled: true,
      // Pas d'envoi d'e-mail dans l'application : le changement est immédiat,
      // protégé par la session en cours.
      updateEmailWithoutVerification: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 300, max: 10 },
      "/change-password": { window: 300, max: 10 },
    },
  },
  // Doit rester le dernier plugin : il recopie les cookies posés par Better Auth
  // dans la réponse des Server Actions.
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
