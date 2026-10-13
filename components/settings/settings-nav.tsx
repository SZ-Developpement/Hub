"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/parametres/entreprise", label: "Entreprise" },
  { href: "/parametres/apparence", label: "Apparence" },
  { href: "/parametres/documents", label: "Documents" },
  { href: "/parametres/facturation", label: "Facturation & légal" },
  { href: "/parametres/comptabilite", label: "Comptabilité" },
  { href: "/parametres/compte", label: "Compte" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections des paramètres" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 border-b md:w-full">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-9 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
