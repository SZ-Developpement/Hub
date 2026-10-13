import {
  BookOpenTextIcon,
  DownloadIcon,
  FileTextIcon,
  GaugeIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  PackageIcon,
  ReceiptTextIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { title: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string | null; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ title: "Tableau de bord", href: "/", icon: LayoutDashboardIcon }],
  },
  {
    label: "Commercial",
    items: [
      { title: "Clients", href: "/clients", icon: UsersIcon },
      { title: "Catalogue", href: "/catalogue", icon: PackageIcon },
      { title: "Pré-devis", href: "/pre-devis", icon: LightbulbIcon },
      { title: "Devis", href: "/devis", icon: FileTextIcon },
      { title: "Factures", href: "/factures", icon: ReceiptTextIcon },
    ],
  },
  {
    label: "Comptabilité",
    items: [
      { title: "Livre des recettes", href: "/comptabilite/recettes", icon: BookOpenTextIcon },
      { title: "Dépenses", href: "/comptabilite/depenses", icon: WalletIcon },
      { title: "URSSAF", href: "/comptabilite/urssaf", icon: LandmarkIcon },
      { title: "Plafonds", href: "/comptabilite/plafonds", icon: GaugeIcon },
      { title: "Exports", href: "/comptabilite/exports", icon: DownloadIcon },
    ],
  },
  {
    label: null,
    items: [{ title: "Paramètres", href: "/parametres", icon: SettingsIcon }],
  },
];

export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
