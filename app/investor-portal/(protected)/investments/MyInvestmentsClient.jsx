"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Briefcase,
  Layers,
  ArrowRight,
  Clock,
  Coins,
  FileText,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { getConversionRights } from "@/app/utils/conversion";

function formatUtcDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
  } catch (e) {
    return "—";
  }
}

function getPledgeStatusBadge(status, pledge = null) {
  switch (status) {
    case "pending":
      return {
        label: "Pending allocation",
        className: "bg-amber-100 text-amber-900 border-amber-300",
      };
    case "allocated": {
      const isPartial =
        pledge &&
        pledge.allocated_amount != null &&
        pledge.pledged_amount != null &&
        Number(pledge.allocated_amount) < Number(pledge.pledged_amount);
      return {
        label: isPartial ? "Partially allocated" : "Allocated",
        className: isPartial
          ? "bg-teal-100 text-teal-900 border-teal-300"
          : "bg-emerald-100 text-emerald-900 border-emerald-300",
      };
    }
    case "rejected_oversubscribed":
      return {
        label: "Not allocated",
        className: "bg-gray-100 text-gray-700 border-gray-300",
      };
    case "refunded":
      return {
        label: "Refunded",
        className: "bg-rose-50 text-rose-800 border-rose-300",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-gray-100 text-gray-600 border-gray-300",
      };
    default:
      return {
        label: status || "Pledged",
        className: "bg-emerald-100 text-emerald-900 border-emerald-300",
      };
  }
}

export default function MyInvestmentsClient({ investorClass, holdings = [], pledges = [] }) {
  const [activeTab, setActiveTab] = useState(pledges.length > 0 ? "pledges" : holdings.length > 0 ? "holdings" : "pledges");

  const isEligibleClass = Number(investorClass) >= 1 && Number(investorClass) <= 4;

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Portfolio Management
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            My Active Investments
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Switch between your submitted pledges and active holding positions with live conversion clause entitlements.
          </p>
        </div>

        {/* Investor Class Badge */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#059669]/20 shadow-xs self-start md:self-auto">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#064e3b] font-bold text-sm">
            C{investorClass || "?"}
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Investor Profile</div>
            <div className="text-sm font-extrabold text-[#064e3b] flex items-center gap-1.5">
              Class {investorClass || "Unassigned"}
              {isEligibleClass ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  Conversion Access
                </span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  Cash-Only Sukuk
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("pledges")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "pledges"
                ? "border-[#064e3b] text-[#064e3b] bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Pledges
            <span
              className={`ml-1.5 text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === "pledges"
                  ? "bg-[#064e3b] text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {pledges.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("holdings")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "holdings"
                ? "border-[#064e3b] text-[#064e3b] bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Layers className="w-4 h-4" />
            Holdings
            <span
              className={`ml-1.5 text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === "holdings"
                  ? "bg-[#064e3b] text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {holdings.length}
            </span>
          </button>
        </div>

        <Link
          href="/investor-portal/marketplace"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#064e3b] hover:text-[#047857] transition-colors"
        >
          Explore Marketplace <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* TAB CONTENT: PLEDGES */}
      {activeTab === "pledges" && (
        <div className="space-y-6">
          {pledges.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 bg-white rounded-2xl border border-[#059669]/15 shadow-xs p-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100/80 border border-[#059669]/20 flex items-center justify-center text-[#059669]">
                <Briefcase className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#064e3b]">No Active Pledges</h3>
                <p className="text-xs text-[#064e3b]/70 leading-relaxed">
                  You haven&apos;t submitted any project pledges yet. Browse open projects on the marketplace to pledge funds.
                </p>
              </div>
              <Link
                href="/investor-portal/marketplace"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#064e3b] text-white font-semibold text-xs hover:bg-[#047857] transition-all shadow-md"
              >
                Go to Marketplace <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pledges.map((pledge) => {
                const project = pledge.projects || {};
                const pledgeClass = pledge.investor_class_at_pledge || investorClass;
                const pledgeFeePercent = pledge.fee_percent_at_pledge != null ? pledge.fee_percent_at_pledge : 0;
                const conversionRights = getConversionRights(pledgeClass, project);
                const currency = project.currency || "USD";
                const amount = Number(pledge.pledged_amount || 0);
                const fee = Number(pledge.fee_amount || 0);

                return (
                  <div
                    key={pledge.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6 space-y-5 relative overflow-hidden"
                  >
                    {/* Top row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-gray-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            {project.sharia_contract_type ? project.sharia_contract_type.replace("_", " ") : "Sukuk"}
                          </span>
                          <span className="text-xs font-bold bg-[#064e3b] text-white px-2.5 py-0.5 rounded">
                            Class {pledgeClass} at Pledge
                          </span>
                          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pledged at {formatUtcDate(pledge.pledged_at || pledge.created_at)}
                          </span>
                        </div>
                        <h3 className="text-xl font-extrabold text-[#064e3b] mt-1.5 flex items-center gap-2">
                          <Link
                            href={`/investor-portal/projects/${project.slug}`}
                            className="hover:underline flex items-center gap-1.5"
                          >
                            {project.title || "Project Details"}
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </Link>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {pledge.allocation_rank != null && (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                            Rank #{pledge.allocation_rank}
                          </span>
                        )}
                        {(() => {
                          const badge = getPledgeStatusBadge(pledge.status, pledge);
                          return (
                            <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider border ${badge.className}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Financial details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                      <div>
                        <div className="text-gray-500 font-medium">Pledged Amount</div>
                        <div className="text-base font-extrabold text-[#064e3b] mt-0.5">
                          {currency} {amount.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">Pledged Units</div>
                        <div className="text-base font-extrabold text-[#064e3b] mt-0.5">
                          {pledge.pledged_units ? pledge.pledged_units.toLocaleString() : "—"}{" "}
                          <span className="text-xs font-normal text-gray-500 capitalize">{project.unit_type || "units"}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">
                          {pledge.status === "pending" ? "Requested Conversion Units" : "Conversion Eligible Units"}
                        </div>
                        <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                          {Number(pledge.conversion_eligible_units ?? pledge.requested_conversion_units ?? 0).toLocaleString()}{" "}
                          <span className="text-xs font-normal text-gray-500">units</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">Investor Fee ({pledgeFeePercent}%)</div>
                        <div className="text-base font-bold text-gray-700 mt-0.5">
                          {currency} {fee.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">
                          {Number(pledge.refunded_amount) > 0 ? "Refunded to Wallet" : "Total Cost Debited"}
                        </div>
                        <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                          {Number(pledge.refunded_amount) > 0
                            ? `${currency} ${Number(pledge.refunded_amount).toLocaleString()}`
                            : `${currency} ${(amount + fee).toLocaleString()}`}
                        </div>
                      </div>
                    </div>

                    {/* CONVERSION CLAUSE CARD SECTION */}
                    {conversionRights && (
                      <div className="p-4 rounded-xl border space-y-3 bg-gradient-to-r from-emerald-50/40 via-white to-gray-50/60 border-emerald-100">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#064e3b]">
                              Conversion Clause Entitlement & Projected Equity
                            </h4>
                          </div>

                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${conversionRights.badgeClass}`}>
                            {conversionRights.badgeText}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600">
                          {conversionRights.description}
                        </p>

                        {conversionRights.eligible && !conversionRights.isSpvEquity && (
                          <div className="space-y-3 pt-2 border-t border-emerald-100/60">
                            {/* Conversion Rights Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Class {pledgeClass} Value Cap</span>
                                <span className="font-extrabold text-[#064e3b]">{conversionRights.classCap}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Trigger Share Price</span>
                                <span className="font-extrabold text-[#064e3b]">{conversionRights.triggerPrice}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Conversion Ratio</span>
                                <span className="font-extrabold text-[#064e3b]">{conversionRights.ratio}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Conversion Cutoff (UTC)</span>
                                <span className="font-extrabold text-[#064e3b]">
                                  {formatUtcDate(conversionRights.deadline)}
                                </span>
                              </div>
                            </div>

                            {/* Live Conversion Outcome Projection */}
                            <div className="bg-emerald-900/5 p-3.5 rounded-xl border border-emerald-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div>
                                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                                  Your Conversion Outcome Upon Trigger
                                </span>
                                <span className="text-xs text-gray-600">
                                  Converting <strong>{Number(pledge.conversion_eligible_units || 0).toLocaleString()} Sukuk units</strong> out of {Number(pledge.pledged_units || 0).toLocaleString()} pledged units
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs text-gray-500 block">Potential Shares Acquired</span>
                                <span className="text-base font-black text-[#064e3b]">
                                  {(Number(pledge.conversion_eligible_units || 0) * (conversionRights.ratioShares || 1)).toLocaleString()} Shares
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: HOLDINGS */}
      {activeTab === "holdings" && (
        <div className="space-y-6">
          {holdings.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 bg-white rounded-2xl border border-[#059669]/15 shadow-xs p-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100/80 border border-[#059669]/20 flex items-center justify-center text-[#059669]">
                <Layers className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#064e3b]">No Allocated Holdings</h3>
                <p className="text-xs text-[#064e3b]/70 leading-relaxed">
                  Holdings represent active asset units allocated to you after project campaigns finish funding.
                </p>
              </div>
              <Link
                href="/investor-portal/marketplace"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#064e3b] text-white font-semibold text-xs hover:bg-[#047857] transition-all shadow-md"
              >
                Go to Marketplace <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {holdings.map((holding) => {
                const project = holding.projects || {};
                const holdingClass = holding.investor_class_at_pledge || investorClass;
                const holdingFeePercent = holding.fee_percent_at_pledge != null ? holding.fee_percent_at_pledge : 0;
                const conversionRights = getConversionRights(holdingClass, project);
                const currency = project.currency || "USD";
                const amount = Number(holding.allocated_amount || holding.pledged_amount || 0);

                return (
                  <div
                    key={holding.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6 space-y-5 relative overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-gray-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            {project.sharia_contract_type ? project.sharia_contract_type.replace("_", " ") : "Sukuk"}
                          </span>
                          <span className="text-xs font-bold bg-[#064e3b] text-white px-2.5 py-0.5 rounded">
                            Class {holdingClass} at Pledge
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            Pledge / Holding ID #{holding.id}
                          </span>
                        </div>
                        <h3 className="text-xl font-extrabold text-[#064e3b] mt-1.5 flex items-center gap-2">
                          <Link
                            href={`/investor-portal/projects/${project.slug}`}
                            className="hover:underline flex items-center gap-1.5"
                          >
                            {project.title || "Project Details"}
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </Link>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {holding.allocation_rank != null && (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                            Rank #{holding.allocation_rank}
                          </span>
                        )}
                        {(() => {
                          const badge = getPledgeStatusBadge(holding.status, holding);
                          return (
                            <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider border ${badge.className}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                      <div>
                        <div className="text-gray-500 font-medium">Allocated Amount</div>
                        <div className="text-base font-extrabold text-[#064e3b] mt-0.5">
                          {currency} {amount.toLocaleString()}
                        </div>
                        {Number(holding.refunded_amount) > 0 && (
                          <div className="text-[11px] text-teal-800 font-semibold mt-0.5">
                            Refunded: {currency} {Number(holding.refunded_amount).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">Units Held</div>
                        <div className="text-base font-extrabold text-[#064e3b] mt-0.5">
                          {(holding.allocated_units ?? holding.pledged_units) != null
                            ? Number(holding.allocated_units ?? holding.pledged_units).toLocaleString()
                            : "—"}{" "}
                          <span className="text-xs font-normal text-gray-500 capitalize">{project.unit_type || "units"}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">
                          {holding.ownership_percentage != null
                            ? "Ownership Stake"
                            : "Conversion Eligible Units"}
                        </div>
                        <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                          {holding.ownership_percentage != null ? (
                            <>{Number(Number(holding.ownership_percentage).toFixed(4))}%</>
                          ) : (
                            <>
                              {holding.conversion_eligible_units
                                ? Number(holding.conversion_eligible_units).toLocaleString()
                                : "0"}{" "}
                              <span className="text-xs font-normal text-gray-500">units</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">Investor Fee</div>
                        <div className="text-base font-bold text-gray-700 mt-0.5">
                          {holdingFeePercent}% (Class {holdingClass})
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">Allocated Date</div>
                        <div className="text-xs font-bold text-gray-700 mt-1">
                          {formatUtcDate(holding.allocated_at || holding.pledged_at || holding.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* CONVERSION CLAUSE CARD SECTION */}
                    {conversionRights && (
                      <div className="p-4 rounded-xl border space-y-3 bg-gradient-to-r from-emerald-50/40 via-white to-gray-50/60 border-emerald-100">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#064e3b]">
                              Conversion Clause Entitlement & Projected Equity
                            </h4>
                          </div>

                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${conversionRights.badgeClass}`}>
                            {conversionRights.badgeText}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600">
                          {conversionRights.description}
                        </p>

                        {conversionRights.eligible && !conversionRights.isSpvEquity && (
                          <div className="space-y-3 pt-2 border-t border-emerald-100/60">
                            {/* Conversion Rights Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Class {holdingClass} Value Cap</span>
                                <span className="font-extrabold text-[#064e3b]">{conversionRights.classCap}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Trigger Share Price</span>
                                <span className="font-extrabold text-[#064e3b]">{conversionRights.triggerPrice}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Conversion Ratio</span>
                                <span className="font-extrabold text-[#064e3b]">{conversionRights.ratio}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Conversion Cutoff (UTC)</span>
                                <span className="font-extrabold text-[#064e3b]">
                                  {formatUtcDate(conversionRights.deadline)}
                                </span>
                              </div>
                            </div>

                            {/* Live Conversion Outcome Projection */}
                            <div className="bg-emerald-900/5 p-3.5 rounded-xl border border-emerald-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div>
                                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                                  Your Conversion Outcome Upon Trigger
                                </span>
                                <span className="text-xs text-[#064e3b]/80">
                                  Converting <strong>{Number(holding.conversion_eligible_units || 0).toLocaleString()} Sukuk units</strong> out of {Number(holding.allocated_units ?? holding.pledged_units ?? 0).toLocaleString()} held units
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs text-gray-500 block">Potential Shares Acquired</span>
                                <span className="text-base font-black text-[#064e3b]">
                                  {(Number(holding.conversion_eligible_units || 0) * (conversionRights.ratioShares || 1)).toLocaleString()} Shares
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
