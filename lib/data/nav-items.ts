import { NavMainItem } from "@/components/Layout/nav-main";
import { Role } from "@/generated/prisma/client";
import { LayoutDashboard, Users, FolderKanban, UserCog } from "lucide-react";

export type NavItem = NavMainItem & {
  roles: Role[];
};

export const navItems: NavItem[] = [
  {
    title: "Vue d'ensemble",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["FOUNDER", "ADMIN", "MEMBER"],
  },
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
  {
    title: "Équipe",
    url: "/dashboard/team",
    icon: UserCog,
    roles: ["FOUNDER"],
  },
];
