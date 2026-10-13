import { brandInitials } from "@/lib/brand-initials";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  appName: string;
  logoFileId: string | null;
  /** URL d'aperçu (paramètres d'apparence) prioritaire sur le logo enregistré. */
  previewUrl?: string | null;
  className?: string;
};

/** Logo de l'application, ou monogramme à la couleur d'accent s'il n'y en a pas. */
export function BrandMark({ appName, logoFileId, previewUrl, className }: BrandMarkProps) {
  const src = previewUrl ?? (logoFileId ? `/api/branding/logo?v=${logoFileId}` : null);

  if (src) {
    return (
      // Servi par notre propre route, dimensions libres : next/image n'apporte rien ici.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={appName} className={cn("size-8 shrink-0 object-contain", className)} />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold tracking-tight text-primary-foreground",
        className,
      )}
    >
      {brandInitials(appName)}
    </div>
  );
}
