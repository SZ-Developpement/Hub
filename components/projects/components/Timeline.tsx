import { CheckCircle2, Circle, Clock } from "lucide-react";

export interface Milestone {
  label: string;
  date: string;
  status: "done" | "active" | "todo";
}

export function Timeline({ data }: { data: Milestone[] }) {
  return (
    <div>
      {data.map((m, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                m.status === "done"
                  ? "bg-emerald-100 text-emerald-600"
                  : m.status === "active"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {m.status === "done" ? (
                <CheckCircle2 size={12} />
              ) : m.status === "active" ? (
                <Clock size={12} />
              ) : (
                <Circle size={12} />
              )}
            </div>
            {i < data.length - 1 && (
              <div className="w-px flex-1 bg-border my-1" />
            )}
          </div>
          <div className="pb-5 flex-1">
            <div className="flex items-center justify-between">
              <p
                className={`text-sm font-medium ${m.status === "todo" ? "text-muted-foreground" : "text-foreground"}`}
              >
                {m.label}
              </p>
              <span className="text-xs text-muted-foreground">{m.date}</span>
            </div>
            <span
              className={`text-xs ${
                m.status === "done"
                  ? "text-emerald-600"
                  : m.status === "active"
                    ? "text-blue-600"
                    : "text-muted-foreground"
              }`}
            >
              {m.status === "done"
                ? "Terminé"
                : m.status === "active"
                  ? "En cours"
                  : "À faire"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
