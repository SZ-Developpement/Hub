import { BrandMark } from "@/components/layout/brand-mark";
import { getBranding } from "@/lib/branding";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const branding = await getBranding();

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandMark
            appName={branding.appName}
            logoFileId={branding.logoFileId}
            className="size-12 rounded-xl text-base"
          />
          <p className="text-lg font-semibold tracking-tight">{branding.appName}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
