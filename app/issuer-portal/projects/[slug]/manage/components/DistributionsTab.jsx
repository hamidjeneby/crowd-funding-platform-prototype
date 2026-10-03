"use client";

import { DollarSign, ShieldAlert, PieChart, Users, Clock, CheckCircle2 } from "lucide-react";

export default function DistributionsTab({
  project,
  classBreakdown = [],
  statusCounts = { pending: 0, allocated: 0, active: 0, completed: 0 },
}) {
  const currency = project?.currency || "USD";

  return (
    <div className="space-y-8">
      {/* Privacy Notice Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 sm:p-6 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-900">
          <ShieldAlert className="w-4 h-4 text-blue-700" /> Aggregated Investor Positions & Privacy Shield
        </div>
        <p className="text-xs text-blue-900/80 leading-relaxed">
          Per platform data protection policy, individual investor identities, emails, and personal accounts are strictly shielded. Information is presented in anonymized aggregate classes.
        </p>
      </div>

      {/* Section A: Investor Positions (Aggregated Only) */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#059669]" /> Investor Class Capital Breakdown
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Aggregated capital contributions grouped by investor eligibility class.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 self-start sm:self-auto">
            Aggregated Only
          </span>
        </div>

        {/* Aggregated Class Table */}
        {classBreakdown.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            No active investor positions recorded yet for this project.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-extrabold text-[10px] bg-gray-50/50">
                  <th className="py-3 px-4">Investor Tier</th>
                  <th className="py-3 px-4 text-center">Investor Count</th>
                  <th className="py-3 px-4 text-right">Total Pledged</th>
                  <th className="py-3 px-4 text-right">Total Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {classBreakdown.map((row) => (
                  <tr key={row.className} className="hover:bg-[#fdfbf7] transition-all">
                    <td className="py-3.5 px-4 font-bold text-[#064e3b]">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-[#064e3b] text-[11px] border border-emerald-200">
                        {row.className}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-gray-900 font-bold">
                      {row.investorCount} {row.investorCount === 1 ? "Investor" : "Investors"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#064e3b]">
                      {currency} {row.totalPledged.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {row.totalAllocated !== null ? (
                        <span className="font-extrabold text-emerald-800">
                          {currency} {row.totalAllocated.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-500 font-semibold italic text-[11px]">
                          Pending Allocation ({currency} {row.totalPledged.toLocaleString()} pledged)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pledge Status Counters */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
            Pledge Pipeline Status Breakdown
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Pending Allocation</span>
              <span className="text-xl font-extrabold text-amber-900">{statusCounts.pending || 0}</span>
              <span className="text-[10px] text-amber-700 block pt-0.5">Awaiting clearing</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
              <span className="text-[10px] font-bold text-blue-800 uppercase block">Allocated</span>
              <span className="text-xl font-extrabold text-blue-900">{statusCounts.allocated || 0}</span>
              <span className="text-[10px] text-blue-700 block pt-0.5">Capital reserved</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Active Positions</span>
              <span className="text-xl font-extrabold text-[#064e3b]">{statusCounts.active || 0}</span>
              <span className="text-[10px] text-emerald-700 block pt-0.5">Live held positions</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
              <span className="text-[10px] font-bold text-purple-800 uppercase block">Completed / Settled</span>
              <span className="text-xl font-extrabold text-purple-900">{statusCounts.completed || 0}</span>
              <span className="text-[10px] text-purple-700 block pt-0.5">Fully processed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section B: Payout History (Empty State) */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-4">
          <DollarSign className="w-5 h-5 text-[#059669]" /> Distribution & Payout History
        </h3>

        <div className="flex flex-col items-center justify-center py-12 text-center bg-[#fdfbf7] rounded-2xl border border-dashed border-emerald-200">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#059669] flex items-center justify-center mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#064e3b]">No distributions have been made for this project yet.</h4>
          <p className="text-xs text-gray-500 max-w-md mt-1">
            When profit returns or principal distributions are processed by the platform administrator, historical payout logs and recipient counts will be displayed here.
          </p>
        </div>
      </div>
    </div>
  );
}
