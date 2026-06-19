import { getProjects, getClientsForSelect } from "@/server/actions/projects";
import { ProjectList } from "@/components/projects/project-list";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    getProjects(),
    getClientsForSelect(),
  ]);

  return <ProjectList projects={projects} clients={clients} />;
}
