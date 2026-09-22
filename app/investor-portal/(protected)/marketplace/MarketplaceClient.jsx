"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Filter,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Layers,
  Sparkles,
  Building2,
  Clock,
} from "lucide-react";

function formatUtcDate(dateString) {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
  } catch (e) {
    return null;
  }
}


export default function MarketplaceClient({
  projects,
  investorClass,
  investorClassName,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContract, setSelectedContract] = useState("all");

  const contractOptions = [
    { value: "all", label: "All Structures" },
    { value: "murabaha", label: "Murabaha" },
    { value: "mudaraba", label: "Mudaraba" },
    { value: "ijara", label: "Ijara" },
    { value: "spv_equity", label: "SPV Equity" },
  ];

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.summary?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesContract =
      selectedContract === "all" ||
      (p.sharia_contract_type &&
        p.sharia_contract_type.toLowerCase() ===
          selectedContract.toLowerCase());

    return matchesSearch && matchesContract;
  });

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Header Section */}
      <div className="border-b border-[#059669]/15 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Marketplace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#064e3b] mt-1">
            Investment Opportunities
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Institutional & Sharia-compliant crowdfunding deals tailored for
            your eligibility class.
          </p>
        </div>

        {/* Investor Class Badge */}
        <div className="flex items-center gap-3 bg-white border border-[#059669]/20 rounded-2xl p-3 shadow-sm self-start md:self-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Active Access Tier
            </span>
            <span className="text-xs font-bold text-[#064e3b]">
              Class {investorClass}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669] transition-all text-gray-800"
          />
        </div>

        {/* Contract Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400 hidden sm:inline" />
          <select
            value={selectedContract}
            onChange={(e) => setSelectedContract(e.target.value)}
            className="w-full sm:w-48 py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669] text-gray-700 font-medium cursor-pointer"
          >
            {contractOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const currency = project.currency || "USD";
            const targetGoal = Number(project.target_goal) || 0;
            const raised = Number(project.live_raised_amount) || 0;
            const rawPercent = targetGoal > 0 ? (raised / targetGoal) * 100 : 0;
            const progressPercent = Math.min(rawPercent, 100).toFixed(1);
            const minFloor = Number(project.min_investment_floor) || 0;

            const isPendingReview = project.status === "pending_review";
            const isSpvEquity = project.sharia_contract_type === "spv_equity";

            return (
              <div
                key={project.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Image & Header Badges */}
                <div className="relative aspect-video w-full bg-gray-100 overflow-hidden">
                  {project.cover_image_url ? (
                    <img
                      src={project.cover_image_url}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#064e3b] to-[#047857] flex items-center justify-center text-emerald-200/50 p-6 text-center">
                      <Building2 className="w-12 h-12 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    {/* Pre-Audit Badge for Class 1 */}
                    {isPendingReview ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white font-bold text-xs shadow-md">
                        <AlertTriangle className="w-3.5 h-3.5" /> Pre-Audit /
                        Unreviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white font-semibold text-xs shadow-sm capitalize">
                        Live Campaign
                      </span>
                    )}

                    {/* Sharia Contract Type Tag */}
                    {project.sharia_contract_type && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-300 font-mono text-[11px] uppercase tracking-wider shadow-sm">
                        <Layers className="w-3 h-3 text-emerald-400" />
                        {project.sharia_contract_type.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-lg text-[#064e3b] line-clamp-1 group-hover:text-[#059669] transition-colors">
                        {project.title}
                      </h3>

                      {/* ROI Badge (HIDDEN FOR SPV EQUITY) */}
                      {!isSpvEquity && project.expected_roi_percent != null && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200 font-bold text-xs">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {project.expected_roi_percent}% ROI
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {project.summary ||
                        "No summary provided for this project."}
                    </p>
                  </div>

                  {/* Funding Progress Section */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">
                        Progress ({progressPercent}%)
                      </span>
                      <span className="font-bold text-[#064e3b]">
                        {currency} {raised.toLocaleString()} /{" "}
                        {targetGoal.toLocaleString()}
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#059669] to-[#047857] rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Campaign End Date (UTC) */}
                    {project.campaign_end_date && formatUtcDate(project.campaign_end_date) && (
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-gray-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" /> Deadline (UTC):
                        </span>
                        <span className="font-bold text-gray-700">
                          {formatUtcDate(project.campaign_end_date)}
                        </span>
                      </div>
                    )}
                  </div>


                  {/* Floor Investment & Action Button */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Minimum Ticket
                      </span>
                      <span className="text-xs font-extrabold text-[#064e3b]">
                        Invest from {currency} {minFloor.toLocaleString()}
                      </span>
                    </div>

                    {/* Single View Project Button */}
                    <Link
                      href={`/investor-portal/projects/${project.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#064e3b] text-white font-semibold text-xs hover:bg-[#047857] transition-all shadow-sm group-hover:shadow"
                    >
                      View Project
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#064e3b]">
            No Matching Opportunities
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            There are currently no campaigns matching your criteria available
            for your active access class. Check back soon or request a class
            upgrade.
          </p>
        </div>
      )}
    </div>
  );
}
