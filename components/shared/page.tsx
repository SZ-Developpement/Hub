import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 p-4 md:p-6",
        size === "narrow" && "max-w-3xl",
        size === "default" && "max-w-6xl",
        size === "wide" && "max-w-[1600px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Lien « retour » affiché au-dessus du titre. */
  back?: { href: string; label: string };
  /** Élément placé à droite du titre (badge de statut…). */
  badge?: ReactNode;
  /** Actions alignées à droite. */
  children?: ReactNode;
};

export function PageHeader({ title, description, back, badge, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      {back ? (
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
          <Link href={back.href}>
            <ArrowLeftIcon data-icon="inline-start" />
            {back.label}
          </Link>
        </Button>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
            {badge}
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
        ) : null}
      </div>
    </header>
  );
}

/** Paire libellé / valeur des fiches de détail. */
export function DetailItem({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
