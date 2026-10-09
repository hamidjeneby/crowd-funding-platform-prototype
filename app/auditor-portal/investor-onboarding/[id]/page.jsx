import { getInvestorOnboardingDetails } from "@/app/actions/auditor";
import InvestorOnboardingDetailClient from "./InvestorOnboardingDetailClient";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default async function InvestorOnboardingDetailPage({ params }) {
  const { id } = await params;

  const data = await getInvestorOnboardingDetails(id);

  if (data.error || !data.investor) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-gray-200/80 rounded-3xl space-y-4 text-center shadow-xs">
        <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
        <h2 className="text-lg font-extrabold text-[#064e3b]">Investor Profile Not Found</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          {data.error || `Unable to locate investor onboarding record #${id}.`}
        </p>
        <div>
          <Link
            href="/auditor-portal/investor-onboarding"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Investor Queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <InvestorOnboardingDetailClient
      investor={data.investor}
      documents={data.documents}
      representatives={data.representatives}
      classAiReview={data.classAiReview}
      error={data.error}
    />
  );
}
