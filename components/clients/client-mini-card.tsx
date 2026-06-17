import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ClientMiniCardProps {
  id: string;
  name: string;
  email: string | null;
  slug: string;
  _count: { projects: number };
}

export default function ClientMiniCard({
  client,
}: {
  client: ClientMiniCardProps;
}) {
  return (
    <Link key={client.id} href={`/dashboard/clients/${client.slug}`}>
      <Card className="px-4 gap-0">
        <div className="flex flex-row items-center justify-between">
          <p className="font-medium text-base">{client.name}</p>
          <Badge variant="outline">
            {client._count.projects} projet
            {client._count.projects !== 1 ? "" : "s"}
          </Badge>
        </div>
        {client.email && (
          <p className="text-sm text-muted-foreground">{client.email}</p>
        )}
      </Card>
    </Link>
  );
}
