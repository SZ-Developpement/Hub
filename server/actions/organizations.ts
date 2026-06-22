"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireAuth, requireSuperAdmin } from "@/lib/auth/session";
import { setActiveOrganizationId } from "@/lib/auth/organization";
import { generateTempPassword } from "@/lib/utils/password";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateUniqueOrganizationSlug } from "@/lib/utils/slug";

// ============================================
// Lecture
// ============================================

// Récupère les organisations dont l'utilisateur est membre
export async function getMyOrganizations() {
  const session = await requireAuth();

  return prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
}

// Récupère toutes les organisations (super-admin only)
export async function getAllOrganizations() {
  await requireSuperAdmin();

  return prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, clients: true, projects: true } },
    },
  });
}

// Recherche d'utilisateurs existants (pour le formulaire de désignation du FOUNDER)
export async function searchUsers(query: string) {
  await requireSuperAdmin();

  // Si la requête est vide ou trop courte, on retourne un tableau vide
  if (!query || query.length < 2) return [];

  // Recherche les utilisateurs dont le nom ou l'email contient la requête (insensible à la casse), et limite le résultat à 10 utilisateurs
  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, image: true },
    take: 10,
  });
}

// ============================================
// Switch d'organisation
// ============================================

// Change l'organisation active (appelée depuis le sélecteur de la sidebar)
export async function switchOrganization(organizationId: string) {
  const session = await requireAuth();

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
  });

  // Si l'utilisateur n'est pas membre de l'organisation, on lève une erreur
  if (!membership) {
    throw new Error("Vous n'êtes pas membre de cette organisation.");
  }

  await setActiveOrganizationId(organizationId);
  redirect("/dashboard");
}

// ============================================
// Création d'organisation (super-admin only)
// ============================================

// Type pour les données de création d'organisation
type CreateOrganizationInput = {
  name: string;
  legalName?: string;
  siret?: string;
  address?: string;
  email?: string;
  phone?: string;
  vatApplicable: boolean;
  vatRate?: number;
};

// Type pour les données du FOUNDER (compte existant ou nouveau)
type FounderInput =
  | { mode: "existing"; userId: string }
  | { mode: "new"; firstName: string; lastName: string; email: string };

// Crée une nouvelle organisation et rattache un FOUNDER (compte existant ou nouveau)
export async function createOrganization(
  orgData: CreateOrganizationInput,
  founder: FounderInput,
) {
  await requireSuperAdmin();

  const slug = await generateUniqueOrganizationSlug(orgData.name);

  // Crée l'organisation
  const organization = await prisma.organization.create({
    data: {
      name: orgData.name,
      slug,
      legalName: orgData.legalName || null,
      siret: orgData.siret || null,
      address: orgData.address || null,
      email: orgData.email || null,
      phone: orgData.phone || null,
      vatApplicable: orgData.vatApplicable,
      vatRate: orgData.vatRate || null,
    },
  });

  // Variable pour stocker le mot de passe temporaire si un nouveau compte est créé
  let tempPassword: string | null = null;

  // Rattache le FOUNDER (compte existant ou nouveau)
  if (founder.mode === "existing") {
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: founder.userId,
        role: "FOUNDER",
      },
    });
  } else {
    tempPassword = generateTempPassword(founder.firstName, founder.lastName);

    // Crée un nouveau compte utilisateur pour le FOUNDER
    const newUser = await auth.api.createUser({
      body: {
        email: founder.email,
        password: tempPassword,
        name: `${founder.firstName} ${founder.lastName}`,
        role: "user",
      },
    });

    // Marque le mot de passe comme devant être changé à la première connexion
    await prisma.user.update({
      where: { id: newUser.user.id },
      data: { mustChangePassword: true },
    });

    // Rattache le nouveau compte utilisateur à l'organisation en tant que FOUNDER
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: newUser.user.id,
        role: "FOUNDER",
      },
    });
  }

  revalidatePath("/admin/organizations");

  return { organization, tempPassword };
}
