import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { CSSProperties } from "react";

import { ThemeProvider, ThemeSync } from "@/components/layout/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getBranding } from "@/lib/branding";
import { readableOn } from "@/lib/color";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: { default: branding.appName, template: `%s · ${branding.appName}` },
    description: "Gestion commerciale et comptable : devis, factures, encaissements, URSSAF.",
    // Outil interne : jamais indexé.
    robots: { index: false, follow: false },
    icons: {
      icon: `/api/branding/favicon?v=${branding.faviconFileId ?? branding.accentColor.slice(1)}`,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const branding = await getBranding();
  const theme = branding.theme.toLowerCase();

  const brandStyle = {
    "--brand": branding.accentColor,
    "--brand-foreground": readableOn(branding.accentColor),
  } as CSSProperties;

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={brandStyle}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem
          disableTransitionOnChange
        >
          <ThemeSync theme={theme} />
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
