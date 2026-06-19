import { Badge } from "@/components/ui/badge";
import { ClientStatus } from "@/generated/prisma/client";

const statusConfig: Record<ClientStatus, { label: string; className: string }> =
  {
    ACTIF: {
      label: "Actif",
      className: "bg-emerald-50 text-emerald-700 border-emerald-700/20",
    },
    INACTIF: {
      label: "Inactif",
      className: "bg-zinc-100 text-zinc-500 border-zinc-500/20",
    },
    PROSPECT: {
      label: "Prospect",
      className: "bg-sky-50 text-sky-700 border-sky-700/20",
    },
  };

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <Badge variant="outline" className={statusConfig[status].className}>
      {statusConfig[status].label}
    </Badge>
  );
}
