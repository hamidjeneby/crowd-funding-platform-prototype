import { notFound } from "next/navigation";
import { getIssuerOnboardingDetails } from "@/app/actions/auditor";
import IssuerOnboardingDetailClient from "./IssuerOnboardingDetailClient";

export default async function IssuerOnboardingDetailPage({ params }) {
  const { id } = await params;
  const data = await getIssuerOnboardingDetails(id);

  if (data.error || !data.issuer) {
    notFound();
  }

  return (
    <IssuerOnboardingDetailClient
      issuer={data.issuer}
      documents={data.documents || []}
      representatives={data.representatives || []}
      error={data.error}
    />
  );
}
