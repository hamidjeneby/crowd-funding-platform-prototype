"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileX,
  Plus,
  ArrowUpRight,
  FolderOpen,
  Calendar,
  Building2,
  Flag,
  ShieldAlert,
} from "lucide-react";

export default function IssuerPortalDashboard() {
  // Dummy cross-project snapshot data for visualization
  const actionItems = [
    {
      id: 1,
      projectTitle: "Apex Logistics Tech Hub",
      projectSlug: "apex-logistics-tech-hub",
      type: "rejected_document",
      severity: "high",
      title: "Valuation Report Needs Revision",
      message:
        "Auditor requested updated 2026 Q2 independent valuation report with certified auditor signature stamp.",
      date: "2 hours ago",
    },
    {
      id: 2,
      projectTitle: "Oasis Green Residential",
      projectSlug: "oasis-green-residential",
      type: "changes_requested",
      severity: "medium",
      title: "SPV Cap Table Clarification Required",
      message:
        "Please clarify Class B preferred share allocation ratio in section 4.2 of the submitted Cap Table.",
      date: "1 day ago",
    },
  ];

  const projectStatusCounts = [
    { label: "Draft", count: 1, bg: "bg-gray-100 text-gray-700 border-gray-200" },
    { label: "In Review", count: 1, bg: "bg-amber-100 text-amber-800 border-amber-200" },
    { label: "Campaign Live", count: 3, bg: "bg-emerald-100 text-[#064e3b] border-emerald-200" },
    { label: "Funded", count: 2, bg: "bg-teal-100 text-teal-800 border-teal-200" },
    { label: "Closed", count: 2, bg: "bg-slate-100 text-slate-800 border-slate-200" },
  ];

  const upcomingMilestones = [
    {
      id: 101,
      projectTitle: "Solaris Green Energy Phase II",
      projectSlug: "solaris-green-energy",
      milestone: "Municipal Grid Tie-in Audit",
      source: "system",
      targetDate: "Oct 12, 2026",
      daysLeft: 16,
      status: "in_progress",
    },
    {
      id: 102,
      projectTitle: "Aura Luxury Residences",
      projectSlug: "aura-luxury-residences",
      milestone: "Phase 2 Structural Foundation Verification",
      source: "issuer",
      targetDate: "Oct 28, 2026",
      daysLeft: 32,
      status: "pending_confirmation",
    },
    {
      id: 103,
      projectTitle: "Horizon Logistics Terminal",
      projectSlug: "horizon-logistics-terminal",
      milestone: "SPV Escrow Release Verification",
      source: "system",
      targetDate: "Nov 05, 2026",
      daysLeft: 40,
      status: "scheduled",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 text-[#064e3b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <Building2 className="w-4 h-4" /> Issuer Executive Dashboard
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Portfolio Overview
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Cross-project snapshot, capital metrics, action items, and live milestone trackers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/issuer-portal/projects/new"
            className="px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Project
          </Link>
        </div>
      </div>

      {/* SURFACED REVIEWER ACTION ITEMS BANNER (SURFACED RIGHT AT TOP) */}
      {actionItems.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-amber-600 animate-pulse" />
              <span>Pending Reviewer Action Items ({actionItems.length})</span>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-200/80 px-2.5 py-1 rounded-full">
              Blocking Items Surfaced
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      {item.projectTitle}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">{item.date}</span>
                  </div>
                  <h4 className="font-bold text-xs text-gray-900">{item.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.message}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <Link
                    href={`/issuer-portal/projects`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900"
                  >
                    Resolve in Project <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* METRIC SNAPSHOT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Capital Raised
            </span>
            <div className="w-9 h-9 bg-emerald-100 text-[#059669] rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#064e3b]">$18,450,000</div>
          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Across 9 projects total
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Live Campaigns
            </span>
            <div className="w-9 h-9 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#064e3b]">3 Active</div>
          <p className="text-xs text-gray-500 font-semibold">
            Avg 78% target goal achieved
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              In Review / Draft
            </span>
            <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#064e3b]">2 Pending</div>
          <p className="text-xs text-amber-700 font-semibold">
            1 Draft, 1 Pending Audit Review
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Funded & Closed
            </span>
            <div className="w-9 h-9 bg-[#064e3b] text-emerald-300 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#064e3b]">4 Completed</div>
          <p className="text-xs text-emerald-700 font-semibold">
            100% distribution compliance
          </p>
        </div>
      </div>

      {/* PROJECT STATUS BREAKDOWN GRID */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-[#064e3b]">
          Cross-Project Status Snapshot
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {projectStatusCounts.map((s, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border text-center space-y-1 ${s.bg}`}
            >
              <span className="text-xs font-bold uppercase tracking-wider block">
                {s.label}
              </span>
              <span className="text-2xl font-extrabold block">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* UPCOMING MILESTONE DEADLINES ACROSS LIVE PROJECTS */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-[#064e3b]">
              Upcoming Milestone Deadlines Across Live Projects
            </h3>
            <p className="text-xs text-gray-500">
              Track progress, system audits, and confirmation status.
            </p>
          </div>
          <Link
            href="/issuer-portal/projects"
            className="text-xs font-bold text-[#059669] hover:underline flex items-center gap-1"
          >
            Manage Projects <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {upcomingMilestones.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-2xl border border-gray-100 hover:border-emerald-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
                  <Flag className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {m.projectTitle}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 uppercase">
                      {m.source} milestone
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-gray-900">{m.milestone}</h4>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                <div className="text-right text-xs">
                  <span className="text-gray-400 font-medium block">Target Date</span>
                  <span className="font-bold text-[#064e3b]">{m.targetDate}</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-100 text-[#064e3b] font-bold text-xs border border-emerald-200">
                  {m.daysLeft} Days Left
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
