import { Briefcase, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function MyInvestmentsPage() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 flex flex-col justify-between">
      {/* Header */}
      <div className="border-b border-[#059669]/15 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
          <ShieldCheck className="w-4 h-4" /> Portfolio Management
        </div>
        <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
          My Active Investments
        </h1>
        <p className="text-sm text-[#064e3b]/70 mt-0.5">
          Detailed breakdown of your individual pledges, contracts, and active investment positions.
        </p>
      </div>

      {/* Empty State */}
      <div className="my-auto py-16 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100/80 border border-[#059669]/20 flex items-center justify-center text-[#059669] shadow-xs">
          <Briefcase className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#064e3b]">
            No Active Investments Yet
          </h2>
          <p className="text-sm text-[#064e3b]/70 leading-relaxed">
            You haven't made any investments or pledges yet. Explore open campaigns in the marketplace to start building your portfolio.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/investor-portal/marketplace"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#064e3b] text-white font-semibold text-sm hover:bg-[#047857] transition-all shadow-md hover:shadow-lg"
          >
            Go to Marketplace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer Note */}
      <div className="border-t border-[#059669]/10 pt-4 text-center text-xs text-gray-500">
        Position tracking powered by smart asset records.
      </div>
    </div>
  );
}
