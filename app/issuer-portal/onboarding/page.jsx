import { auth } from "@clerk/nextjs/server";
import { getOnboardingData } from "@/app/actions/issuer-onboarding";
import OnboardingFlow from "./components/OnboardingFlow";
import OnboardingHeader from "./components/OnboardingHeader";
import OrgGate from "@/app/components/auth/OrgGate";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

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
            redirectUrl="/issuer-portal"
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

  const rawStatus = (data.issuer?.onboarding_status || "incomplete").toLowerCase().trim();
  const normalized = rawStatus.replace(/[-_]/g, " ").replace(/\s+/g, " ");

  const shouldRedirect =
    normalized.includes("pending") ||
    normalized === "completed" ||
    normalized === "approved" ||
    normalized === "rejected";

  // 3. If user HAS an organization AND status is pending/completed/rejected -> Redirect to Dashboard
  if (shouldRedirect) {
    redirect("/issuer-portal");
  }

  // 4. User HAS an organization BUT IS NOT fully onboarded -> Render Onboarding Flow with Header & Org Switcher
  return (
    <div className="min-h-screen bg-[#fcfaf5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {data.issuer?.review_notes && (
          <div className="mb-8 p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-sm font-extrabold text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Application Sent Back for Revision</span>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
              Following compliance review, your organization's onboarding application was sent back to you so you can make the necessary changes. Please review the auditor notes below and update your details accordingly.
            </p>
            <div className="pt-2 border-t border-amber-200/80 mt-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 block mb-1">
                Auditor Review Notes:
              </span>
              <p className="text-xs font-semibold text-amber-950 bg-amber-100/70 p-3 rounded-xl border border-amber-200/60 whitespace-pre-wrap">
                {data.issuer.review_notes}
              </p>
            </div>
          </div>
        )}

        <OnboardingHeader
          title="Issuer Onboarding"
          subtitle="Please complete your organization onboarding details below. You can switch active workspaces using the workspace switcher on the right."
        />

        <OnboardingFlow initialData={data} />
      </div>
    </div>
  );
}
