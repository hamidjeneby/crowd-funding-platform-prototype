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

export default function OverviewTab({ project, totalInvestorCount }) {
  if (!project) return null;

  const targetGoal = Number(project.target_goal) || 0;
  const softCap = Number(project.soft_cap) || 0;
  const hardCap = Number(project.hard_cap) || 0;
  const liveRaised = Number(project.live_raised_amount) || 0;
  const currency = project.currency || "USD";

  const rawPercent = targetGoal > 0 ? (liveRaised / targetGoal) * 100 : 0;
  const percent = Math.min(rawPercent, 100).toFixed(1);

  // Calculate position markers for soft cap and hard cap relative to max scale (hardCap or targetGoal)
  const maxScale = Math.max(hardCap, targetGoal, liveRaised) || 1;
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
  const isSpvEquity = project.sharia_contract_type === "spv_equity";

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
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#064e3b] font-bold text-[11px] uppercase tracking-wider border border-emerald-200">
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
                {daysRemaining !== null ? `${daysRemaining} Days` : "Ended / TBD"}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 block pt-0.5 font-medium">
              Ends {formatUtcDate(project.campaign_end_date)}
            </span>
          </div>
        </div>

        {/* Live Funding Progress Bar with Soft Cap & Hard Cap Markers */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <span className="font-bold text-[#064e3b] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#059669]" /> Funding Progress ({percent}%)
            </span>
            <span className="font-extrabold text-[#064e3b] text-sm">
              {currency} {liveRaised.toLocaleString()} / {targetGoal.toLocaleString()}
            </span>
          </div>

          {/* Progress Bar Track with Visual Cap Markers */}
          <div className="relative w-full bg-gray-200 h-4 rounded-full overflow-visible my-6">
            <div
              className="bg-gradient-to-r from-[#059669] to-[#047857] h-full rounded-full transition-all duration-500 relative z-10"
              style={{ width: `${percent}%` }}
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
              <span className="text-[10px] text-gray-500 font-bold block uppercase">Live Raised</span>
              <span className="font-extrabold text-[#064e3b] text-sm">
                {currency} {liveRaised.toLocaleString()}
              </span>
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
              Total Backers
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-4xl font-extrabold text-[#064e3b] block">
              {totalInvestorCount}
            </span>
            <span className="text-xs text-emerald-700 font-semibold block pt-1">
              Distinct active investors
            </span>
          </div>
          <p className="text-[11px] text-gray-500 border-t border-gray-100 pt-3">
            Count includes investors with pending, allocated, active, or completed pledges.
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
                <span className="text-[10px] text-emerald-800 font-bold uppercase block">Expected ROI</span>
                <span className="font-extrabold text-[#064e3b] text-sm">
                  {project.expected_roi_percent ? `${project.expected_roi_percent}%` : "N/A"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
