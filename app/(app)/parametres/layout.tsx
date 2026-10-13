import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/shared/page";
import { SettingsNav } from "@/components/settings/settings-nav";

export const metadata: Metadata = { title: "Paramètres" };

export default function SettingsLayout({ children }: LayoutProps<"/parametres">) {
  return (
    <PageContainer size="wide" className="max-w-7xl">
      <PageHeader
        title="Paramètres"
        description="Identité de l'entreprise, apparence, documents, mentions légales et comptabilité."
      />
      <Suspense fallback={<div className="h-9 border-b" />}>
        <SettingsNav />
      </Suspense>
      {children}
    </PageContainer>
  );
}
