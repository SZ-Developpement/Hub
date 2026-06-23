import { NavMainItem } from "@/components/Layout/nav-main";
import { Role } from "@/generated/prisma/client";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  UserCog,
  FileText,
} from "lucide-react";

export type NavItem = NavMainItem & {
  category?: string;
  roles: Role[];
};

export const categoryLabels: Record<string, string> = {
  dashboard: "Vue d'ensemble",
  gestion: "Gestion",
  finance: "Finance",
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
  gestion: [
    {
      title: "Clients",
      url: "/dashboard/clients",
      icon: Users,
      roles: ["FOUNDER", "ADMIN"],
    },
    {
      title: "Projets",
      url: "/dashboard/projects",
      icon: FolderKanban,
      roles: ["FOUNDER", "ADMIN", "MEMBER"],
    },
  ],
  finance: [
    {
      title: "Factures & Devis",
      url: "/dashboard/invoices",
      icon: FileText,
      roles: ["FOUNDER", "ADMIN"],
    },
  ],
  admin: [
    {
      title: "Utilisateurs",
      url: "/dashboard/admin/users",
      icon: UserCog,
      roles: ["FOUNDER", "ADMIN"],
    },
    {
      title: "Équipe",
      url: "/dashboard/admin/team",
      icon: Users,
      roles: ["FOUNDER"],
    },
  ],
};
