import { ProjectStatus } from "@/generated/prisma/client";
import Link from "next/link";
import { ProjectStatusBadge } from "./project-status-badge";
import { Card } from "@/components/ui/card";

export interface ProjectMiniCardProps {
  id: string;
  slug: string;
  name: string;
  status: ProjectStatus;
  description: string | null;
  client: { name: string } | null;
  createdAt: Date;
}

export default function ProjectMiniCard({
  project,
}: {
  project: ProjectMiniCardProps;
}) {
  return (
    <Link key={project.id} href={`/dashboard/projects/${project.slug}`}>
      <Card className="px-4 gap-0">
        <div className="flex flex-row items-center justify-between">
          <p className="font-medium text-base">{project.name}</p>
          <ProjectStatusBadge status={project.status} />
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
      </Card>
    </Link>
  );
}
