"use client";

import * as React from "react";
import { useTransition } from "react";
import { ChevronsUpDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { switchOrganization } from "@/server/actions/organizations";

type OrganizationOption = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
}: {
  organizations: OrganizationOption[];
  activeOrganizationId: string;
}) {
  const { isMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();

  const activeOrg = organizations.find((o) => o.id === activeOrganizationId);

  if (!activeOrg) return null;

  function handleSwitch(organizationId: string) {
    if (organizationId === activeOrganizationId) return;
    startTransition(() => {
      switchOrganization(organizationId);
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              disabled={isPending}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrg.name}</span>
                <span className="truncate text-xs">Organisation active</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organisations
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Building2 className="size-3.5 shrink-0" />
                </div>
                {org.name}
              </DropdownMenuItem>
            ))}
            {organizations.length <= 1 && (
              <>
                <DropdownMenuSeparator />
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Contactez un administrateur pour rejoindre d&apos;autres
                  organisations.
                </p>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
