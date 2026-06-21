import { requireAuth, getCurrentMembership } from "@/lib/auth/session";
import {
  AppSidebar,
  type AppSidebarUser,
} from "@/components/Layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardBreadcrumb } from "@/components/Layout/dashboard-breadcrumb";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAuth();
  const membership = await getCurrentMembership();

  const sidebarUser: AppSidebarUser = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: membership.role,
  };

  return (
    <SidebarProvider>
      <AppSidebar user={sidebarUser} />
      <SidebarInset>
        <header className="fixed w-full flex h-12 shrink-0 items-center gap-2 ease-linear">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center justify-start gap-2">
              <SidebarTrigger className="-ml-1" />

              <div className="h-4 w-px mr-2 bg-border/80" />
              <DashboardBreadcrumb />
            </div>
          </div>
        </header>
        <div className="min-h-screen flex flex-1 flex-col gap-4 p-4 pt-16">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
