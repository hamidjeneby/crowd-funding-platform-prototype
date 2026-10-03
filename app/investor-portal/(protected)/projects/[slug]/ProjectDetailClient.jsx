"use client";

import ProjectDetailView from "@/app/components/projects/ProjectDetailView";

export default function ProjectDetailClient({
  project,
  investor,
  investorClass,
  eligibility,
}) {
  return (
    <ProjectDetailView
      project={project}
      investor={investor}
      investorClass={investorClass}
      eligibility={eligibility}
      viewerRole="investor"
    />
  );
}
