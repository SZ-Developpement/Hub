import {
  LucideIcon,
  TrendingUp,
  TrendingDown,
  TrendingUpDown,
} from "lucide-react";

export function StatCard({
  title,
  value,
  icon: Icon,
  pourcentage, // Exemple : "+20.1%" ou "-5%"
  text, // Exemple : "depuis janvier 2026"
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  pourcentage?: string;
  text?: string;
}) {
  // 1. On détecte la tendance dynamiquement en analysant la chaîne de caractères
  let trendColor = "text-muted-foreground";
  let TrendIconComponent = TrendingUpDown;

  if (pourcentage) {
    if (pourcentage.startsWith("+")) {
      trendColor = "text-emerald-600";
      TrendIconComponent = TrendingUp;
    } else if (pourcentage.startsWith("-")) {
      trendColor = "text-red-600";
      TrendIconComponent = TrendingDown;
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon size={16} className="text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold text-foreground">{value}</p>

        {pourcentage ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
            <TrendIconComponent size={12} className={trendColor} />
            <span className={`${trendColor} font-medium`}>{pourcentage}</span>
            <span>{text}</span>
          </p>
        ) : (
          text && <p className="text-xs text-muted-foreground">{text}</p>
        )}
      </div>
    </div>
  );
}
