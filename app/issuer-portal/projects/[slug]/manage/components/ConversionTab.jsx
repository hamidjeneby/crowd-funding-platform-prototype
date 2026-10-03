"use client";

import { Sparkles, Calendar, Layers, ShieldCheck, Target, Lock } from "lucide-react";

export default function ConversionTab({ project }) {
  if (!project) return null;

  const spvDetails = project.spv_details;
  const currency = project.currency || "USD";

  const totalSharesAuthorized = Number(spvDetails?.total_shares_authorized) || 0;
  const conversionRatioShares = Number(spvDetails?.conversion_ratio_shares) || 1;
  const totalConvertibleUnits =
    conversionRatioShares > 0
      ? Math.floor(totalSharesAuthorized / conversionRatioShares)
      : totalSharesAuthorized;

  const pledgedConvertedUnits = Number(project.live_conversion_units) || 0;
  const conversionPercent =
    totalConvertibleUnits > 0
      ? Math.min((pledgedConvertedUnits / totalConvertibleUnits) * 100, 100).toFixed(1)
      : 0;

  function formatUtcDate(dateStr) {
    if (!dateStr) return "Not specified";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      {/* Read-Only Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-3xl p-5 sm:p-6 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-purple-800">
          <Sparkles className="w-4 h-4 text-purple-600" /> SPV Conversion Clause Details & Utilization
        </div>
        <p className="text-xs text-purple-900/80 leading-relaxed">
          This project includes a Sukuk-to-Equity conversion clause enabled under the SPV structure for eligible Class 1-4 investors. Valuation updates and trigger tracking will be activated once independent valuation reports are uploaded.
        </p>
      </div>

      {/* Conversion Terms & Pool Utilization Card */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-4">
          <Target className="w-5 h-5 text-[#059669]" /> Conversion Pool Utilization
        </h3>

        {/* Conversion Pool Utilization Bar */}
        <div className="space-y-3 bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200/80">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <span className="font-bold text-[#064e3b] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#059669]" /> Claimed Conversion Units ({conversionPercent}%)
            </span>
            <span className="font-extrabold text-[#064e3b] text-sm">
              {pledgedConvertedUnits.toLocaleString()} / {totalConvertibleUnits.toLocaleString()} units
            </span>
          </div>

          <div className="w-full bg-emerald-200/60 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#059669] to-[#047857] h-full rounded-full transition-all duration-500"
              style={{ width: `${conversionPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-emerald-800 pt-1 font-medium">
            Shows the portion of authorized conversion pool units claimed by active Class 1-4 investor pledges.
          </p>
        </div>

        {/* Read-Only Conversion Terms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Conversion Trigger Value</span>
            <span className="text-lg font-extrabold text-[#064e3b] block">
              {spvDetails?.conversion_trigger_value
                ? `${currency} ${Number(spvDetails.conversion_trigger_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : "Not specified"}
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">Share price threshold</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Conversion Ratio</span>
            <span className="text-lg font-extrabold text-[#064e3b] block">
              {spvDetails?.conversion_ratio_shares
                ? `1 Unit = ${spvDetails.conversion_ratio_shares} Shares`
                : "Not specified"}
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">Sukuk to share ratio</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Authorized Shares</span>
            <span className="text-lg font-extrabold text-[#064e3b] block">
              {totalSharesAuthorized > 0 ? totalSharesAuthorized.toLocaleString() : "Not specified"}
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">SPV share capital pool</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Conversion Deadline</span>
            <span className="text-lg font-extrabold text-[#064e3b] block">
              {formatUtcDate(spvDetails?.conversion_deadline)}
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">Expiration date</span>
          </div>
        </div>
      </div>
    </div>
  );
}
