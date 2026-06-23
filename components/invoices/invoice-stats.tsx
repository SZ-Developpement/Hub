import { getInvoiceStats } from "@/server/actions/invoices";
import { CheckCircle2, Clock, FileText, Activity } from "lucide-react";

export default async function InvoiceStats() {
  const stats = await getInvoiceStats();

  const statCards = [
    {
      label: "CA encaissé",
      value: `${stats.paidAmount.toLocaleString("fr-FR")} €`,
      sub: `${stats.invoiceCount} facture${stats.invoiceCount > 1 ? "s" : ""} payée${stats.invoiceCount > 1 ? "s" : ""}`,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      label: "En attente",
      value: `${stats.pendingAmount.toLocaleString("fr-FR")} €`,
      sub: "à recevoir",
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: "Brouillons",
      value: String(stats.draftCount),
      sub: stats.draftCount > 1 ? "non envoyés" : "non envoyé",
      icon: FileText,
      color: "text-zinc-500",
    },
    {
      label: "Total documents",
      value: String(stats.totalDocuments),
      sub: "factures et devis",
      icon: Activity,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {statCards.map((s) => (
        <div
          key={s.label}
          className="bg-card border border-border rounded-xl px-5 py-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              {s.label}
            </p>
            <s.icon size={14} className={s.color} />
          </div>
          <p className="text-xl font-bold text-foreground">{s.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}
