import { getAllOrganizations } from "@/server/actions/organizations";
import { Building2, Users, FolderKanban, UsersRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function OrganizationsPage() {
  const organizations = await getAllOrganizations();

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organisations</h1>
          <p className="text-sm text-muted-foreground">
            {organizations.length} organisation(s) enregistrée(s)
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/organizations/new">Nouvelle organisation</Link>
        </Button>
      </div>

      <div className="grid gap-3">
        {organizations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            Aucune organisation pour le moment.
          </p>
        )}

        {organizations.map((org) => (
          <div
            key={org.id}
            className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">{org.name}</p>
                {org.legalName && (
                  <p className="text-xs text-muted-foreground">
                    {org.legalName}
                  </p>
                )}
                {org.siret && (
                  <p className="text-xs text-muted-foreground">
                    SIRET : {org.siret}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <UsersRound size={13} />
                {org._count.members} membre(s)
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} />
                {org._count.clients} client(s)
              </span>
              <span className="flex items-center gap-1.5">
                <FolderKanban size={13} />
                {org._count.projects} projet(s)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
