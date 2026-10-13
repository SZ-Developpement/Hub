import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/shared/page";

function HeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {withAction ? <Skeleton className="h-8 w-32" /> : null}
    </div>
  );
}

/** Squelette d'une page de liste (barre d'outils + tableau). */
export function TablePageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <PageContainer>
      <HeaderSkeleton />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="hidden h-8 w-40 sm:block" />
      </div>
      <div className="overflow-hidden rounded-xl border">
        <Skeleton className="h-10 rounded-none" />
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-t px-4 py-3.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

/** Squelette d'une fiche de détail (en-tête, contenu principal, colonne latérale). */
export function DetailPageSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="h-4 w-28" />
      <HeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
}

/** Squelette d'une page de formulaire. */
export function FormPageSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="h-4 w-28" />
      <HeaderSkeleton withAction={false} />
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    </PageContainer>
  );
}

/** Squelette d'un onglet de paramètres. */
export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

/** Squelette du tableau de bord (KPI + graphiques). */
export function DashboardSkeleton() {
  return (
    <PageContainer size="wide">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </PageContainer>
  );
}
