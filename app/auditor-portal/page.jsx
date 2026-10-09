import Link from "next/link";
import { getAuditorDashboardCounts } from "@/app/actions/auditor";
import {
  ShieldCheck,
  UserCheck,
  Building2,
  Briefcase,
  Target,
  Landmark,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default async function AuditorDashboardPage() {
  const counts = await getAuditorDashboardCounts();

  const totalPending =
    counts.investorOnboarding +
    counts.issuerOnboarding +
    counts.projectCreation +
    counts.milestoneReview +
    counts.bankReview;

  const modules = [
    {
      title: "Investor Onboarding",
      description: "Review personal identity, institutional credentials & KYC submissions",
      count: counts.investorOnboarding,
      href: "/auditor-portal/investor-onboarding",
      icon: UserCheck,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-800",
    },
    {
      title: "Issuer Onboarding",
      description: "Corporate entity KYB verifications & trade license reviews",
      count: counts.issuerOnboarding,
      href: "/auditor-portal/issuer-onboarding",
      icon: Building2,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-800",
    },
    {
      title: "Project Creation",
      description: "Approve or reject new funding campaign submissions",
      count: counts.projectCreation,
      href: "/auditor-portal/project-creation",
      icon: Briefcase,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-800",
    },
    {
      title: "Milestone Review",
      description: "Audit deliverable proof & authorize escrow fund releases",
      count: counts.milestoneReview,
      href: "/auditor-portal/milestone-review",
      icon: Target,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-800",
    },
    {
      title: "Bank Details Review",
      description: "Verify settlement bank accounts & payout routing IBANs",
      count: counts.bankReview,
      href: "/auditor-portal/bank-review",
      icon: Landmark,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-800",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-[#059669]" /> Auditor Workstation Summary
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#064e3b]">
            Compliance Overview
          </h1>
          <p className="text-xs text-gray-500">
            Real-time workload metrics across all platform review queues.
          </p>
        </div>

        {/* Total Pending Card */}
        <div className="bg-[#041d16] text-[#fdfbf7] p-4 sm:p-5 rounded-2xl border border-[#059669]/30 flex items-center gap-4 shrink-0 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-300/80 tracking-wider">
              Total Tasks Pending
            </div>
            <div className="text-2xl font-black text-white">
              {totalPending} <span className="text-xs font-normal text-emerald-200/70">items requiring action</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 5 Compliance Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.title}
              className="bg-white rounded-3xl border border-gray-200/80 p-6 flex flex-col justify-between space-y-5 shadow-xs hover:border-emerald-300 transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl ${mod.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`px-3 py-1 rounded-full border text-xs font-extrabold ${mod.color}`}>
                    {mod.count} Pending
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-[#064e3b] group-hover:text-emerald-700 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">
                    {mod.description}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={mod.href}
                  className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all bg-[#041d16] hover:bg-[#062c22] text-white shadow-xs"
                >
                  <span>Open Review Queue</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
