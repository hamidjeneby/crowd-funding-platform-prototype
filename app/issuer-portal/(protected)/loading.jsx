import React from "react";

export default function LoadingIssuerDashboard() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 animate-pulse text-[#064e3b]">
      {/* SECTION 1: HEADER BANNER SKELETON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          {/* Org & KYB Status Badges */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-44 rounded-full bg-emerald-100/70 border border-emerald-200/50"></div>
            <div className="h-6 w-32 rounded-full bg-emerald-100/70 border border-emerald-200/50"></div>
          </div>

          {/* Dashboard Title & Subtitle */}
          <div className="h-9 bg-emerald-900/15 rounded-xl w-64 sm:w-80 mt-2"></div>
          <div className="h-4 bg-emerald-900/10 rounded-md w-80 sm:w-96 mt-1.5"></div>
        </div>

        {/* Action Button Skeleton */}
        <div className="h-10 w-44 rounded-xl bg-emerald-900/20 shadow-xs shrink-0"></div>
      </div>

      {/* SECTION 2: TOP STAT CARDS SKELETON (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { labelW: "w-28", valW: "w-36", subW: "w-32", iconBg: "bg-emerald-100" },
          { labelW: "w-24", valW: "w-28", subW: "w-28", iconBg: "bg-teal-100" },
          { labelW: "w-28", valW: "w-24", subW: "w-36", iconBg: "bg-gray-100" },
          { labelW: "w-32", valW: "w-28", subW: "w-28", iconBg: "bg-amber-100" },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className={`h-3 ${card.labelW} bg-gray-200 rounded`}></div>
              <div className={`w-9 h-9 ${card.iconBg} rounded-xl`}></div>
            </div>
            <div className={`h-8 ${card.valW} bg-emerald-900/15 rounded-lg`}></div>
            <div className={`h-3 ${card.subW} bg-gray-200 rounded`}></div>
          </div>
        ))}
      </div>

      {/* SECTION 3: LIVE PROJECTS SNAPSHOT SKELETON */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="space-y-1.5">
            <div className="h-6 w-52 bg-emerald-900/15 rounded-md"></div>
            <div className="h-3.5 w-80 sm:w-96 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 w-32 bg-emerald-100 rounded"></div>
        </div>

        {/* Project Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#fcfaf7] rounded-2xl p-5 border border-gray-200/80 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="h-5 w-24 bg-gray-200 rounded-full"></div>
                <div className="h-5 w-44 bg-emerald-900/15 rounded-md"></div>
                <div className="space-y-1 pt-0.5">
                  <div className="h-3 w-full bg-gray-200 rounded"></div>
                  <div className="h-3 w-4/5 bg-gray-200 rounded"></div>
                </div>
              </div>

              {/* Progress Box Skeleton */}
              <div className="space-y-2 bg-white p-3.5 rounded-xl border border-gray-200/60">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  <div className="h-3 w-10 bg-emerald-900/15 rounded"></div>
                </div>

                {/* Track */}
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500/40 h-full rounded-full"
                    style={{ width: `${i * 25 + 15}%` }}
                  ></div>
                </div>

                <div className="flex justify-between pt-0.5">
                  <div className="h-3 w-24 bg-gray-300 rounded"></div>
                  <div className="h-3 w-20 bg-gray-300 rounded"></div>
                </div>
              </div>

              {/* Management Action Button Skeleton */}
              <div className="pt-2">
                <div className="w-full h-10 rounded-xl bg-emerald-900/20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
