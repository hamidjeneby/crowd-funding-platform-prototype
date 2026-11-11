"use client";

import {
  TrendingUp,
  Clock,
  Users,
  ShieldCheck,
  Building2,
  DollarSign,
  Target,
  Percent,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { getRoiLabelForContract } from "@/lib/validation/repaymentTermsSchema";

export default function OverviewTab({
  project,
  totalInvestorCount,
  classBreakdown = [],
  statusCounts = {},
}) {
  if (!project) return null;

  const targetGoal = Number(project.target_goal) || 0;
  const softCap = Number(project.soft_cap) || 0;
  const hardCap = Number(project.hard_cap) || 0;
  const liveRaised = Number(project.live_raised_amount) || 0;
  const currency = project.currency || "AED";

  const status = project.status || "draft";
  const isFunded = status === "funded";
  const isFailed = status === "failed";
  const isClosing = status === "closing";
  const isLive = status === "campaign_live";

  const allocatedTotal =
    project.allocated_total != null ? Number(project.allocated_total) : liveRaised;
  const subscribedAtClose =
    project.subscribed_total_at_close != null
      ? Number(project.subscribed_total_at_close)
      : liveRaised;
  const displayRaised = isFunded
    ? allocatedTotal
    : isFailed
      ? subscribedAtClose
      : liveRaised;

  const rawPercent = targetGoal > 0 ? (displayRaised / targetGoal) * 100 : 0;
  const percent = rawPercent.toFixed(1);
  const clampedBarPercent = Math.min(rawPercent, 100).toFixed(1);
  const subscribedAtClosePct =
    targetGoal > 0
      ? Number(((subscribedAtClose / targetGoal) * 100).toFixed(1))
      : 0;

  // Calculate position markers for soft cap and hard cap relative to max scale (hardCap or targetGoal)
  const maxScale = Math.max(hardCap, targetGoal, displayRaised) || 1;
  const softCapPercent = softCap > 0 ? Math.min((softCap / maxScale) * 100, 100).toFixed(1) : null;
  const targetPercent = targetGoal > 0 ? Math.min((targetGoal / maxScale) * 100, 100).toFixed(1) : null;
  const hardCapPercent = hardCap > 0 ? Math.min((hardCap / maxScale) * 100, 100).toFixed(1) : null;

  function getDaysRemaining(deadlineStr) {
    if (!deadlineStr) return null;
    try {
      const deadline = new Date(deadlineStr);
      const now = new Date();
      const diffMs = deadline - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return null;
    }
  }

  const daysRemaining = getDaysRemaining(project.campaign_end_date);
  const contractType = project.sharia_contract_type || "";
  const isSpvEquity = contractType === "spv_equity";
  const roiLabel = getRoiLabelForContract(contractType);
  const contractTerms = (() => {
    if (!project?.contract_terms) return null;
    if (typeof project.contract_terms === "object") return project.contract_terms;
    try {
      return JSON.parse(project.contract_terms);
    } catch {
      return null;
    }
  })();

  function formatUtcDate(dateStr) {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  function formatCompactAmount(amount) {
    if (!amount || isNaN(amount)) return "0";
    const num = Number(amount);
    if (num >= 1000000) {
      const val = num / 1000000;
      return `${val % 1 === 0 ? val : val.toFixed(1)}M`;
    }
    if (num >= 1000) {
      const val = num / 1000;
      return `${val % 1 === 0 ? val : val.toFixed(1)}k`;
    }
    return num.toString();
  }

  return (
    <div className="space-y-8">
      {/* Closing / Funded / Failed Status Callout */}
      {isClosing && (
        <div className="rounded-2xl p-4 sm:p-5 bg-amber-50 border border-amber-300 text-amber-900 font-bold text-sm flex items-center gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Campaign closed. Allocation in progress.</span>
        </div>
      )}
      {isFunded && (
        <div className="rounded-2xl p-4 sm:p-5 bg-emerald-50 border border-emerald-300 text-[#064e3b] font-bold text-sm flex items-center justify-between flex-wrap gap-3 shadow-xs">
          <span>
            Funded: {currency} {allocatedTotal.toLocaleString()} of {targetGoal.toLocaleString()} target ({subscribedAtClosePct}% subscribed at close).
          </span>
          <span className="text-xs font-semibold text-emerald-800">
            Subscribed at close: {currency} {subscribedAtClose.toLocaleString()}
          </span>
        </div>
      )}
      {isFailed && (
        <div className="rounded-2xl p-4 sm:p-5 bg-rose-50 border border-rose-300 text-rose-900 font-bold text-sm flex items-center justify-between flex-wrap gap-3 shadow-xs">
          <span>
            Campaign failed to fund (
            {project.failure_reason === "no_pledges"
              ? "no pledges received"
              : "soft cap not met"}
            ). All pledges have been refunded in full.
          </span>
          <span className="text-xs font-semibold text-rose-800">
            Subscribed at close: {currency} {subscribedAtClose.toLocaleString()}
          </span>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 lg:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {project.cover_image_url ? (
              <img
                src={project.cover_image_url}
                alt={project.title}
                className="w-20 h-20 rounded-2xl object-cover border border-emerald-100 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669] shrink-0">
                <Building2 className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full font-bold text-[11px] uppercase tracking-wider border ${
                    isFunded
                      ? "bg-teal-100 text-teal-900 border-teal-300"
                      : isFailed
                        ? "bg-rose-100 text-rose-900 border-rose-300"
                        : isClosing
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-emerald-100 text-[#064e3b] border-emerald-200"
                  }`}
                >
                  {project.status?.replace("_", " ") || "Draft"}
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-extrabold text-[11px] uppercase tracking-wider border border-amber-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  {project.sharia_contract_type?.replace("_", " ") || "Contract Not Set"}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#064e3b]">{project.title}</h2>
              <p className="text-xs text-gray-600 max-w-2xl line-clamp-2">
                {project.summary || "No project summary available."}
              </p>
            </div>
          </div>

          {/* Days Remaining Stat */}
          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 text-center shrink-0 min-w-[160px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Campaign Timeframe
            </span>
            <div className="flex items-center justify-center gap-1.5 pt-1 text-[#064e3b]">
              <Clock className="w-4 h-4 text-[#059669]" />
              <span className="text-xl font-extrabold">
                {isFunded || isFailed || isClosing
                  ? "Closed"
                  : daysRemaining !== null
                    ? `${daysRemaining} Days`
                    : "Ended / TBD"}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 block pt-0.5 font-medium">
              {isFunded || isFailed || isClosing ? "Closed" : "Ends"}{" "}
              {formatUtcDate(project.closed_at || project.campaign_end_date)}
            </span>
          </div>
        </div>

        {/* Live Funding Progress Bar with Soft Cap & Hard Cap Markers */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#064e3b] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#059669]" />{" "}
                {isFunded
                  ? `Funded (${percent}%)`
                  : isFailed
                    ? `Campaign Failed (Subscribed at close: ${subscribedAtClosePct}%)`
                    : `Subscribed so far (${percent}%)`}
              </span>
              {isLive && rawPercent > 100 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider border border-amber-300">
                  Oversubscribed
                </span>
              )}
            </div>
            <span className="font-extrabold text-[#064e3b] text-sm">
              {currency} {displayRaised.toLocaleString()} / {targetGoal.toLocaleString()}
            </span>
          </div>

          {/* Progress Bar Track with Visual Cap Markers */}
          <div className="relative w-full bg-gray-200 h-4 rounded-full overflow-visible my-6">
            <div
              className={`h-full rounded-full transition-all duration-500 relative z-10 ${
                isFailed
                  ? "bg-rose-500"
                  : "bg-gradient-to-r from-[#059669] to-[#047857]"
              }`}
              style={{ width: `${clampedBarPercent}%` }}
            />

            {/* Soft Cap Marker */}
            {softCapPercent && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20"
                style={{ left: `${softCapPercent}%` }}
                title={`Soft Cap: ${currency} ${softCap.toLocaleString()}`}
              >
                <div className="absolute -top-6 -translate-x-1/2 bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded text-[9px] font-extrabold whitespace-nowrap shadow-xs">
                  Soft Cap: {currency} {formatCompactAmount(softCap)}
                </div>
              </div>
            )}

            {/* Hard Cap Marker */}
            {hardCapPercent && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-purple-600 z-20"
                style={{ left: `${hardCapPercent}%` }}
                title={`Hard Cap: ${currency} ${hardCap.toLocaleString()}`}
              >
                <div className="absolute -bottom-6 -translate-x-1/2 bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 rounded text-[9px] font-extrabold whitespace-nowrap shadow-xs">
                  Hard Cap: {currency} {formatCompactAmount(hardCap)}
                </div>
              </div>
            )}
          </div>

          {/* Cap Details Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] text-gray-500 font-bold block uppercase">
                {isFunded
                  ? "Allocated Total"
                  : isFailed
                    ? "Subscribed at Close"
                    : "Subscribed so far"}
              </span>
              <span className="font-extrabold text-[#064e3b] text-sm">
                {currency} {displayRaised.toLocaleString()}
              </span>
              {isFunded && (
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  Subscribed at close: {currency} {subscribedAtClose.toLocaleString()}
                </span>
              )}
              {isFailed && (
                <span className="text-[10px] text-rose-700 block mt-0.5 font-semibold">
                  Allocated: {currency} 0 (Refunded in full)
                </span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] text-gray-500 font-bold block uppercase">Target Goal</span>
              <span className="font-extrabold text-[#064e3b] text-sm">
                {currency} {targetGoal.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <span className="text-[10px] text-amber-800 font-bold block uppercase">Soft Cap</span>
              <span className="font-extrabold text-amber-900 text-sm">
                {currency} {softCap > 0 ? softCap.toLocaleString() : "Not set"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
              <span className="text-[10px] text-purple-800 font-bold block uppercase">Hard Cap</span>
              <span className="font-extrabold text-purple-900 text-sm">
                {currency} {hardCap > 0 ? hardCap.toLocaleString() : "Not set"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats & Key Terms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Investor Count Stat Card */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {isFailed ? "Pledged Backers" : "Total Backers"}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-4xl font-extrabold text-[#064e3b] block">
              {totalInvestorCount}
            </span>
            <span
              className={`text-xs font-semibold block pt-1 ${
                isFailed ? "text-rose-700" : "text-emerald-700"
              }`}
            >
              {isFailed
                ? "Investors who pledged before close (refunded)"
                : "Distinct active investors"}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 border-t border-gray-100 pt-3">
            {isFailed
              ? "All pledges were refunded in full when the campaign did not meet its soft cap."
              : "Count includes investors with pending, allocated, active, or completed pledges."}
          </p>
        </div>

        {/* Terms Summary (2 Columns wide) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
            <Target className="w-4 h-4 text-[#059669]" /> Financial & Campaign Terms Summary
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Currency</span>
              <span className="font-extrabold text-[#064e3b] text-sm">{currency}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Unit Price</span>
              <span className="font-extrabold text-[#064e3b] text-sm">
                {project.unit_price ? `${currency} ${Number(project.unit_price).toLocaleString()}` : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Min Investment</span>
              <span className="font-extrabold text-[#064e3b] text-sm">
                {project.min_investment_floor ? `${currency} ${Number(project.min_investment_floor).toLocaleString()}` : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Clearing Option</span>
              <span className="font-extrabold text-[#064e3b] text-sm uppercase">
                {project.clearing_option ? project.clearing_option.replace("_", " ") : "Standard"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Yield Type</span>
              <span className="font-extrabold text-[#064e3b] text-sm capitalize">
                {project.yield_type ? project.yield_type.replace("_", " ") : "N/A"}
              </span>
            </div>

            {!isSpvEquity && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] text-emerald-800 font-bold uppercase block">{roiLabel}</span>
                <span className="font-extrabold text-[#064e3b] text-sm">
                  {project.expected_roi_percent ? `${project.expected_roi_percent}%` : "N/A"}
                  {contractType === "mudarabah" && (
                    <span className="text-[10px] font-normal text-emerald-700/80 block">(Not guaranteed)</span>
                  )}
                </span>
              </div>
            )}

            {!isSpvEquity && (
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Tenor</span>
                <span className="font-extrabold text-[#064e3b] text-sm">
                  {project.tenor_months ? `${project.tenor_months} months` : "N/A"}
                </span>
              </div>
            )}
          </div>

          {/* Repayment Terms Summary */}
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">
              {isSpvEquity ? "Equity Structure & Exit Terms" : "Repayment Terms"}
            </span>
            {contractType === "murabaha" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><span className="font-semibold text-gray-700">Payment Frequency:</span> <span className="capitalize">{contractTerms?.payment_frequency ? contractTerms.payment_frequency.replace("_", " ") : "N/A"}</span></div>
                <div><span className="font-semibold text-gray-700">Principal Repayment:</span> <span>{contractTerms?.principal_repayment === "with_instalments" ? "With instalments" : contractTerms?.principal_repayment === "at_maturity" ? "At maturity" : "N/A"}</span></div>
                {contractTerms?.asset_description && (
                  <div className="sm:col-span-2 text-[11px] bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="font-semibold text-gray-700">Financed Asset:</span> {contractTerms.asset_description}
                  </div>
                )}
              </div>
            )}
            {contractType === "ijara" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><span className="font-semibold text-gray-700">Rental Frequency:</span> <span className="capitalize">{contractTerms?.payment_frequency ? contractTerms.payment_frequency.replace("_", " ") : "N/A"}</span></div>
                <div><span className="font-semibold text-gray-700">Asset Value:</span> <span>{contractTerms?.asset_value ? `${currency} ${Number(contractTerms.asset_value).toLocaleString()}` : "N/A"}</span></div>
                <div><span className="font-semibold text-gray-700">End of Term:</span> <span>{contractTerms?.end_of_term ? contractTerms.end_of_term.replace(/_/g, " ") : "N/A"}</span></div>
                {contractTerms?.end_of_term === "sale_to_issuer" && contractTerms?.end_of_term_price && (
                  <div><span className="font-semibold text-gray-700">End of Term Price:</span> <span>{currency} {Number(contractTerms.end_of_term_price).toLocaleString()}</span></div>
                )}
                {contractTerms?.asset_description && (
                  <div className="sm:col-span-2 text-[11px] bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="font-semibold text-gray-700">Leased Asset:</span> {contractTerms.asset_description}
                  </div>
                )}
              </div>
            )}
            {contractType === "mudarabah" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><span className="font-semibold text-gray-700">Investor Profit Share:</span> <span>{contractTerms?.investor_profit_share_percent ? `${contractTerms.investor_profit_share_percent}%` : "N/A"}</span></div>
                <div><span className="font-semibold text-gray-700">Reporting Frequency:</span> <span className="capitalize">{contractTerms?.profit_reporting_frequency ? contractTerms.profit_reporting_frequency.replace("_", " ") : "N/A"}</span></div>
              </div>
            )}
            {contractType === "spv_equity" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><span className="font-semibold text-gray-700">Existing Shares:</span> <span>{contractTerms?.existing_shares_outstanding != null ? Number(contractTerms.existing_shares_outstanding).toLocaleString() : "0"}</span></div>
                <div><span className="font-semibold text-gray-700">Dividend Policy:</span> <span className="capitalize">{contractTerms?.dividend_policy ? contractTerms.dividend_policy.replace("_", " ") : "None planned"}</span></div>
                <div><span className="font-semibold text-gray-700">Target Exit:</span> <span>{contractTerms?.target_exit_horizon_years ? `${contractTerms.target_exit_horizon_years} years` : "Not specified"}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anonymized Investor Class Pledge Breakdown */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#059669]" /> Anonymized Pledges by Investor Class
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Aggregated pledge counts and amounts grouped by investor class (individual identities are privacy-shielded).
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 self-start sm:self-auto">
            Class-Level View
          </span>
        </div>

        {classBreakdown.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            No pledges were submitted for this campaign.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-extrabold text-[10px] bg-gray-50/50">
                  <th className="py-3 px-4">Investor Tier</th>
                  <th className="py-3 px-4 text-center">Pledge Count</th>
                  <th className="py-3 px-4 text-right">Total Pledged</th>
                  <th className="py-3 px-4 text-right">Total Allocated</th>
                  <th className="py-3 px-4 text-right">Status / Outcome</th>
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
                      {row.investorCount} {row.investorCount === 1 ? "Pledge" : "Pledges"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#064e3b]">
                      {currency} {Number(row.totalPledged || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {row.totalAllocated !== null ? (
                        <span
                          className={`font-extrabold ${
                            row.totalAllocated > 0 ? "text-emerald-800" : "text-gray-500"
                          }`}
                        >
                          {currency} {Number(row.totalAllocated || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-500 font-semibold italic text-[11px]">
                          Pending Allocation
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isFailed || row.refundedCount === row.investorCount ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px]">
                          Refunded in full
                        </span>
                      ) : row.rejectedCount === row.investorCount ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                          Not allocated (Oversubscribed)
                        </span>
                      ) : row.allocatedCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                          {row.allocatedCount} Allocated
                          {row.rejectedCount > 0 ? `, ${row.rejectedCount} Cut off` : ""}
                          {row.refundedCount > 0 ? `, ${row.refundedCount} Refunded` : ""}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                          Awaiting Close
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
