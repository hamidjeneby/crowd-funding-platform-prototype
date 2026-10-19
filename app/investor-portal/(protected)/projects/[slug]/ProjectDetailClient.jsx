"use client";

import ProjectDetailView from "@/app/components/projects/ProjectDetailView";

export default function ProjectDetailClient({
  project,
  investor,
  investorClass,
  eligibility,
  classBandSubscription,
  conversionDemand,
}) {
  return (
    <ProjectDetailView
      project={project}
      investor={investor}
      investorClass={investorClass}
      eligibility={eligibility}
      classBandSubscription={classBandSubscription}
      conversionDemand={conversionDemand}
      viewerRole="investor"
    />
  );
}
