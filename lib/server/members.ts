import "server-only";

import { generateId } from "better-auth";
import { hashPassword } from "better-auth/crypto";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { removeFile } from "@/lib/server/files";
import type { AssignableRole } from "@/lib/validation/members";

/** Membres de l'organisation, le plus ancien (le propriétaire) en premier. */
export function listMembers(organizationId: string) {
  return db.member.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          sessions: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { updatedAt: true },
          },
        },
      },
    },
  });
}

export type MemberInput = {
  name: string;
  email: string;
  password: string;
  role: AssignableRole;
};

/**
 * Crée le compte d'un membre et le rattache à l'organisation. L'inscription publique
 * étant désactivée, c'est le propriétaire qui crée les comptes et transmet le mot de
 * passe provisoire.
 */
export async function createMember(
  organizationId: string,
  input: MemberInput,
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  try {
    await db.$transaction(async (tx) => {
      const userId = generateId();
      await tx.user.create({
        data: { id: userId, name: input.name.trim(), email },
      });
      await tx.account.create({
        data: {
          id: generateId(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
        },
      });
      await tx.member.create({
        data: { organizationId, userId, role: input.role },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Un compte existe déjà avec cette adresse e-mail.");
    }
    throw error;
  }
}

/** Membre de l'organisation que le propriétaire peut modifier : jamais le propriétaire lui-même. */
async function manageableMember(organizationId: string, memberId: string) {
  const member = await db.member.findFirst({
    where: { id: memberId, organizationId },
    select: {
      id: true,
      role: true,
      userId: true,
      user: { select: { image: true } },
    },
  });
  if (!member) throw new AppError("Ce membre n'existe plus.");
  if (member.role === "OWNER") {
    throw new AppError(
      "Le compte propriétaire ne peut être ni modifié ni retiré.",
    );
  }
  return member;
}

export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  role: AssignableRole,
): Promise<void> {
  const member = await manageableMember(organizationId, memberId);
  await db.member.update({ where: { id: member.id }, data: { role } });
}

/** Remplace le mot de passe d'un membre et ferme toutes ses sessions. */
export async function resetMemberPassword(
  organizationId: string,
  memberId: string,
  password: string,
): Promise<void> {
  const member = await manageableMember(organizationId, memberId);
  const passwordHash = await hashPassword(password);

  await db.$transaction(async (tx) => {
    const updated = await tx.account.updateMany({
      where: { userId: member.userId, providerId: "credential" },
      data: { password: passwordHash },
    });
    if (updated.count === 0) {
      throw new AppError("Ce compte n'a pas d'identifiants par mot de passe.");
    }
    await tx.session.deleteMany({ where: { userId: member.userId } });
  });
}

/**
 * Retire un membre : son compte est supprimé, avec ses sessions et ses identifiants
 * (cascade). Il est déconnecté à sa prochaine requête et son adresse redevient libre.
 */
export async function removeMember(
  organizationId: string,
  memberId: string,
): Promise<void> {
  const member = await manageableMember(organizationId, memberId);
  await db.user.delete({ where: { id: member.userId } });

  const image = member.user.image;
  if (image?.startsWith("/api/files/")) {
    await removeFile(organizationId, image.slice("/api/files/".length));
  }
}
