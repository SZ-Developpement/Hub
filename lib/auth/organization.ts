"use server";

import { cookies } from "next/headers";

// Nom du cookie pour stocker l'ID de l'organisation active
const COOKIE_NAME = "activeOrganizationId";

// Récupère l'ID de l'organisation actuellement active (stocké en cookie)
export async function getActiveOrganizationId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

// Définit l'ID de l'organisation active (stocké en cookie)
export async function setActiveOrganizationId(organizationId: string) {
  // Définit le cookie avec l'ID de l'organisation active
  const cookieStore = await cookies();
  // Définit le cookie avec l'ID de l'organisation active
  cookieStore.set(COOKIE_NAME, organizationId, {
    httpOnly: true, // Le cookie n'est pas accessible via JavaScript côté client
    secure: process.env.NODE_ENV === "production", // Le cookie est sécurisé en production (HTTPS)
    sameSite: "lax", // Le cookie est envoyé avec les requêtes de même site et les requêtes de navigation de niveau supérieur
    path: "/", // Le cookie est accessible sur tout le site
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });
}
