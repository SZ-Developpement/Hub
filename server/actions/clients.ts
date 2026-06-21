"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { clientSchema, type ClientFormValues } from "@/lib/validations/client";
import { revalidatePath } from "next/cache";
import { generateUniqueClientSlug } from "@/lib/utils/slug";
import { buildClientName } from "@/lib/utils/client-name";

// Fonction pour récupérer tous les clients
export async function getClients() {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  // Récupère tous les clients depuis la base de données, triés par date de création décroissante
  return prisma.client.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      company: true,
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
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  // Récupère le client correspondant au slug fourni depuis la base de données, incluant ses projets associés
  return prisma.client.findFirst({
    where: { slug, organizationId: membership.organizationId },
    include: { projects: true },
  });
}

// Fonction pour récupérer un client par son ID
export async function getClientById(id: string) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  // Récupère le client correspondant à l'ID fourni depuis la base de données, incluant ses projets associés
  return prisma.client.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: { projects: true },
  });
}

// Fonction pour créer un nouveau client
export async function createClient(values: ClientFormValues) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  // Valide les données du formulaire en utilisant le schéma défini
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Construit le nom complet du client à partir du prénom et du nom de famille
  const name = buildClientName(parsed.data.firstName, parsed.data.lastName);
  const slug = await generateUniqueClientSlug(name);

  // Crée un nouveau client dans la base de données avec les données validées et le slug généré
  const client = await prisma.client.create({
    data: {
      name,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      company: parsed.data.company || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
      slug,
      organizationId: membership.organizationId,
    },
  });

  // Revalide le cache pour la route des clients afin de refléter les changements
  revalidatePath("/dashboard/clients");
  return { data: client };
}

// Fonction pour mettre à jour un client existant
export async function updateClient(id: string, values: ClientFormValues) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  // Valide les données du formulaire en utilisant le schéma défini
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Met à jour le client existant dans la base de données avec les données validées
  const client = await prisma.client.update({
    where: { id, organizationId: membership.organizationId },
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
  const membership = await requireRole(["FOUNDER", "ADMIN"]);

  // Supprime le client correspondant à l'ID fourni depuis la base de données
  await prisma.client.delete({
    where: { id, organizationId: membership.organizationId },
  });

  // Revalide le cache pour la route des clients afin de refléter les changements
  revalidatePath("/dashboard/clients");
}
