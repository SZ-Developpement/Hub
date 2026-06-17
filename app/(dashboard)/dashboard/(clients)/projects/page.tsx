// app/(dashboard)/projects/page.tsx
import { getProjects, getClientsForSelect } from "@/server/actions/projects";
import { ProjectList } from "@/components/projects/project-list";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    getProjects(),
    getClientsForSelect(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Projets</h1>
      <ProjectList projects={projects} clients={clients} />
    </div>
  );
}
