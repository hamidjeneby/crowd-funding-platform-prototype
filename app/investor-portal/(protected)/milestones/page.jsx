"use client";

import { useState } from "react";
import { Flag, ShieldCheck, CheckCircle2, Clock, Calendar, Building2, Cpu, Layers } from "lucide-react";

export default function MilestonesPage() {
  const heldProjects = [
    {
      id: "solaris",
      name: "Solaris Green Energy Infrastructure",
      category: "Renewable Energy",
      holdingAmount: "$20,000",
      milestones: [
        {
          id: 101,
          title: "Campaign Target Met & Escrow Funded",
          type: "system",
          status: "completed",
          date: "Aug 10, 2026",
          description: "All investor funds safely deposited into verified escrow account.",
        },
        {
          id: 102,
          title: "Custody Transfer & Asset Lock",
          type: "system",
          status: "completed",
          date: "Aug 20, 2026",
          description: "Smart contract custody transfer executed and confirmed on ledger.",
        },
        {
          id: 103,
          title: "Site Preparation & Solar Array Delivery",
          type: "issuer",
          status: "completed",
          date: "Sep 01, 2026",
          description: "Photovoltaic equipment arrived on site; foundation completed.",
        },
        {
          id: 104,
          title: "Grid Interconnection & Substation Integration",
          type: "issuer",
          status: "in_progress",
          date: "Target Oct 15, 2026",
          description: "Connecting solar array to primary regional electric grid.",
        },
        {
          id: 105,
          title: "First Dividend Distribution Escrow",
          type: "system",
          status: "scheduled",
          date: "Target Nov 15, 2026",
          description: "Quarterly yield distribution deposit to investor wallets.",
        },
      ],
    },
    {
      id: "aura",
      name: "Aura Luxury Residences",
      category: "Real Estate",
      holdingAmount: "$15,000",
      milestones: [
        {
          id: 201,
          title: "Campaign Target Met",
          type: "system",
          status: "completed",
          date: "Jul 14, 2026",
          description: "Fully funded by retail and accredited investor syndicate.",
        },
        {
          id: 202,
          title: "Groundbreaking & Excavation Phase",
          type: "issuer",
          status: "completed",
          date: "Aug 01, 2026",
          description: "Site permits cleared and excavation teams deployed.",
        },
        {
          id: 203,
          title: "Custody Transfer Complete",
          type: "system",
          status: "completed",
          date: "Aug 15, 2026",
          description: "Land title deed escrowed with security trustee.",
        },
        {
          id: 204,
          title: "Structural Concrete Framework",
          type: "issuer",
          status: "in_progress",
          date: "Target Oct 30, 2026",
          description: "Pouring levels 1 through 8 structural support pillars.",
        },
      ],
    },
    {
      id: "apex",
      name: "Apex Logistics Tech Hub",
      category: "Commercial Infra",
      holdingAmount: "$10,000",
      milestones: [
        {
          id: 301,
          title: "Escrow Deposit Confirmed",
          type: "system",
          status: "completed",
          date: "Jun 10, 2026",
          description: "Primary funding tranche deposited and verified.",
        },
        {
          id: 302,
          title: "Warehouse Automation Rig Setup",
          type: "issuer",
          status: "in_progress",
          date: "Target Oct 01, 2026",
          description: "Installing robotics sorting arm systems in main facility.",
        },
      ],
    },
  ];

  const [selectedProjectId, setSelectedProjectId] = useState("all");

  const filteredProjects =
    selectedProjectId === "all"
      ? heldProjects
      : heldProjects.filter((p) => p.id === selectedProjectId);

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
            Unified timeline of system-generated milestones and issuer operational progress for your active holdings.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedProjectId("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedProjectId === "all"
                ? "bg-[#064e3b] text-white shadow-xs"
                : "bg-white text-[#064e3b] border border-[#059669]/20 hover:bg-emerald-50"
            }`}
          >
            All Holdings ({heldProjects.length})
          </button>
          {heldProjects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedProjectId === p.id
                  ? "bg-[#064e3b] text-white shadow-xs"
                  : "bg-white text-[#064e3b] border border-[#059669]/20 hover:bg-emerald-50"
              }`}
            >
              {p.name.split(" ")[0]} ({p.holdingAmount})
            </button>
          ))}
        </div>
      </div>

      {/* Timelines per Project */}
      <div className="space-y-10">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="p-6 lg:p-8 rounded-2xl bg-white border border-[#059669]/15 shadow-sm space-y-6"
          >
            {/* Project Banner Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-[#059669] uppercase tracking-wider">
                  {project.category}
                </span>
                <h2 className="text-2xl font-bold text-[#064e3b]">{project.name}</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 font-medium">Position Held</span>
                <div className="text-lg font-black text-[#064e3b]">{project.holdingAmount}</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pl-6 border-l-2 border-emerald-200 space-y-8 my-4">
              {project.milestones.map((m) => {
                let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
                let dotIcon = <CheckCircle2 className="w-5 h-5 text-emerald-600 bg-white rounded-full" />;

                if (m.status === "in_progress") {
                  badgeColor = "bg-amber-100 text-amber-900 border-amber-300";
                  dotIcon = <Clock className="w-5 h-5 text-amber-600 bg-white rounded-full animate-pulse" />;
                } else if (m.status === "scheduled") {
                  badgeColor = "bg-gray-100 text-gray-700 border-gray-300";
                  dotIcon = <Calendar className="w-5 h-5 text-gray-400 bg-white rounded-full" />;
                }

                return (
                  <div key={m.id} className="relative group">
                    {/* Icon Dot */}
                    <div className="absolute -left-[35px] top-0.5 z-10">{dotIcon}</div>

                    <div className="bg-[#fcfaf7] p-5 rounded-2xl border border-[#059669]/15 shadow-xs space-y-2 group-hover:border-[#059669]/30 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              m.type === "system"
                                ? "bg-emerald-900 text-emerald-100 border-emerald-800"
                                : "bg-teal-700 text-teal-50 border-teal-600"
                            }`}
                          >
                            {m.type === "system" ? "System Generated" : "Issuer Defined"}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">{m.date}</span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badgeColor}`}
                        >
                          {m.status.replace("_", " ")}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#064e3b]">{m.title}</h3>
                      <p className="text-xs text-[#064e3b]/75 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
