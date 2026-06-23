import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

// Mapping des statuts de facture vers leurs labels et classes CSS
const invoiceStatusMap = {
  DRAFT: {
    label: "Brouillon",
    className: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",
    dot: "bg-zinc-400",
  },
  SENT: {
    label: "Envoyé",
    className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    dot: "bg-blue-500",
  },
  OVERDUE: {
    label: "En retard",
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  PAID: {
    label: "Payé",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Annulé",
    className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    dot: "bg-rose-500",
  },
};

// Composant pour afficher les étapes de la facture
interface StepsInvoiceProps {
  statut: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
}

// Composant pour afficher les étapes de la facture
export default function StepsInvoice({ statut }: StepsInvoiceProps) {
  // Typage élargi pour inclure CANCELLED et ainsi corriger l'erreur TS2345
  const statusFlow: ("DRAFT" | "SENT" | "OVERDUE" | "PAID" | "CANCELLED")[] = [
    "DRAFT",
    "SENT",
    "OVERDUE",
    "PAID",
  ];

  // Cas critique : Annulé (CANCELLED) sort du flux linéaire
  if (statut === "CANCELLED") {
    return (
      <div className="bg-card border border-border rounded-xl px-6 py-4 mb-5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">
          Statut du document :
        </span>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${invoiceStatusMap.CANCELLED.className}`}
        >
          {invoiceStatusMap.CANCELLED.label}
        </span>
      </div>
    );
  }

  // Calcul de la progression dans la barre
  let currentStep = statusFlow.indexOf(statut);
  if (statut === "PAID") currentStep = 3; // Force tout le flux à s'allumer si c'est payé

  return (
    <Card className="flex flex-row px-8 items-center gap-0 pt-5">
      {statusFlow
        .filter(
          (s): s is "DRAFT" | "SENT" | "OVERDUE" | "PAID" => s !== "CANCELLED",
        )
        .map((s, i) => {
          const isOverdueStep = s === "OVERDUE";

          let done = i <= currentStep;
          let current = i === currentStep;

          // Ajustements logiques pour l'affichage visuel de l'étape "En retard"
          if (statut === "PAID" && isOverdueStep) {
            done = true;
            current = false;
          }
          if (statut === "SENT" && isOverdueStep) {
            done = false;
            current = false;
          }

          const cfg = invoiceStatusMap[s];

          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    done
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done && !current ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium whitespace-nowrap ${
                    current
                      ? "text-foreground"
                      : done
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Ligne de liaison entre les bulles */}
              {i < 3 && (
                <div
                  className={`flex-1 h-px mx-3 mb-4 transition-colors ${
                    i < currentStep || statut === "PAID"
                      ? "bg-foreground"
                      : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
    </Card>
  );
}
