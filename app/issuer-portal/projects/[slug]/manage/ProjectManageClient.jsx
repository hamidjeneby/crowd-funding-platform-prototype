"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  PieChart,
  Flag,
  FileText,
  Sparkles,
  DollarSign,
  Edit3,
  AlertCircle,
  Building2,
  ExternalLink,
  Eye,
} from "lucide-react";

import OverviewTab from "./components/OverviewTab";
import RoadmapTab from "./components/RoadmapTab";
import DocumentsTab from "./components/DocumentsTab";
import ConversionTab from "./components/ConversionTab";
import DistributionsTab from "./components/DistributionsTab";

export default function ProjectManageClient({ data }) {
  const { isDraft, project, totalInvestorCount, classBreakdown, statusCounts, milestones, documents } = data;

  const [activeTab, setActiveTab] = useState("overview");

  // Tab configuration array for dynamic tab rendering and future extensibility
  const TABS_CONFIG = [
    {
      key: "overview",
      label: "Overview",
      icon: PieChart,
      visible: () => true,
      component: OverviewTab,
    },
    {
      key: "roadmap",
      label: "Roadmap",
      icon: Flag,
      visible: () => true,
      component: RoadmapTab,
    },
    {
      key: "documents",
      label: "Documents",
      icon: FileText,
      visible: () => true,
      component: DocumentsTab,
    },
    {
      key: "conversion",
      label: "Conversion",
      icon: Sparkles,
      visible: (p) =>
        Boolean(
          p.is_spv &&
            p.spv_details?.conversion_enabled &&
            p.sharia_contract_type !== "spv_equity"
        ),
      component: ConversionTab,
    },
    {
      key: "distributions",
      label: "Distributions",
      icon: DollarSign,
      visible: () => true,
      component: DistributionsTab,
    },
  ];

  // Filter tabs by visibility condition for this project
  const visibleTabs = TABS_CONFIG.filter((t) => t.visible(project));

  // If project is still draft, show draft notice banner without rendering management tabs
  if (isDraft) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] p-4 sm:p-6 lg:p-10 space-y-8 text-[#064e3b]">
        {/* Top Navigation */}
        <div>
          <Link
            href="/issuer-portal/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Projects
          </Link>
          <h1 className="text-3xl font-extrabold text-[#064e3b]">{project.title || "Project Management"}</h1>
        </div>

        {/* Draft Banner Notice */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-8 sm:p-10 space-y-6 text-center max-w-3xl mx-auto shadow-md">
          <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
              Draft Status
            </span>
            <h2 className="text-2xl font-extrabold text-amber-950">This project is still a draft</h2>
            <p className="text-sm text-amber-900/80 max-w-xl mx-auto leading-relaxed">
              Project management tools and live investor analytics unlock once your campaign draft is completed and submitted for platform review.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/issuer-portal/projects/${project.slug || project.id}/edit`}
              className="px-6 py-3 bg-[#064e3b] text-white font-bold text-sm rounded-xl hover:bg-[#047857] transition-all shadow-md flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Continue Editing Draft
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Submitted Project Hub
  const ActiveTabComponent = visibleTabs.find((t) => t.key === activeTab)?.component || OverviewTab;

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-4 sm:p-6 lg:p-10 space-y-8 text-[#064e3b]">
      {/* Top Header */}
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
              Project Management Hub
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] uppercase border border-amber-200">
              {project.status?.replace("_", " ")}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b]">{project.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/issuer-portal/projects/${project.slug}/preview`}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-[#064e3b] text-xs font-bold flex items-center gap-2 shadow-xs hover:bg-gray-50"
          >
            <Eye className="w-4 h-4 text-[#059669]" />
            <span>Public Listing Preview</span>
          </Link>
        </div>
      </div>

      {/* Dynamic Config Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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

      {/* Active Tab View */}
      <div className="pt-2">
        <ActiveTabComponent
          projectId={project.id}
          project={project}
          totalInvestorCount={totalInvestorCount}
          classBreakdown={classBreakdown}
          statusCounts={statusCounts}
          initialMilestones={milestones}
          documents={documents}
        />
      </div>
    </div>
  );
}
