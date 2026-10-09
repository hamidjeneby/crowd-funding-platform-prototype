"use server";

import { getProjectCreationDetails } from "@/app/actions/auditor";
import ProjectDetailReviewClient from "./ProjectDetailReviewClient";

export default async function ProjectDetailReviewPage({ params }) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  const data = await getProjectCreationDetails(projectId);

  if (data.error || !data.project) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
          {data.error || "Project creation details not found."}
        </div>
      </div>
    );
  }

  return (
    <ProjectDetailReviewClient
      project={data.project}
      spvDetails={data.spvDetails}
      issuer={data.issuer}
      documents={data.documents || []}
      media={data.media || []}
      minVisClassAiReview={data.minVisClassAiReview}
      milestones={data.milestones || []}
      error={data.error}
    />
  );
}
