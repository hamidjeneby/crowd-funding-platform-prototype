import { getOnboardingData, setInvestorType } from "@/app/actions/investor-onboarding";
import OnboardingFlow from "./components/OnboardingFlow";
import TypeSelector from "./components/TypeSelector";
import OrgGate from "@/app/components/auth/OrgGate";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function InvestorOnboardingPage({ searchParams }) {
  const { orgId } = await auth();
  const params = await searchParams;

  let data = { investor: {}, reps: [], docs: [] };
  
  try {
    data = await getOnboardingData();
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
  }

  // If organization exists or ?type=institutional was passed, auto-select institutional type
  if ((orgId || params?.type === "institutional") && (!data.investor.type || data.investor.type !== "institutional")) {
    try {
      await setInvestorType("institutional");
      data = await getOnboardingData();
    } catch (err) {
      console.error("Error setting investor type to institutional:", err);
      data.investor.type = "institutional";
    }
  }

  const isPendingReview = data.investor.onboarding_status && data.investor.onboarding_status !== "incomplete";

  if (isPendingReview) {
    redirect("/investor-portal");
  }

  // If type is not set, show the type selector
  if (!data.investor.type) {
    return <TypeSelector />;
  }

  return (
    <div className="min-h-screen bg-[#fcfaf5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-[#064e3b]">
            {data.investor.type === "individual" ? "Individual" : "Institutional"} Investor Onboarding
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Please complete the following sections to set up your account.
          </p>
        </div>
        
        {data.investor.type === "institutional" ? (
          <OrgGate
            title="Institutional Organization Required"
            subtitle="Institutional investor accounts must be linked to an active organization workspace. Please select or create your organization."
            redirectUrl="/investor-portal"
          >
            <OnboardingFlow initialData={data} type={data.investor.type} />
          </OrgGate>
        ) : (
          <OnboardingFlow initialData={data} type={data.investor.type} />
        )}
      </div>
    </div>
  );
}
