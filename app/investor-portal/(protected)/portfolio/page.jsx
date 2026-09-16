import { ShieldCheck, TrendingUp, PieChart, Calendar, ArrowUpRight, DollarSign, Layers } from "lucide-react";
import Link from "next/link";

export default function PortfolioPage() {
  const holdings = [
    {
      id: 1,
      project: "Solaris Green Energy Infrastructure",
      category: "Renewable Energy",
      amountInvested: 20000,
      allocation: 44.4,
      targetReturn: "12.5% IRR",
      nextPayout: "Nov 15, 2026",
      status: "Active",
      color: "#059669",
    },
    {
      id: 2,
      project: "Aura Luxury Residences",
      category: "Real Estate",
      amountInvested: 15000,
      allocation: 33.3,
      targetReturn: "14.0% IRR",
      nextPayout: "Dec 01, 2026",
      status: "Active",
      color: "#10b981",
    },
    {
      id: 3,
      project: "Apex Logistics Tech Hub",
      category: "Commercial Infra",
      amountInvested: 10000,
      allocation: 22.3,
      targetReturn: "10.8% IRR",
      nextPayout: "Oct 15, 2026",
      status: "Active",
      color: "#34d399",
    },
  ];

  const totalInvested = 45000;
  const expectedReturns = 5580;

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
            Across 3 active project holdings
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-sm">
          <div className="text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Expected Annual Return</span>
            <TrendingUp className="w-5 h-5 text-[#059669]" />
          </div>
          <div className="text-3xl font-black text-[#064e3b]">
            +${expectedReturns.toLocaleString()}<span className="text-sm text-emerald-600 font-semibold">.00</span>
          </div>
          <div className="mt-3 text-xs text-[#064e3b]/70 flex items-center gap-1">
            <span className="text-emerald-600 font-bold">12.4% Average IRR</span> weighted target
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-sm">
          <div className="text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Holding Diversification</span>
            <PieChart className="w-5 h-5 text-[#059669]" />
          </div>
          <div className="text-3xl font-black text-[#064e3b]">3 Projects</div>
          <div className="mt-3 text-xs text-[#064e3b]/70">
            Clean Energy • Real Estate • Infrastructure
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Total Deployed Capital Growth Chart (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#064e3b]">Capital Invested Over Time</h2>
              <p className="text-xs text-[#064e3b]/70">Cumulative deployment trajectory across quarters</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              2025 - 2026
            </span>
          </div>

          {/* Custom SVG Line Chart */}
          <div className="relative h-64 w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="#e5e7eb" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#e5e7eb" strokeDasharray="4 4" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="#e5e7eb" strokeDasharray="4 4" />
              <line x1="0" y1="190" x2="500" y2="190" stroke="#e5e7eb" strokeDasharray="4 4" />

              {/* Area Fill */}
              <path
                d="M 0 190 L 0 170 Q 100 150 150 120 T 300 70 T 500 30 L 500 190 Z"
                fill="url(#chartGradient)"
              />

              {/* Line */}
              <path
                d="M 0 170 Q 100 150 150 120 T 300 70 T 500 30"
                fill="none"
                stroke="#059669"
                strokeWidth="3"
              />

              {/* Data Points */}
              <circle cx="0" cy="170" r="5" fill="#064e3b" stroke="#ffffff" strokeWidth="2" />
              <circle cx="150" cy="120" r="5" fill="#064e3b" stroke="#ffffff" strokeWidth="2" />
              <circle cx="300" cy="70" r="5" fill="#064e3b" stroke="#ffffff" strokeWidth="2" />
              <circle cx="500" cy="30" r="6" fill="#059669" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold border-t pt-3 border-gray-100">
            <span>Q1 2025 ($10k)</span>
            <span>Q3 2025 ($25k)</span>
            <span>Q1 2026 ($35k)</span>
            <span className="text-[#059669]">Q3 2026 ($45k)</span>
          </div>
        </div>

        {/* Allocation Breakdown (1 col) */}
        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#064e3b]">Asset Allocation</h2>
            <p className="text-xs text-[#064e3b]/70">Capital distribution across project holdings</p>
          </div>

          {/* Allocation Stack Bar */}
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

          {/* Detailed Allocation List */}
          <div className="space-y-4">
            {holdings.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs space-y-0.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: h.color }}
                  />
                  <div>
                    <div className="font-bold text-[#064e3b] truncate max-w-[170px]">
                      {h.project}
                    </div>
                    <div className="text-[11px] text-gray-500">{h.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#064e3b]">
                    ${h.amountInvested.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-700">
                    {h.allocation}%
                  </div>
                </div>
              </div>
            ))}
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
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Amount Deployed</th>
                <th className="py-3 px-4">Target Return</th>
                <th className="py-3 px-4">Next Payout</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {holdings.map((h) => (
                <tr key={h.id} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#064e3b]">{h.project}</td>
                  <td className="py-3.5 px-4 text-gray-600">{h.category}</td>
                  <td className="py-3.5 px-4 font-bold text-[#064e3b]">${h.amountInvested.toLocaleString()}</td>
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
