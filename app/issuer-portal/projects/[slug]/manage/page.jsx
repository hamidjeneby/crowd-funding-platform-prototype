"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sliders,
  PieChart,
  Flag,
  FileText,
  ShieldCheck,
  Sparkles,
  DollarSign,
  Info,
  Clock,
  CheckCircle2,
  Building2,
  TrendingUp,
} from "lucide-react";

export default function ProjectManagementPage({ params }) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: PieChart },
    { id: "roadmap", label: "Roadmap & Milestones", icon: Flag },
    { id: "documents", label: "Documents & Rejections", icon: FileText },
    { id: "underwriting", label: "Underwriting (Class 1)", icon: ShieldCheck },
    { id: "conversion", label: "Conversion & Valuations", icon: Sparkles },
    { id: "distributions", label: "Distributions & Profit", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 text-[#064e3b]">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div className="space-y-1">
          <Link
            href="/issuer-portal/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Projects
          </Link>
          <div className="flex items-center gap-2 pt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#064e3b] font-bold text-[10px] uppercase border border-emerald-200">
              Live Project Management
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b]">
            Project Management Hub
          </h1>
        </div>

        <div className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-[#064e3b] text-xs font-bold flex items-center gap-2 shadow-xs">
          <Sliders className="w-4 h-4 text-[#059669]" />
          <span>Specification Architecture Ready</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#064e3b] text-white shadow-sm"
                  : "bg-white text-[#064e3b] border border-gray-200 hover:bg-emerald-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-emerald-300" : "text-[#059669]"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Upcoming Feature Specification Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#059669]">
          <Info className="w-4 h-4" /> Feature Specification Preview
        </div>
        <h3 className="text-lg font-bold text-[#064e3b]">
          Per-Project Management Tab: {tabs.find((t) => t.id === activeTab)?.label}
        </h3>
        <p className="text-xs text-[#064e3b]/80 leading-relaxed max-w-3xl">
          The architecture and complete workflow for this tab are specified in detail in{" "}
          <code className="bg-white px-2 py-0.5 rounded font-mono text-emerald-800 border border-emerald-300">
            project_management_guide.md
          </code>
          .
        </p>
      </div>

      {/* Interactive Tab Preview Mockups */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs space-y-6">
          <h3 className="font-bold text-base text-[#064e3b]">Live Overview & Investor Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
              <span className="text-xs text-gray-500 font-semibold block">Class 1 Institutional</span>
              <span className="text-2xl font-extrabold text-[#064e3b] block">2 Investors</span>
              <span className="text-xs text-emerald-700 font-bold">$10,000,000 Total</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
              <span className="text-xs text-gray-500 font-semibold block">Class 2 High Net Worth</span>
              <span className="text-2xl font-extrabold text-[#064e3b] block">5 Investors</span>
              <span className="text-xs text-emerald-700 font-bold">$5,000,000 Total</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
              <span className="text-xs text-gray-500 font-semibold block">Class 3-10 Retail</span>
              <span className="text-2xl font-extrabold text-[#064e3b] block">28 Investors</span>
              <span className="text-xs text-emerald-700 font-bold">$3,450,000 Total</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "roadmap" && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-[#064e3b]">Milestone Roadmap Management</h3>
          <p className="text-xs text-gray-600">
            Submit milestone completions for auditor review, add new issuer milestones, and track system verification events.
          </p>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-[#064e3b]">Document Repository & Review Notes</h3>
          <p className="text-xs text-gray-600">
            View uploaded pitch decks, valuation reports, and cap tables alongside auditor feedback notes. Live document replacement triggers draft-lock review exceptions.
          </p>
        </div>
      )}

      {activeTab === "underwriting" && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-[#064e3b]">Institutional Underwriting Tranches</h3>
          <p className="text-xs text-gray-600">
            Read-only status displaying Class 1 lead underwriter commitments and syndicate allocations.
          </p>
        </div>
      )}

      {activeTab === "conversion" && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-[#064e3b]">Conversion & SPV Valuation Triggers</h3>
          <p className="text-xs text-gray-600">
            Track SPV unit trigger prices and submit updated valuation reports following funding rounds or audited statements.
          </p>
        </div>
      )}

      {activeTab === "distributions" && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-[#064e3b]">Distribution Reporting & Schedules</h3>
          <p className="text-xs text-gray-600">
            Report period profits for Mudarabah contracts (subject to reviewer confirmation) or view fixed payout schedules for Murabaha/Ijara contracts.
          </p>
        </div>
      )}
    </div>
  );
}
