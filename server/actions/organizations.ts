"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { setActiveOrganizationId } from "@/lib/auth/organization";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/auth/session";
import { generateTempPassword } from "@/lib/utils/password";

export async function switchOrganization(organizationId: string) {
  const session = await requireAuth();

  // Vérifie que l'utilisateur est bien membre de cette organisation avant de switcher
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
  });

  // Si l'utilisateur n'est pas membre de l'organisation, on lance une erreur
  if (!membership) {
    throw new Error("Vous n'êtes pas membre de cette organisation.");
  }

  // Définit l'organisation active pour l'utilisateur en stockant l'ID de l'organisation dans un cookie
  await setActiveOrganizationId(organizationId);
  redirect("/dashboard");
}

// Liste toutes les organisations dont l'utilisateur connecté est membre
export async function getMyOrganizations() {
  const session = await requireAuth();

  // Récupère toutes les organisations dont l'utilisateur est membre depuis la base de données, incluant les détails de chaque organisation
  return prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
  });
}

// Crée un nouvel utilisateur et l'assigne comme FOUNDER à l'organisation spécifiée
export async function createUserAndAssignFounder(
  organizationId: string,
  data: { firstName: string; lastName: string; email: string },
) {
  // Vérifie que l'utilisateur connecté est un super admin avant de créer un nouvel utilisateur
  await requireSuperAdmin();

  // Génère un mot de passe temporaire pour le nouvel utilisateur
  const tempPassword = generateTempPassword(data.firstName, data.lastName);

  // Création du compte via l'API admin de Better Auth, côté serveur, sans session
  const newUser = await auth.api.createUser({
    body: {
      email: data.email,
      password: tempPassword,
      name: `${data.firstName} ${data.lastName}`,
      role: "user",
    },
  });

  // mustChangePassword n'est pas settable via createUser (input: false), on le met à jour après coup
  await prisma.user.update({
    where: { id: newUser.user.id },
    data: { mustChangePassword: true },
  });

  // Rattache ce nouvel utilisateur à l'organisation en tant que FOUNDER
  await prisma.organizationMember.create({
    data: {
      organizationId,
      userId: newUser.user.id,
      role: "FOUNDER",
    },
  });

  return { tempPassword, userId: newUser.user.id };
}
