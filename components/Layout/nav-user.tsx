"use client";

import { BadgeCheck, Bell, ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}) {
  const { isMobile } = useSidebar();

  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onRequest: () => {
          setIsLoggingOut(true);
        },
        onSuccess: () => {
          setIsLoggingOut(false);
          router.push("/login");
          router.refresh();
        },
        onError: (ctx) => {
          setIsLoggingOut(false);
          console.error("Erreur lors de la déconnexion:", ctx.error);
        },
      },
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8">
                {user.avatar ? (
                  <AvatarImage
                    src={user.avatar}
                    alt={user.name || "Utilisateur"}
                  />
                ) : (
                  <AvatarFallback className="rounded-lg bg-gray-300 text-black border border-border">
                    {user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.name || "Utilisateur"}
                </span>
                <span className="truncate text-xs">
                  {user.email || "utilisateur@example.com"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8">
                  {user.avatar ? (
                    <AvatarImage
                      src={user.avatar}
                      alt={user.name || "Utilisateur"}
                    />
                  ) : (
                    <AvatarFallback className="rounded-lg bg-gray-300 text-black border border-border">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="grid flex-1 text-black text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name || "Utilisateur"}
                  </span>
                  <span className="truncate text-xs">
                    {user.email || "utilisateur@example.com"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut />
              {isLoggingOut ? "Déconnexion..." : "Se déconnecter"}{" "}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
