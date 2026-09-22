import { notFound } from "next/navigation";
import { getInvestorPortalData } from "@/app/actions/investor-portal";
import { getProjectDetailBySlug, checkInvestEligibility, parseInvestorClass } from "@/app/actions/marketplace";
import ProjectDetailClient from "./ProjectDetailClient";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const project = await getProjectDetailBySlug(slug, 1);

  if (!project) {
    return {
      title: "Project Not Found",
    };
  }

  return {
    title: `${project.title} | Investment Details`,
    description: project.summary || "View project funding details and financial terms.",
  };
}

export default async function ProtectedProjectDetailPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const investorData = await getInvestorPortalData();
  const investorClassNum = await parseInvestorClass(investorData?.investor_class);

  const project = await getProjectDetailBySlug(slug, investorClassNum);

  if (!project) {
    notFound();
  }

  const eligibility = await checkInvestEligibility(project, investorClassNum, investorData?.id);

  return (
    <ProjectDetailClient
      project={project}
      investor={investorData}
      investorClass={investorClassNum}
      eligibility={eligibility}
    />
  );
}
