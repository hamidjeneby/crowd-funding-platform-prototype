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
                  You haven't submitted any project pledges yet. Browse open projects on the marketplace to pledge funds.
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
                const conversionRights = getConversionRights(investorClass, project);
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            {project.sharia_contract_type ? project.sharia_contract_type.replace("_", " ") : "Sukuk"}
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
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs uppercase tracking-wider border border-emerald-200">
                          {pledge.status || "Pledged"}
                        </span>
                      </div>
                    </div>

                    {/* Financial details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-gray-50/70 p-4 rounded-xl border border-gray-100">
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
                        <div className="text-gray-500 font-medium">Investor Fee ({pledge.fee_percent_at_pledge || "0"}%)</div>
                        <div className="text-base font-bold text-gray-700 mt-0.5">
                          {currency} {fee.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">Total Cost Debited</div>
                        <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                          {currency} {(amount + fee).toLocaleString()}
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
                              Conversion Clause Entitlement
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
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-emerald-100/60">
                            <div>
                              <span className="text-gray-500 block text-[11px]">Class {investorClass} Cap</span>
                              <span className="font-bold text-[#064e3b]">{conversionRights.classCap}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[11px]">Trigger Share Price</span>
                              <span className="font-bold text-[#064e3b]">{conversionRights.triggerPrice}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[11px]">Conversion Ratio</span>
                              <span className="font-bold text-[#064e3b]">{conversionRights.ratio}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[11px]">Conversion Deadline</span>
                              <span className="font-bold text-[#064e3b]">
                                {formatUtcDate(conversionRights.deadline)}
                              </span>
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
                const conversionRights = getConversionRights(investorClass, project);
                const currency = project.currency || "USD";
                const amount = Number(holding.principal_amount || 0);

                return (
                  <div
                    key={holding.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6 space-y-5 relative overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-gray-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            {project.sharia_contract_type ? project.sharia_contract_type.replace("_", " ") : "Sukuk"}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            Holding ID #{holding.id}
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
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs uppercase tracking-wider border border-emerald-200">
                          {holding.status || "Active"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                      <div>
                        <div className="text-gray-500 font-medium">Principal Amount</div>
                        <div className="text-base font-extrabold text-[#064e3b] mt-0.5">
                          {currency} {amount.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">Units Held</div>
                        <div className="text-base font-extrabold text-[#064e3b] mt-0.5">
                          {holding.units_held ? holding.units_held.toLocaleString() : "—"}{" "}
                          <span className="text-xs font-normal text-gray-500 capitalize">{project.unit_type || "units"}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">Conversion Eligible Units</div>
                        <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                          {holding.conversion_eligible_units ? holding.conversion_eligible_units.toLocaleString() : "0"}{" "}
                          <span className="text-xs font-normal text-gray-500">units</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 font-medium">Issued Date</div>
                        <div className="text-xs font-bold text-gray-700 mt-1">
                          {formatUtcDate(holding.issued_at || holding.created_at)}
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
                              Conversion Clause Entitlement
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
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-emerald-100/60">
                            <div>
                              <span className="text-gray-500 block text-[11px]">Class {investorClass} Cap</span>
                              <span className="font-bold text-[#064e3b]">{conversionRights.classCap}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[11px]">Trigger Share Price</span>
                              <span className="font-bold text-[#064e3b]">{conversionRights.triggerPrice}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[11px]">Conversion Ratio</span>
                              <span className="font-bold text-[#064e3b]">{conversionRights.ratio}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[11px]">Conversion Deadline</span>
                              <span className="font-bold text-[#064e3b]">
                                {formatUtcDate(conversionRights.deadline)}
                              </span>
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
