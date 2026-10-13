"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { isActivePath, NAV_GROUPS } from "@/components/layout/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

function NavGroups({ pathname }: { pathname: string | null }) {
  const { setOpenMobile } = useSidebar();

  return (
    <>
      {NAV_GROUPS.map((group, index) => (
        <SidebarGroup key={group.label ?? index}>
          {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActivePath(pathname, item.href)}
                  >
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function ActiveNavGroups() {
  return <NavGroups pathname={usePathname()} />;
}

export function AppSidebar({ brand, footer }: { brand: ReactNode; footer: ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>{brand}</SidebarHeader>
      <SidebarContent>
        {/* Le chemin courant n'est connu qu'à la requête : le squelette statique
            affiche le même menu, sans élément actif. */}
        <Suspense fallback={<NavGroups pathname={null} />}>
          <ActiveNavGroups />
        </Suspense>
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
