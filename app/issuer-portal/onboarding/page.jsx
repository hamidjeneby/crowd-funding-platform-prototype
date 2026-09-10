import { auth } from "@clerk/nextjs/server";
import { getOnboardingData } from "@/app/actions/issuer-onboarding";
import OnboardingFlow from "./components/OnboardingFlow";
import OrgGate from "@/app/components/auth/OrgGate";
import { redirect } from "next/navigation";

export default async function IssuerOnboardingPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/issuer/sign-in");
  }

  // 1. If user does NOT have an active organization selected, render Organization Creation / Selection UI
  if (!orgId) {
    return (
      <div className="min-h-screen bg-[#fcfaf5] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-[#064e3b]">Issuer Organization Required</h1>
            <p className="mt-2 text-sm text-gray-600">
              Issuers are strictly organization-based. Please select or create an active organization workspace to proceed.
            </p>
          </div>

          <OrgGate
            title="Issuer Organization Required"
            subtitle="To create campaigns and onboard as an Issuer, please select or create your corporate organization."
            redirectUrl="/issuer-portal/onboarding"
          />
        </div>
      </div>
    );
  }

  // 2. User HAS an active organization -> Fetch onboarding data
  let data = { issuer: {}, reps: [], docs: [], needsOrg: false };

  try {
    data = await getOnboardingData();
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
  }

  const isFullyOnboarded =
    data.issuer?.onboarding_status && data.issuer.onboarding_status !== "incomplete";

  // 3. If user HAS an organization AND IS fully onboarded -> Redirect to Dashboard
  if (isFullyOnboarded) {
    redirect("/issuer-portal");
  }

  // 4. User HAS an organization BUT IS NOT fully onboarded -> Render Onboarding Flow
  return (
    <div className="min-h-screen bg-[#fcfaf5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-[#064e3b]">Issuer Onboarding</h1>
          <p className="mt-2 text-sm text-gray-600">
            Please complete your organization onboarding details to access the issuer dashboard.
          </p>
        </div>

        <OnboardingFlow initialData={data} />
      </div>
    </div>
  );
}
