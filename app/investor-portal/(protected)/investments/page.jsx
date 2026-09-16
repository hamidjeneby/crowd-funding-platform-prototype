import { Briefcase, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function MyInvestmentsPage() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 flex flex-col justify-between">
      <div className="border-b border-[#059669]/15 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
          <ShieldCheck className="w-4 h-4" /> Portfolio Management
        </div>
        <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
          My Active Investments
        </h1>
        <p className="text-sm text-[#064e3b]/70 mt-0.5">
          Detailed breakdown of your individual pledges, contracts, and share certificates.
        </p>
      </div>

      <div className="my-auto py-16 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 border border-[#059669]/20 flex items-center justify-center text-[#059669] shadow-inner">
          <Briefcase className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" /> Coming Soon
          </span>
          <h2 className="text-3xl font-black text-[#064e3b]">
            Investments View Under Construction
          </h2>
          <p className="text-sm text-[#064e3b]/70 leading-relaxed">
            Your detailed position ledger, dividend payment schedule, and security transfer tools will be available here shorty.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/investor-portal"
            className="px-5 py-2.5 rounded-xl bg-[#064e3b] text-white font-semibold text-sm hover:bg-[#047857] transition-all shadow-md"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="border-t border-[#059669]/10 pt-4 text-center text-xs text-gray-500">
        Position tracking powered by smart asset records.
      </div>
    </div>
  );
}
