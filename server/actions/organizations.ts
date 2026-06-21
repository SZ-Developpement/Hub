"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { setActiveOrganizationId } from "@/lib/auth/organization";
import { redirect } from "next/navigation";

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
