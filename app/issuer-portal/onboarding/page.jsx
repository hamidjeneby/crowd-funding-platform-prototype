import { getOnboardingData } from "@/app/actions/issuer-onboarding";
import OnboardingFlow from "./components/OnboardingFlow";
import OrgGate from "@/app/components/auth/OrgGate";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default async function IssuerOnboardingPage() {
  let data = { issuer: {}, reps: [], docs: [], needsOrg: false };

  try {
    data = await getOnboardingData();
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
  }

  const isPendingReview =
    data.issuer.onboarding_status && data.issuer.onboarding_status !== "incomplete";

  if (isPendingReview) {
    return (
      <div className="min-h-screen bg-[#fcfaf5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center bg-white p-10 rounded-xl shadow-lg border border-[#064e3b]/10">
          <CheckCircle className="mx-auto h-16 w-16 text-[#064e3b] mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Under Review</h1>
          <p className="text-gray-600 mb-8">
            Your onboarding has been completed and is under review. We will notify you once the review process is complete.
          </p>
          <Link
            href="/issuer-portal"
            className="inline-flex justify-center items-center py-3 px-6 border border-transparent rounded-md shadow-sm text-md font-medium text-white bg-[#064e3b] hover:bg-[#064e3b]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#064e3b] transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfaf5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-[#064e3b]">Issuer Onboarding</h1>
          <p className="mt-2 text-sm text-gray-600">
            Issuers are strictly organization-based. Please select or create an active organization workspace to proceed.
          </p>
        </div>

        <OrgGate
          title="Issuer Organization Required"
          subtitle="To create campaigns and onboard as an Issuer, please select or create your corporate organization."
        >
          <OnboardingFlow initialData={data} />
        </OrgGate>
      </div>
    </div>
  );
}
