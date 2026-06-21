import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Si le mot de passe doit être changé, on bloque l'accès au reste de l'app
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAuth();

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
  const activeOrgId = await getActiveOrganizationId();

  // Si aucune organisation active, on redirige vers la page de support (cas limite)
  if (!activeOrgId) {
    redirect("/support"); // aucune organisation active, cas limite déjà discuté
  }

  // Vérifie que l'utilisateur est bien membre de l'organisation active
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: activeOrgId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    redirect("/support"); // utilisateur pas membre de cette organisation
  }

  // Retourne le membership courant (utile pour vérifier le rôle de l'utilisateur dans l'org active)
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
