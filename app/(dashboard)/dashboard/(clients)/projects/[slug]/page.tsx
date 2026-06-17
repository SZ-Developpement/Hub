// app/(dashboard)/projects/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getProjectBySlug } from "@/server/actions/projects";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectDetailActions } from "@/components/projects/project-detail-actions";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, session] = await Promise.all([
    getProjectBySlug(slug),
    getSession(),
  ]);

  if (!project) {
    notFound();
  }

  const canEdit =
    session?.user.role === "FOUNDER" || session?.user.role === "ADMIN";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.client && (
            <Link
              href={`/clients/${project.client.slug}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {project.client.name}
            </Link>
          )}
        </div>
        {canEdit && <ProjectDetailActions project={project} />}
      </div>

      {project.description && (
        <p className="mt-4 text-sm">{project.description}</p>
      )}

      <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
        {project.startDate && (
          <p>Début : {project.startDate.toLocaleDateString("fr-FR")}</p>
        )}
        {project.endDate && (
          <p>Fin prévue : {project.endDate.toLocaleDateString("fr-FR")}</p>
        )}
      </div>
    </div>
  );
}
