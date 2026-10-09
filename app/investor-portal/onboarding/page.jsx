import { getOnboardingData, setInvestorType } from "@/app/actions/investor-onboarding";
import OnboardingFlow from "./components/OnboardingFlow";
import TypeSelector from "./components/TypeSelector";
import OrgGate from "@/app/components/auth/OrgGate";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AlertTriangle } from "lucide-react";

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

  const rawStatus = (data.investor?.onboarding_status || "incomplete").toLowerCase().trim();
  const normalized = rawStatus.replace(/[-_]/g, " ").replace(/\s+/g, " ");

  const shouldRedirect =
    normalized.includes("pending") ||
    normalized === "completed" ||
    normalized === "approved" ||
    normalized === "rejected";

  if (shouldRedirect) {
    redirect("/investor-portal");
  }

  // If type is not set, show the type selector
  if (!data.investor.type) {
    return <TypeSelector />;
  }

  return (
    <div className="min-h-screen bg-[#fcfaf5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {data.investor?.review_notes && (
          <div className="mb-8 p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-sm font-extrabold text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Application Sent Back for Revision</span>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
              Following compliance review, your onboarding application was sent back to you so you can make the necessary changes. Please review the auditor notes below and update your details accordingly.
            </p>
            <div className="pt-2 border-t border-amber-200/80 mt-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 block mb-1">
                Auditor Review Notes:
              </span>
              <p className="text-xs font-semibold text-amber-950 bg-amber-100/70 p-3 rounded-xl border border-amber-200/60 whitespace-pre-wrap">
                {data.investor.review_notes}
              </p>
            </div>
          </div>
        )}

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
