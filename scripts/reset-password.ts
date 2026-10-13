/**
 * Réinitialise le mot de passe d'un compte, en ligne de commande.
 *
 * L'application n'envoie aucun e-mail : il n'y a donc pas de « mot de passe oublié ».
 * En cas de perte, lancez ce script avec un accès à la base (DATABASE_URL dans .env) :
 *
 *   pnpm user:reset-password vous@exemple.fr
 *
 * Le nouveau mot de passe est demandé au clavier (jamais passé en argument, pour ne pas
 * rester dans l'historique du shell). Toutes les sessions du compte sont fermées.
 */
import "dotenv/config";

import { createInterface } from "node:readline/promises";

import { hashPassword } from "better-auth/crypto";

import { db } from "@/lib/db";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage : pnpm user:reset-password <e-mail>");
    process.exit(1);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Aucun compte avec l'adresse ${email}.`);
    process.exit(1);
  }

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const password = await readline.question(
    `Nouveau mot de passe pour ${user.name} (${MIN_PASSWORD_LENGTH} caractères minimum) : `,
  );
  readline.close();
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
    process.exit(1);
  }

  const hash = await hashPassword(password);
  const updated = await db.account.updateMany({
    where: { userId: user.id, providerId: "credential" },
    data: { password: hash },
  });
  if (updated.count === 0) {
    console.error("Ce compte n'a pas d'identifiants par mot de passe.");
    process.exit(1);
  }
  const { count } = await db.session.deleteMany({ where: { userId: user.id } });

  console.log(`Mot de passe mis à jour. ${count} session(s) fermée(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
