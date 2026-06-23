import { Badge } from "@/components/ui/badge";
import { InvoiceStatus } from "@/generated/prisma/client";

const statusConfig: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Brouillon", className: "bg-gray-500/10 text-gray-500" },
  SENT: { label: "Envoyé", className: "bg-blue-500/10 text-blue-500" },
  PAID: { label: "Payé", className: "bg-green-500/10 text-green-500" },
  OVERDUE: { label: "En retard", className: "bg-red-500/10 text-red-500" },
  CANCELLED: { label: "Annulé", className: "bg-orange-500/10 text-orange-500" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="outline" className={statusConfig[status].className}>
      {statusConfig[status].label}
    </Badge>
  );
}
