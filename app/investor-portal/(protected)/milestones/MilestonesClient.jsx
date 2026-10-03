"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Flag,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  Search,
  ChevronRight,
  TrendingUp,
  Layers,
  ArrowUpRight,
  Briefcase,
  Sparkles,
} from "lucide-react";

function formatUtcDate(dateString) {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return null;
  }
}

export default function MilestonesClient({ heldProjects = [] }) {
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate overall portfolio metrics across held projects
  const totalProjectsCount = heldProjects.length;
  const totalPortfolioValue = useMemo(() => {
    return heldProjects.reduce((sum, p) => sum + (p.holdingAmount || 0), 0);
  }, [heldProjects]);

  const totalMilestonesCount = useMemo(() => {
    return heldProjects.reduce((sum, p) => sum + (p.milestones?.length || 0), 0);
  }, [heldProjects]);

  // Filter projects by dropdown selection
  const projectsToDisplay = useMemo(() => {
    if (selectedProjectId === "all") return heldProjects;
    return heldProjects.filter((p) => String(p.id) === String(selectedProjectId));
  }, [heldProjects, selectedProjectId]);

  // Function to filter a project's milestones based on search & status
  const getFilteredMilestones = (milestones = []) => {
    return milestones.filter((m) => {
      // Status filter
      if (statusFilter !== "all") {
        const mStatus = (m.status || "").toLowerCase();
        if (statusFilter === "completed" && mStatus !== "completed") return false;
        if (statusFilter === "in_progress" && mStatus !== "in_progress") return false;
        if (
          statusFilter === "upcoming" &&
          !["upcoming", "scheduled"].includes(mStatus)
        )
          return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (m.title || "").toLowerCase().includes(query);
        const descMatch = (m.description || "").toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }

      return true;
    });
  };

  const hasAnyMatchingMilestones = useMemo(() => {
    return projectsToDisplay.some(
      (p) => getFilteredMilestones(p.milestones).length > 0
    );
  }, [projectsToDisplay, statusFilter, searchQuery]);

  if (totalProjectsCount === 0) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
              <ShieldCheck className="w-4 h-4" /> Portfolio Milestones
            </div>
            <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
              Invested Project Roadmaps
            </h1>
            <p className="text-sm text-[#064e3b]/70 mt-0.5">
              Unified timeline of system milestones and issuer operational progress for your active holdings.
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-3xl border border-[#059669]/15 p-10 lg:p-16 text-center max-w-2xl mx-auto space-y-6 shadow-xs my-8">
          <div className="w-20 h-20 bg-emerald-50 text-[#059669] rounded-3xl flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
            <Flag className="w-10 h-10 text-[#059669]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-[#064e3b]">
              No Pledged Projects Found
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
              You haven't pledged to any active projects yet. Verified platform milestones and issuer progress updates will automatically appear here once you make your first pledge.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/investor-portal/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#064e3b] hover:bg-[#047857] text-white font-bold text-xs sm:text-sm transition-all shadow-md"
            >
              Explore Marketplace <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Portfolio Milestones
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Invested Project Roadmaps
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Unified timeline of system-generated milestones and verified issuer progress for your active holdings.
          </p>
        </div>

        <Link
          href="/investor-portal/marketplace"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#059669]/30 text-[#064e3b] font-semibold text-xs sm:text-sm hover:bg-emerald-50 transition-all shadow-xs self-start md:self-auto"
        >
          Explore Marketplace <ArrowUpRight className="w-4 h-4 text-[#059669]" />
        </Link>
      </div>

      {/* Top Stat Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-[#059669]/15 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-[#059669] rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
            <Building2 className="w-6 h-6 text-[#059669]" />
          </div>
          <div>
            <span className="text-xs text-[#064e3b]/70 font-semibold uppercase tracking-wider block">
              Pledged Projects
            </span>
            <span className="text-2xl font-black text-[#064e3b]">
              {totalProjectsCount} {totalProjectsCount === 1 ? "Project" : "Projects"}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 to-[#064e3b] text-white shadow-md flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 text-emerald-300 rounded-xl flex items-center justify-center border border-white/20 shrink-0">
            <Briefcase className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <span className="text-xs text-emerald-200/80 font-semibold uppercase tracking-wider block">
              Portfolio Position Held
            </span>
            <span className="text-2xl font-black text-white">
              USD {totalPortfolioValue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#059669]/15 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-[#059669] rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
            <Flag className="w-6 h-6 text-[#059669]" />
          </div>
          <div>
            <span className="text-xs text-[#064e3b]/70 font-semibold uppercase tracking-wider block">
              Tracked Milestones
            </span>
            <span className="text-2xl font-black text-[#064e3b]">
              {totalMilestonesCount} {totalMilestonesCount === 1 ? "Milestone" : "Milestones"}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#059669]/15 p-4 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search milestones..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs text-[#064e3b] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
            />
          </div>

          {/* Scalable Project Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#064e3b] bg-white focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] cursor-pointer"
            >
              <option value="all">
                All Pledged Projects ({totalProjectsCount})
              </option>
              {heldProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.currency} {p.holdingAmount.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "all", label: "All Statuses" },
              { id: "completed", label: "Completed" },
              { id: "in_progress", label: "In Progress" },
              { id: "upcoming", label: "Upcoming" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-2 rounded-xl text-[11px] font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === st.id
                    ? "bg-[#064e3b] text-white shadow-2xs"
                    : "bg-gray-50 text-[#064e3b] border border-gray-200 hover:bg-emerald-50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Project Milestone Timelines */}
      {!hasAnyMatchingMilestones ? (
        <div className="p-8 text-center text-xs text-gray-500 bg-white rounded-3xl border border-gray-200/80 space-y-3">
          <p className="font-semibold text-gray-700 text-sm">No milestones found matching your search or filter options.</p>
          <button
            onClick={() => {
              setSelectedProjectId("all");
              setStatusFilter("all");
              setSearchQuery("");
            }}
            className="px-4 py-2 rounded-xl bg-emerald-50 text-[#064e3b] font-bold text-xs border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {projectsToDisplay.map((project) => {
            const filteredMs = getFilteredMilestones(project.milestones);

            if (filteredMs.length === 0 && (searchQuery || statusFilter !== "all")) {
              return null; // Hide project if search/status filter active and no matching milestones
            }

            return (
              <div
                key={project.id}
                className="p-6 lg:p-8 rounded-3xl bg-white border border-[#059669]/15 shadow-xs space-y-6"
              >
                {/* Project Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#064e3b] font-extrabold text-[10px] uppercase tracking-wider border border-emerald-200">
                      {project.category}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#064e3b]">
                      {project.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-4 self-start sm:self-auto">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
                        Position Held
                      </span>
                      <span className="text-base sm:text-lg font-black text-[#064e3b]">
                        {project.currency} {project.holdingAmount.toLocaleString()}
                      </span>
                    </div>

                    <Link
                      href={`/investor-portal/projects/${project.slug}`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] border border-emerald-200/80 font-bold text-xs transition-colors shrink-0 flex items-center gap-1"
                    >
                      View Project <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Milestones List */}
                {filteredMs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-[#fcfaf7] rounded-2xl border border-dashed border-gray-200">
                    No verified milestones published for this project yet.
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-emerald-200 space-y-6 my-2">
                    {filteredMs.map((m) => {
                      const mStatus = (m.status || "").toLowerCase();
                      const rawVStatus =
                        m.mileston_verification_status ??
                        m.milestone_verification_status ??
                        m.verification_status;
                      const isVerified =
                        String(rawVStatus || "").trim().toLowerCase() === "approved";

                      let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
                      let dotIcon = (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 bg-white rounded-full" />
                      );

                      if (mStatus === "in_progress") {
                        badgeColor = "bg-amber-100 text-amber-900 border-amber-300";
                        dotIcon = (
                          <Clock className="w-5 h-5 text-amber-600 bg-white rounded-full animate-pulse" />
                        );
                      } else if (["upcoming", "scheduled"].includes(mStatus)) {
                        badgeColor = "bg-gray-100 text-gray-700 border-gray-300";
                        dotIcon = (
                          <Calendar className="w-5 h-5 text-gray-400 bg-white rounded-full" />
                        );
                      }

                      const formattedDate = formatUtcDate(m.target_date);

                      return (
                        <div key={m.id} className="relative group">
                          {/* Dot Icon */}
                          <div className="absolute -left-[35px] top-1 z-10">
                            {dotIcon}
                          </div>

                          <div className="bg-[#fcfaf7] p-5 rounded-2xl border border-[#059669]/15 shadow-xs space-y-2.5 group-hover:border-[#059669]/30 transition-all">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                    m.milestone_source === "system"
                                      ? "bg-emerald-950 text-emerald-200 border-emerald-800"
                                      : "bg-teal-800 text-teal-100 border-teal-700"
                                  }`}
                                >
                                  {m.milestone_source === "system"
                                    ? "Platform System"
                                    : "Issuer Milestone"}
                                </span>

                                {isVerified && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-[#059669]" /> Verified
                                  </span>
                                )}

                                {formattedDate && (
                                  <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />{" "}
                                    {formattedDate}
                                  </span>
                                )}
                              </div>

                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badgeColor}`}
                              >
                                {mStatus.replace("_", " ")}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-[#064e3b]">
                              {m.title}
                            </h3>
                            {m.description && (
                              <p className="text-xs text-[#064e3b]/75 leading-relaxed">
                                {m.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
