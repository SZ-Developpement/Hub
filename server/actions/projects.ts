"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import {
  projectSchema,
  type ProjectFormValues,
} from "@/lib/validations/project";
import { generateUniqueProjectSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";

// Fonction pour récupérer tous les projets
export async function getProjects() {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN", "MEMBER"]);

  // Récupère tous les projets depuis la base de données, triés par date de création décroissante
  return prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { name: true } } },
  });
}

// Fonction pour récupérer un projet par son slug
export async function getProjectBySlug(slug: string) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN", "MEMBER"]);

  // Récupère le projet correspondant au slug fourni depuis la base de données, incluant le client associé
  return prisma.project.findUnique({
    where: { slug },
    include: { client: true },
  });
}

// Fonction pour récupérer un projet par son ID
export async function createProject(values: ProjectFormValues) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Valide les données du formulaire en utilisant le schéma défini
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Génère un slug unique pour le projet en utilisant son nom
  const slug = await generateUniqueProjectSlug(parsed.data.name);

  // Crée un nouveau projet dans la base de données avec les données validées et le slug généré
  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      status: parsed.data.status,
      clientId: parsed.data.clientId || null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      slug,
    },
  });

  // Revalide le chemin "/dashboard/projects" pour mettre à jour le cache et refléter les changements
  revalidatePath("/dashboard/projects");
  return { data: project };
}

// Fonction pour mettre à jour un projet existant
export async function updateProject(id: string, values: ProjectFormValues) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Valide les données du formulaire en utilisant le schéma défini
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Met à jour le projet existant dans la base de données avec les données validées
  const project = await prisma.project.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      status: parsed.data.status,
      clientId: parsed.data.clientId || null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    },
  });

  // Revalide le chemin "/dashboard/projects" pour mettre à jour le cache et refléter les changements
  revalidatePath("/dashboard/projects");
  return { data: project };
}

// Fonction pour supprimer un projet existant
export async function deleteProject(id: string) {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Supprime le projet correspondant à l'ID fourni depuis la base de données
  await prisma.project.delete({ where: { id } });

  // Revalide le chemin "/dashboard/projects" pour mettre à jour le cache et refléter les changements
  revalidatePath("/dashboard/projects");
}

// Fonction pour récupérer tous les projets pour un menu déroulant
export async function getClientsForSelect() {
  // Vérifie si l'utilisateur a le rôle requis pour accéder à cette action
  await requireRole(["FOUNDER", "ADMIN"]);

  // Récupère tous les clients depuis la base de données, en sélectionnant uniquement l'ID et le nom, triés par nom croissant
  return prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
