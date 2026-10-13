import "server-only";

import { generateId } from "better-auth";
import { hashPassword } from "better-auth/crypto";

import { db } from "@/lib/db";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_SERVICE_CATEGORIES } from "@/lib/defaults";
import { AppError } from "@/lib/errors";
import { DEFAULT_NUMBERING, DOCUMENT_KINDS } from "@/lib/numbering";

export async function isAppConfigured(): Promise<boolean> {
  return (await db.user.count()) > 0;
}

export type OwnerAccountInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
};

/**
 * Première configuration : crée le compte propriétaire, son organisation et les
 * réglages de départ. Refusée dès qu'un compte existe — c'est l'unique porte
 * d'entrée pour créer un compte, l'inscription publique étant désactivée.
 */
export async function createOwnerAccount(input: OwnerAccountInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const name = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const passwordHash = await hashPassword(input.password);

  await db.$transaction(async (tx) => {
    // Sérialise deux configurations concurrentes.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(727001)`;
    if ((await tx.user.count()) > 0) {
      throw new AppError("L'application est déjà configurée. Connectez-vous.");
    }

    const userId = generateId();
    await tx.user.create({ data: { id: userId, name, email } });
    await tx.account.create({
      data: {
        id: generateId(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      },
    });

    const organization = await tx.organization.create({ data: { name: input.companyName } });
    await tx.member.create({
      data: { organizationId: organization.id, userId, role: "OWNER" },
    });
    await tx.settings.create({
      data: {
        organizationId: organization.id,
        companyName: input.companyName,
        appName: input.companyName,
        email,
        ownerFirstName: input.firstName.trim(),
        ownerLastName: input.lastName.trim(),
      },
    });
    await tx.numberingFormat.createMany({
      data: DOCUMENT_KINDS.map((kind) => ({
        organizationId: organization.id,
        kind,
        ...DEFAULT_NUMBERING[kind],
      })),
    });
    await tx.serviceCategory.createMany({
      data: DEFAULT_SERVICE_CATEGORIES.map((categoryName, position) => ({
        organizationId: organization.id,
        name: categoryName,
        position,
      })),
    });
    await tx.expenseCategory.createMany({
      data: DEFAULT_EXPENSE_CATEGORIES.map((categoryName, position) => ({
        organizationId: organization.id,
        name: categoryName,
        position,
      })),
    });
  });
}
