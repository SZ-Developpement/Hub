import { NavMainItem } from "@/components/Layout/nav-main";
import { Role } from "@/generated/prisma/client";
import { LayoutDashboard, Users, FolderKanban, UserCog } from "lucide-react";

export type NavItem = NavMainItem & {
  category?: string;
  roles: Role[];
};

export const categoryLabels: Record<string, string> = {
  dashboard: "Vue d'ensemble",
  admin: "Administration",
};

export const navItems: Record<string, NavItem[]> = {
  dashboard: [
    {
      title: "Vue d'ensemble",
      url: "/dashboard",
      icon: LayoutDashboard,
      roles: ["FOUNDER", "ADMIN", "MEMBER"],
    },
  ],
  admin: [
    {
      title: "Utilisateurs",
      url: "/dashboard/admin/users",
      icon: Users,
      roles: ["FOUNDER", "ADMIN"],
    },
    {
      title: "Projets",
      url: "/dashboard/admin/projects",
      icon: FolderKanban,
      roles: ["FOUNDER", "ADMIN"],
    },
    {
      title: "Équipe",
      url: "/dashboard/admin/team",
      icon: UserCog,
      roles: ["FOUNDER", "ADMIN"],
    },
  ],
};
