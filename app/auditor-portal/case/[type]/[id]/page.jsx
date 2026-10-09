import { getAuditorCaseDetails } from "@/app/actions/auditor";
import AuditorCaseDetailClient from "./AuditorCaseDetailClient";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default async function AuditorCaseDetailPage({ params }) {
  const { type, id } = await params;

  const caseData = await getAuditorCaseDetails(type, id);

  if (caseData.error || !caseData.entity) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-gray-200/80 rounded-3xl space-y-4 text-center shadow-xs">
        <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
        <h2 className="text-lg font-extrabold text-[#064e3b]">Case Not Found</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          {caseData.error || `Unable to locate ${type} case record #${id}.`}
        </p>
        <div>
          <Link
            href="/auditor-portal"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Review Queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuditorCaseDetailClient
      type={type}
      id={id}
      entity={caseData.entity}
      aiReview={caseData.aiReview}
      documents={caseData.documents}
      media={caseData.media}
      projectTimeline={caseData.projectTimeline}
      error={caseData.error}
    />
  );
}
