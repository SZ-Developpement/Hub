import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";

// Fonction qui récupère la session de l'utilisateur connecté
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

// Fonction qui vérifie si l'utilisateur est connecté et redirige vers la page de connexion si ce n'est pas le cas
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

// Fonction qui vérifie si l'utilisateur a le rôle requis et redirige vers la page d'accueil si ce n'est pas le cas
export async function requireRole(allowedRoles: Role[]) {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.user.role as Role)) {
    redirect("/dashboard");
  }

  return session;
}
