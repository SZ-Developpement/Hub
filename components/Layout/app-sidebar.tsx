"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { navItems, categoryLabels } from "@/lib/data/nav-items";
import { Role } from "@/generated/prisma/client";
import { OrganizationSwitcher } from "./organization-switcher";

export type AppSidebarUser = {
  name: string;
  email: string;
  image?: string | null;
  role: Role;
};

type OrganizationOption = { id: string; name: string; logoUrl: string | null };

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: AppSidebarUser;
  organizations: OrganizationOption[];
  activeOrganizationId: string;
};

export function AppSidebar({
  user,
  organizations,
  activeOrganizationId,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrganizationSwitcher
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
        />
      </SidebarHeader>
      <SidebarContent>
        {Object.entries(navItems).map(([category, items]) => {
          const visibleItems = items.filter((item) =>
            item.roles.includes(user.role),
          );

          if (visibleItems.length === 0) return null;

          return (
            <NavMain
              key={category}
              items={visibleItems}
              category={categoryLabels[category] ?? category}
            />
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
