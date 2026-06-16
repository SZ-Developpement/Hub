// components/app-sidebar.tsx
"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { navItems } from "@/lib/data/nav-items";
import { Role } from "@/generated/prisma/client";
import { AudioWaveform } from "lucide-react";
import { Icon } from "../ui/Icon";

export type AppSidebarUser = {
  name: string;
  email: string;
  image?: string | null;
  role: Role;
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: AppSidebarUser;
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="cursor-default hover:bg-transparent active:bg-transparent"
              tabIndex={-1}
            >
              {/* Icon */}
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Icon size={32} />
              </div>
              {/* Description */}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">SZ Hub</span>
                <span className="truncate text-xs">Dashboard App</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={visibleItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
