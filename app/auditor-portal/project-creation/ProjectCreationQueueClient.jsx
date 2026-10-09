"use client";

import Link from "next/link";
import {
  Briefcase,
  ChevronRight,
  Clock,
  Building2,
  AlertCircle,
  Target,
  DollarSign,
  Calendar,
} from "lucide-react";

export default function ProjectCreationQueueClient({ initialProjects = [], initialError = null }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
            <Briefcase className="w-4 h-4 text-[#059669]" /> Module Verification
          </div>
          <h1 className="text-2xl font-extrabold text-[#064e3b]">Project Creation Reviews</h1>
          <p className="text-xs text-gray-500">
            Review campaign proposals, financial structures, pitch deck compliance, media, and project milestone deliverables.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-2xl text-xs font-extrabold self-start sm:self-auto">
          {initialProjects.length} Pending Review{initialProjects.length !== 1 ? "s" : ""}
        </div>
      </div>

      {initialError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{initialError}</span>
        </div>
      )}

      {/* Queue List Cards */}
      <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-xs">
        {initialProjects.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <Briefcase className="w-10 h-10 mx-auto text-emerald-600/40" />
            <h3 className="text-sm font-bold text-gray-700">Queue Clear!</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              There are currently no new project creation proposals pending auditor compliance review.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {initialProjects.map((proj) => {
              const issuerName = proj.issuers?.legal_entity_name || `Issuer #${proj.issuer_id}`;
              const formattedGoal = proj.target_goal
                ? `${proj.currency || "AED"} ${Number(proj.target_goal).toLocaleString()}`
                : "N/A";

              return (
                <div
                  key={proj.id}
                  className="p-5 sm:p-6 hover:bg-[#fcfbf7]/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider">
                        <Briefcase className="w-3 h-3 text-blue-600" />
                        <span>Project Proposal</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                      </span>

                      {proj.sharia_contract_type && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase">
                          {proj.sharia_contract_type}
                        </span>
                      )}

                      {proj.pendingMilestoneCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
                          <Target className="w-3.5 h-3.5 text-purple-600" />
                          <span>{proj.pendingMilestoneCount} Pending Milestone{proj.pendingMilestoneCount > 1 ? "s" : ""}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-[#064e3b]">
                        {proj.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {proj.short_summary || proj.description || "No short summary provided."}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                        <span className="font-semibold text-gray-800">Issuer: {issuerName}</span>
                        <span>Target: <strong className="text-emerald-900 font-mono">{formattedGoal}</strong></span>
                        {proj.spv_details && <span className="text-indigo-700 font-semibold">SPV Attached</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <div className="text-left md:text-right text-[11px] text-gray-400">
                      <div>Submitted</div>
                      <div className="font-semibold text-gray-600">
                        {new Date(proj.created_at || Date.now()).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <Link
                      href={`/auditor-portal/project-creation/${proj.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#041d16] hover:bg-[#062c22] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <span>Review Project</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
