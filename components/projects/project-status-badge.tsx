import { Badge } from "@/components/ui/badge";
import { ProjectStatus } from "@/generated/prisma/client";

const statusConfig: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  PLANNING: {
    label: "Planification",
    className: "bg-blue-500/10 text-blue-500",
  },
  IN_PROGRESS: {
    label: "En cours",
    className: "bg-amber-500/10 text-amber-500",
  },
  ON_HOLD: { label: "En pause", className: "bg-gray-500/10 text-gray-500" },
  COMPLETED: { label: "Terminé", className: "bg-green-500/10 text-green-500" },
  CANCELLED: { label: "Annulé", className: "bg-red-500/10 text-red-500" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={statusConfig[status].className}>
      {statusConfig[status].label}
    </Badge>
  );
}
