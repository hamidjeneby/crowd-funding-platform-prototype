import { ShieldCheck, TrendingUp, PieChart, ArrowUpRight, DollarSign, Layers, ArrowRight, Briefcase } from "lucide-react";
import Link from "next/link";
import { getInvestorHoldingsAndPledges } from "@/app/actions/investor-portal";

export default async function PortfolioPage() {
  const { holdings: dbHoldings, investorClass } = await getInvestorHoldingsAndPledges();

  // If there are no holdings in the holdings table, display the appropriate empty page message & investment button
  if (!dbHoldings || dbHoldings.length === 0) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 flex flex-col justify-between">
        {/* Header */}
        <div className="border-b border-[#059669]/15 pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Portfolio Overview
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Financial Health & Asset Allocation
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Rolled-up view of total deployed capital, expected returns, and asset distribution.
          </p>
        </div>

        {/* Empty Holdings View */}
        <div className="my-auto py-16 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-emerald-100/80 border border-[#059669]/20 flex items-center justify-center text-[#059669] shadow-xs">
            <PieChart className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#064e3b]">
              No Active Portfolio Holdings
            </h2>
            <p className="text-sm text-[#064e3b]/70 leading-relaxed">
              You currently do not have any active asset holdings in your portfolio. Active holdings are allocated once pledged project campaigns successfully complete funding.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/investor-portal/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#064e3b] text-white font-semibold text-sm hover:bg-[#047857] transition-all shadow-md hover:shadow-lg"
            >
              Make Investments <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <div className="border-t border-[#059669]/10 pt-4 text-center text-xs text-gray-500">
          Portfolio tracking powered by real-time asset position records.
        </div>
      </div>
    );
  }

  // Active holdings present - map dbHoldings to view format
  const holdings = dbHoldings.map((h, idx) => {
    const proj = h.projects || {};
    const amount = Number(h.principal_amount || 0);
    return {
      id: h.id,
      project: proj.title || "Unnamed Project",
      category: proj.sharia_contract_type ? proj.sharia_contract_type.replace("_", " ").toUpperCase() : "Investment",
      amountInvested: amount,
      allocation: 0, // Computed below
      targetReturn: proj.expected_roi_percent ? `${proj.expected_roi_percent}% ROI` : "Equity",
      nextPayout: h.issued_at ? new Date(h.issued_at).toLocaleDateString() : "Pending",
      status: h.status ? h.status.toUpperCase() : "Active",
      color: idx % 3 === 0 ? "#059669" : idx % 3 === 1 ? "#10b981" : "#34d399",
      currency: proj.currency || "USD",
    };
  });

  const totalInvested = holdings.reduce((sum, item) => sum + item.amountInvested, 0);

  // Compute allocation percentage
  holdings.forEach((h) => {
    h.allocation = totalInvested > 0 ? Number(((h.amountInvested / totalInvested) * 100).toFixed(1)) : 0;
  });

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Portfolio Overview
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Financial Health & Asset Allocation
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Rolled-up view of total deployed capital, expected returns, and asset distribution.
          </p>
        </div>

        <Link
          href="/investor-portal/marketplace"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#064e3b] text-white font-semibold text-sm hover:bg-[#047857] transition-all shadow-md self-start md:self-auto"
        >
          Add Position <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Rolled Up Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#064e3b] to-emerald-900 text-white shadow-lg relative overflow-hidden">
          <div className="text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Total Capital Deployed</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black">
            ${totalInvested.toLocaleString()}<span className="text-sm text-emerald-300">.00</span>
          </div>
          <div className="mt-3 text-xs text-emerald-200/80">
            Across {holdings.length} active project {holdings.length === 1 ? "holding" : "holdings"}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-sm">
          <div className="text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Class Level</span>
            <TrendingUp className="w-5 h-5 text-[#059669]" />
          </div>
          <div className="text-3xl font-black text-[#064e3b]">
            Class {investorClass}
          </div>
          <div className="mt-3 text-xs text-[#064e3b]/70 flex items-center gap-1">
            <span className="text-emerald-600 font-bold">Active Investor</span> portfolio profile
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-sm">
          <div className="text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Holding Diversification</span>
            <PieChart className="w-5 h-5 text-[#059669]" />
          </div>
          <div className="text-3xl font-black text-[#064e3b]">{holdings.length} {holdings.length === 1 ? "Project" : "Projects"}</div>
          <div className="mt-3 text-xs text-[#064e3b]/70">
            {holdings.map((h) => h.category).filter((v, i, a) => a.indexOf(v) === i).join(" • ")}
          </div>
        </div>
      </div>

      {/* Allocation Breakdown */}
      <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#064e3b]">Asset Allocation</h2>
          <p className="text-xs text-[#064e3b]/70">Capital distribution across project holdings</p>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-full rounded-full bg-gray-100 overflow-hidden flex">
            {holdings.map((h) => (
              <div
                key={h.id}
                style={{ width: `${h.allocation}%`, backgroundColor: h.color }}
                className="h-full transition-all duration-500"
                title={`${h.project}: ${h.allocation}%`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-gray-500">
            <span>0%</span>
            <span>100% Deployed</span>
          </div>
        </div>
      </div>

      {/* Holdings Breakdown Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-4">
        <h2 className="text-xl font-bold text-[#064e3b]">Project Holdings Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#064e3b]">
            <thead className="bg-[#ecfdf5] uppercase font-bold text-[#064e3b] border-b border-[#059669]/20">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Project Name</th>
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Amount Deployed</th>
                <th className="py-3 px-4">Target Return</th>
                <th className="py-3 px-4">Issued Date</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {holdings.map((h) => (
                <tr key={h.id} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#064e3b]">{h.project}</td>
                  <td className="py-3.5 px-4 text-gray-600">{h.category}</td>
                  <td className="py-3.5 px-4 font-bold text-[#064e3b]">{h.currency} {h.amountInvested.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-bold">{h.targetReturn}</td>
                  <td className="py-3.5 px-4 text-gray-600">{h.nextPayout}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
