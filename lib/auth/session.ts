import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { setActiveOrganizationId } from "./organization";

// Récupère la session de l'utilisateur connecté
export async function getSession() {
  // Récupère la session de l'utilisateur connecté en utilisant l'API d'authentification
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

export async function requireAuth() {
  const session = await getSession();

  // Si l'utilisateur n'est pas connecté, on le redirige vers la page de login
  if (!session) {
    redirect("/login");
  }

  // Si le mot de passe doit être changé, on bloque l'accès au reste de l'app
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  return session;
}

// Vérifie que l'utilisateur est un super admin
export async function requireSuperAdmin() {
  // Vérifie que l'utilisateur est connecté et a un mot de passe valide
  const session = await requireAuth();

  // Si l'utilisateur n'est pas un super admin, on le redirige vers le dashboard
  if (!session.user.isSuperAdmin) {
    redirect("/dashboard");
  }

  return session;
}

// Récupère l'ID de l'organisation actuellement active (stocké en cookie)
export async function getActiveOrganizationId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("activeOrganizationId")?.value ?? null;
}

// Récupère le membership courant (org active + rôle de l'utilisateur dedans)
export async function getCurrentMembership() {
  const session = await requireAuth();
  let activeOrgId = await getActiveOrganizationId();

  // Si aucune organisation active n'est en cookie, on cherche la première sans l'écrire ici
  if (!activeOrgId) {
    // Récupère la première organisation dont l'utilisateur est membre, triée par date de création
    const firstMembership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    // Si l'utilisateur n'a aucune organisation, on le redirige vers la page de support
    if (!firstMembership) {
      redirect("/support");
    }

    // On utilise cette organisation pour CETTE requête, sans persister le cookie ici
    activeOrgId = firstMembership.organizationId;
  }

  // Vérifie que l'utilisateur est bien membre de cette organisation active
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: activeOrgId,
        userId: session.user.id,
      },
    },
  });

  // Si l'utilisateur n'est pas membre de l'organisation, on le redirige vers la page de support
  if (!membership) {
    redirect("/support");
  }

  return membership;
}

// Vérifie que l'utilisateur a bien un rôle autorisé dans l'organisation active
export async function requireRole(allowedRoles: Role[]) {
  // Vérifie que l'utilisateur est connecté et a un mot de passe valide
  const membership = await getCurrentMembership();

  // Vérifie que le rôle de l'utilisateur est bien dans la liste des rôles autorisés
  if (!allowedRoles.includes(membership.role)) {
    redirect("/dashboard");
  }

  // Retourne le membership courant (utile pour vérifier le rôle de l'utilisateur dans l'org active)
  return membership;
}

// Liste toutes les organisations dont l'utilisateur connecté est membre
export async function getMyOrganizations() {
  const session = await requireAuth();

  // Récupère toutes les organisations dont l'utilisateur est membre depuis la base de données, incluant les détails de chaque organisation
  return prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
}

// Change l'organisation active (appelée depuis le sélecteur de la sidebar)
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

  await setActiveOrganizationId(organizationId);
  redirect("/dashboard");
}
