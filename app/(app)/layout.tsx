import Link from "next/link";
import { Suspense } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AlertsBell } from "@/components/dashboard/alerts";
import { BrandMark } from "@/components/layout/brand-mark";
import { GlobalSearch } from "@/components/layout/global-search";
import { NavUser, NavUserSkeleton } from "@/components/layout/nav-user";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getBranding } from "@/lib/branding";
import { getAlerts } from "@/lib/server/alerts";
import { getAppContext } from "@/lib/session";

async function Brand() {
  const branding = await getBranding();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/">
            <BrandMark
              appName={branding.appName}
              logoFileId={branding.logoFileId}
            />
            <span className="truncate font-semibold tracking-tight">
              {branding.appName}
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

async function CurrentUser() {
  const { user } = await getAppContext();
  return <NavUser user={user} />;
}

async function HeaderAlerts() {
  const ctx = await getAppContext();
  return <AlertsBell alerts={await getAlerts(ctx)} />;
}

/**
 * Coque de l'application. Elle est entièrement statique (menu, logo, couleur d'accent) :
 * elle s'affiche instantanément, et seules les zones propres à l'utilisateur sont
 * diffusées ensuite derrière leurs frontières Suspense.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar
        brand={<Brand />}
        footer={
          <Suspense fallback={<NavUserSkeleton />}>
            <CurrentUser />
          </Suspense>
        }
      />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="mr-1 my-auto data-[orientation=vertical]:h-4"
          />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1">
            <Suspense fallback={null}>
              <HeaderAlerts />
            </Suspense>
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
