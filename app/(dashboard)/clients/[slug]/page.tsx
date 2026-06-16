import { notFound } from "next/navigation";
import { getClientBySlug } from "@/server/actions/clients";
import { ClientDetailActions } from "@/components/clients/client-detail-actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);

  if (!client) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.company && (
            <p className="text-muted-foreground">{client.company}</p>
          )}
        </div>
        <ClientDetailActions client={client} />
      </div>

      <div className="mt-6 grid gap-2 text-sm">
        {client.email && <p>Email : {client.email}</p>}
        {client.phone && <p>Téléphone : {client.phone}</p>}
        {client.notes && <p>Notes : {client.notes}</p>}
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-2">
        Projets ({client.projects.length})
      </h2>
      {client.projects.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun projet associé.</p>
      ) : (
        <ul className="space-y-1">
          {client.projects.map((project) => (
            <li key={project.id}>{project.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
