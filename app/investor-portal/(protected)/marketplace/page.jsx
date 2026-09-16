import { Store, Sparkles, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 flex flex-col justify-between">
      <div className="border-b border-[#059669]/15 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
          <ShieldCheck className="w-4 h-4" /> Marketplace
        </div>
        <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
          Investment Opportunities
        </h1>
        <p className="text-sm text-[#064e3b]/70 mt-0.5">
          Curated crowdfunding campaigns tailored to your investor eligibility class.
        </p>
      </div>

      <div className="my-auto py-16 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 border border-[#059669]/20 flex items-center justify-center text-[#059669] shadow-inner">
          <Store className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" /> Coming Soon
          </span>
          <h2 className="text-3xl font-black text-[#064e3b]">
            Marketplace Launching Shortly
          </h2>
          <p className="text-sm text-[#064e3b]/70 leading-relaxed">
            Our server-side filtered investment project grid based on your approved investor class is under active preparation. Check back soon for exclusive deals and campaigns.
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
        Securities offered through regulated platform partners.
      </div>
    </div>
  );
}
