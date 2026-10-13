import { DownloadIcon, FileTextIcon } from "lucide-react";
import type { Metadata } from "next";

import { FilterSelect } from "@/components/shared/list-controls";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { today } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { param } from "@/lib/list-params";
import { getAnnualSummary, listActiveYears } from "@/lib/server/accounting";
import { getAppContext } from "@/lib/session";

export const metadata: Metadata = { title: "Exports comptables" };

export default async function ExportsPage({ searchParams }: PageProps<"/comptabilite/exports">) {
  const ctx = await getAppContext();
  const todayDate = today();
  const currentYear = todayDate.getUTCFullYear();

  const years = await listActiveYears(ctx.organizationId, todayDate);
  const requested = Number.parseInt(param(await searchParams, "annee") ?? "", 10);
  const year = years.includes(requested) ? requested : currentYear;
  const summary = await getAnnualSummary(ctx.organizationId, ctx.settings, year, todayDate);
  const range = `du=${year}-01-01&au=${year}-12-31`;

  const exports = [
    {
      title: "Récapitulatif annuel",
      description:
        "Synthèse de l'année en un document : recettes par mois, cotisations par période, dépenses par catégorie.",
      links: [{ label: "PDF", href: `/api/export/annuel?annee=${year}`, pdf: true }],
    },
    {
      title: "Livre des recettes",
      description:
        "Registre chronologique des encaissements : date, client, facture, montant et mode de règlement.",
      links: [
        { label: "CSV", href: `/api/export/recettes?${range}&format=csv`, pdf: false },
        { label: "PDF", href: `/api/export/recettes?${range}&format=pdf`, pdf: true },
      ],
    },
    {
      title: "Dépenses",
      description: "Toutes les dépenses de l'année, avec leur catégorie et leur moyen de paiement.",
      links: [{ label: "CSV", href: `/api/export/depenses?${range}`, pdf: false }],
    },
    {
      title: "Cotisations URSSAF",
      description: "Chiffre d'affaires et cotisations de chaque période de déclaration.",
      links: [{ label: "CSV", href: `/api/export/urssaf?annee=${year}`, pdf: false }],
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Exports comptables"
        description="Téléchargez vos données pour votre comptable, votre banque ou vos archives."
      >
        <FilterSelect
          name="annee"
          label="Année"
          allLabel={`Année ${currentYear}`}
          options={years
            .filter((value) => value !== currentYear)
            .map((value) => ({ value: String(value), label: `Année ${value}` }))}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Recettes ${year}`} value={formatMoney(summary.collectedCents)} />
        <StatCard label="Cotisations" value={formatMoney(summary.contributionsCents)} />
        <StatCard label="Dépenses" value={formatMoney(summary.expensesCents)} />
        <StatCard
          label="Bénéfice estimé"
          value={formatMoney(summary.profitCents)}
          hint="Encaissé − cotisations − dépenses"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {exports.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>
                {item.title} {year}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {item.links.map((link) => (
                <Button key={link.label} asChild variant="outline">
                  <a href={link.href} {...(link.pdf ? { target: "_blank", rel: "noreferrer" } : {})}>
                    {link.pdf ? (
                      <FileTextIcon data-icon="inline-start" />
                    ) : (
                      <DownloadIcon data-icon="inline-start" />
                    )}
                    {link.label}
                  </a>
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Les fichiers CSV s&apos;ouvrent directement dans Excel, LibreOffice ou Numbers (séparateur
        point-virgule, décimales à la virgule). Pour une autre période que l&apos;année civile,
        utilisez le filtre de période du livre des recettes ou des dépenses.
      </p>
    </PageContainer>
  );
}
