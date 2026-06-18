"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { clientSchema, type ClientFormValues } from "@/lib/validations/client";
import { revalidatePath } from "next/cache";
import { generateUniqueClientSlug } from "@/lib/utils/slug";

// Fonction pour récupérer tous les clients
export async function getClients() {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Récupère tous les clients depuis la base de données, triés par date de création décroissante
  return prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      slug: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
  });
}

// Fonction pour récupérer un client par son slug
export async function getClientBySlug(slug: string) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Récupère le client correspondant au slug fourni depuis la base de données, incluant ses projets associés
  return prisma.client.findUnique({
    where: { slug },
    include: { projects: true },
  });
}

// Fonction pour récupérer un client par son ID
export async function getClientById(id: string) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Récupère le client correspondant à l'ID fourni depuis la base de données, incluant ses projets associés
  return prisma.client.findUnique({
    where: { id },
    include: { projects: true },
  });
}

// Fonction pour créer un nouveau client
export async function createClient(values: ClientFormValues) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Valide les données du formulaire en utilisant le schéma défini
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Génère un slug unique pour le client en utilisant son nom
  const slug = await generateUniqueClientSlug(parsed.data.name);

  // Crée un nouveau client dans la base de données avec les données validées et le slug généré
  const client = await prisma.client.create({
    data: { ...parsed.data, slug },
  });

  // Revalide le cache pour la route des clients afin de refléter les changements
  revalidatePath("/dashboard/clients");
  return { data: client };
}

// Fonction pour mettre à jour un client existant
export async function updateClient(id: string, values: ClientFormValues) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Valide les données du formulaire en utilisant le schéma défini
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Met à jour le client existant dans la base de données avec les données validées
  const client = await prisma.client.update({
    where: { id },
    data: parsed.data,
  });

  // Revalide le cache pour la route des clients et la route spécifique du client mis à jour afin de refléter les changements
  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);
  return { data: client };
}

// Fonction pour supprimer un client existant
export async function deleteClient(id: string) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Supprime le client correspondant à l'ID fourni depuis la base de données
  await prisma.client.delete({ where: { id } });

  // Revalide le cache pour la route des clients afin de refléter les changements
  revalidatePath("/dashboard/clients");
}
