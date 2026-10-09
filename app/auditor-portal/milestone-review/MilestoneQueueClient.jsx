"use client";

import Link from "next/link";
import {
  Target,
  ChevronRight,
  Clock,
  Building2,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function MilestoneQueueClient({ initialMilestones = [], initialError = null }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
            <Target className="w-4 h-4 text-[#059669]" /> Module Verification
          </div>
          <h1 className="text-2xl font-extrabold text-[#064e3b]">Project Milestone Reviews</h1>
          <p className="text-xs text-gray-500">
            Audit milestone deliverables, proof documentation, and authorize tranche releases for projects.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-2xl text-xs font-extrabold self-start sm:self-auto">
          {initialMilestones.length} Pending Review{initialMilestones.length !== 1 ? "s" : ""}
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
        {initialMilestones.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <Target className="w-10 h-10 mx-auto text-emerald-600/40" />
            <h3 className="text-sm font-bold text-gray-700">Queue Clear!</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              There are currently no project milestones pending auditor verification. High-confidence AI reviews are processed automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {initialMilestones.map((m) => {
              const projectTitle = m.projects?.title || `Project #${m.project_id}`;
              const issuerName = m.projects?.issuers?.legal_entity_name || "N/A";

              return (
                <div
                  key={m.id}
                  className="p-5 sm:p-6 hover:bg-[#fcfbf7]/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                        <Target className="w-3 h-3 text-amber-600" />
                        <span>Milestone Deliverable</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                      </span>

                      {m.target_amount && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold">
                          AED {Number(m.target_amount).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-[#064e3b]">
                        {m.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {m.description || "No milestone description specified."}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                        <span className="font-bold text-gray-800">Project: {projectTitle}</span>
                        <span>Issuer: {issuerName}</span>
                        {m.target_date && <span>Target Date: {m.target_date}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <div className="text-left md:text-right text-[11px] text-gray-400">
                      <div>Submitted</div>
                      <div className="font-semibold text-gray-600">
                        {new Date(m.created_at || Date.now()).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <Link
                      href={`/auditor-portal/project-creation/${m.project_id}?tab=milestones`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#041d16] hover:bg-[#062c22] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <span>Review Milestones</span>
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
