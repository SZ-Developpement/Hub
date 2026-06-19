"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";

// Renvoie le premier jour du mois pour une date donnée
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Renvoie le premier jour du mois précédent pour une date donnée
function startOfLastMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

// Calcule un pourcentage de variation entre deux valeurs, avec gestion du cas "départ de zéro"
function computeChange(thisMonth: number, lastMonth: number): number {
  // Si le mois dernier était à 0 :
  // - si ce mois-ci est aussi à 0 → aucun changement réel (0%)
  // - si ce mois-ci est > 0 → toute l'activité est nouvelle, convention standard : +100%
  if (lastMonth === 0) {
    return thisMonth === 0 ? 0 : 100;
  }
  return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
}

export async function getDashboardStats() {
  // Vérifie que l'utilisateur est bien authentifié avant de retourner des données
  await requireAuth();

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfLastMonth(now);

  // Toutes les requêtes sont lancées en parallèle pour limiter le temps de chargement.
  // L'ORDRE des requêtes dans le tableau doit IMPÉRATIVEMENT correspondre
  // à l'ordre des variables dans la destructuration ci-dessous.
  const [
    totalClients, // nombre total de clients en base
    newClientsThisMonth, // clients créés depuis le début du mois en cours
    newClientsLastMonth, // clients créés durant le mois précédent (période complète)
    projectsByStatus, // répartition des projets par statut (PLANNING, IN_PROGRESS, etc.)
    recentClients, // 5 derniers clients créés, pour affichage dans le dashboard
    activeProjects, // 5 derniers projets actuellement IN_PROGRESS
    inProgressThisMonth, // projets passés en IN_PROGRESS ce mois-ci
    inProgressLastMonth, // projets passés en IN_PROGRESS le mois dernier
    completedThisMonth, // projets passés en COMPLETED ce mois-ci
    completedLastMonth, // projets passés en COMPLETED le mois dernier
  ] = await Promise.all([
    // 1. Total clients (tous, sans filtre de date)
    prisma.client.count(),

    // 2. Nouveaux clients depuis le 1er du mois en cours
    prisma.client.count({
      where: { createdAt: { gte: thisMonthStart } },
    }),

    // 3. Nouveaux clients créés durant tout le mois précédent
    prisma.client.count({
      where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
    }),

    // 4. Comptage des projets groupés par statut (PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED)
    prisma.project.groupBy({
      by: ["status"],
      _count: true,
    }),

    // 5. Les 5 clients les plus récemment créés (pour la card "Derniers clients ajoutés")
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        company: true,
        createdAt: true,
      },
    }),

    // 6. Les 5 projets actuellement en cours (pour la card "Projets en cours")
    prisma.project.findMany({
      where: { status: "IN_PROGRESS" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        endDate: true,
        client: { select: { name: true } },
      },
    }),

    // 7. Nombre de projets passés au statut IN_PROGRESS ce mois-ci
    //    (basé sur statusChangedAt, mis à jour uniquement quand le statut change réellement)
    prisma.project.count({
      where: {
        status: "IN_PROGRESS",
        statusChangedAt: { gte: thisMonthStart },
      },
    }),

    // 8. Nombre de projets passés au statut IN_PROGRESS le mois dernier
    prisma.project.count({
      where: {
        status: "IN_PROGRESS",
        statusChangedAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),

    // 9. Nombre de projets passés au statut COMPLETED ce mois-ci
    prisma.project.count({
      where: {
        status: "COMPLETED",
        statusChangedAt: { gte: thisMonthStart },
      },
    }),

    // 10. Nombre de projets passés au statut COMPLETED le mois dernier
    prisma.project.count({
      where: {
        status: "COMPLETED",
        statusChangedAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),
  ]);

  // Transforme le tableau groupBy en objet { STATUS: count } pour un accès direct
  // ex: statusCounts["IN_PROGRESS"] au lieu de chercher dans un tableau
  const statusCounts = projectsByStatus.reduce(
    (acc, item) => {
      acc[item.status] = item._count;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    totalClients,

    newClientsThisMonth,
    newClientsChange: computeChange(newClientsThisMonth, newClientsLastMonth),

    statusCounts,

    inProgressCount: statusCounts["IN_PROGRESS"] ?? 0,
    inProgressChange: computeChange(inProgressThisMonth, inProgressLastMonth),

    completedCount: statusCounts["COMPLETED"] ?? 0,
    completedChange: computeChange(completedThisMonth, completedLastMonth),

    recentClients,
    activeProjects,
  };
}

// Type exporté pour typer les props reçues par les composants (DashTabs, Overview, etc.)
export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
