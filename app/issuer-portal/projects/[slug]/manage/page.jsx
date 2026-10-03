import { notFound } from "next/navigation";
import { getIssuerProjectManagementData } from "@/app/actions/issuer-management";
import ProjectManageClient from "./ProjectManageClient";

export default async function ProjectManagementPage({ params }) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const data = await getIssuerProjectManagementData(slug);

  if (!data || data.notFound || data.error) {
    notFound();
  }

  return <ProjectManageClient data={data} />;
}
