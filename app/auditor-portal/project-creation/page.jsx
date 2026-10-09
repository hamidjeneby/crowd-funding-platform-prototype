"use server";

import ProjectCreationQueueClient from "./ProjectCreationQueueClient";
import { getProjectCreationQueue } from "@/app/actions/auditor";

export default async function ProjectCreationQueuePage() {
  const { projects, error } = await getProjectCreationQueue();

  return <ProjectCreationQueueClient initialProjects={projects || []} initialError={error} />;
}
