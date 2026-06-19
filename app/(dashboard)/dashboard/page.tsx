import { getDashboardStats } from "@/server/actions/dashboard";
import { DashTabs } from "@/components/dashboard/DashTabs";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col gap-8">
      {/* Titre de la section */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Tableau de bord</h1>
          </div>
          {/* Date du jour */}
          <p className="text-sm text-muted-foreground">
            {(() => {
              const dateStr = new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
            })()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mois dernier */}
          <Button variant="outline" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            {(() => {
              const lastMonth = new Date();
              // 1. Sécurité : on se place au 1er jour du mois pour éviter le bug des mois à 30/31 jours
              lastMonth.setDate(1);
              // 2. On recule d'un mois
              lastMonth.setMonth(lastMonth.getMonth() - 1);

              // 3. On génère la chaîne (ex: "mai 2026")
              const monthStr = lastMonth.toLocaleString("fr-FR", {
                month: "long",
                year: "numeric",
              });

              // 4. On met la première lettre en majuscule
              return monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
            })()}
          </Button>

          {/* Télécharger */}
          <Button className="gap-2">Télécharger</Button>
        </div>
      </div>

      <DashTabs stats={stats} />
    </div>
  );
}
