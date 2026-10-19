import React from "react";

export default function LoadingProjectManagement() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] p-4 sm:p-6 lg:p-10 space-y-8 animate-pulse text-[#064e3b]">
      {/* Top Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div className="space-y-1.5">
          {/* Back Link Skeleton */}
          <div className="h-4 bg-emerald-100 rounded-md w-36"></div>
          {/* Badge Chips */}
          <div className="flex items-center gap-2 pt-1">
            <div className="h-5 bg-emerald-100 rounded-full w-40"></div>
            <div className="h-5 bg-amber-100 rounded-full w-24"></div>
          </div>
          {/* Project Title */}
          <div className="h-9 bg-emerald-900/15 rounded-xl w-64 sm:w-96"></div>
        </div>

        {/* Top Right Preview Button Skeleton */}
        <div className="h-10 bg-white border border-gray-200 rounded-xl w-44 shadow-xs"></div>
      </div>

      {/* Tabs Navigation Bar Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {[
          { w: "w-28", active: true },
          { w: "w-28", active: false },
          { w: "w-32", active: false },
          { w: "w-32", active: false },
          { w: "w-32", active: false },
        ].map((tab, idx) => (
          <div
            key={idx}
            className={`h-10 ${tab.w} rounded-xl ${
              tab.active
                ? "bg-[#064e3b]/25 shadow-xs"
                : "bg-white border border-gray-200"
            }`}
          ></div>
        ))}
      </div>

      {/* Overview Tab Content Skeleton */}
      <div className="space-y-8">
        {/* Hero Header Card Skeleton */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 lg:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Cover thumbnail / logo placeholder */}
              <div className="w-20 h-20 rounded-2xl bg-emerald-100/60 border border-emerald-200/60 shrink-0"></div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-5 bg-emerald-100 rounded-full w-28"></div>
                  <div className="h-5 bg-amber-100 rounded-full w-36"></div>
                </div>
                <div className="h-7 bg-emerald-900/15 rounded-lg w-64 sm:w-80"></div>
                <div className="space-y-1 pt-0.5">
                  <div className="h-3 bg-gray-200 rounded w-full max-w-xl"></div>
                  <div className="h-3 bg-gray-100 rounded w-4/5 max-w-md"></div>
                </div>
              </div>
            </div>

            {/* Campaign Timeframe Card Skeleton */}
            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 text-center shrink-0 min-w-[160px] space-y-2">
              <div className="h-3 w-28 bg-gray-200 rounded mx-auto"></div>
              <div className="h-6 w-20 bg-emerald-900/15 rounded mx-auto"></div>
              <div className="h-3 w-24 bg-gray-200 rounded mx-auto"></div>
            </div>
          </div>

          {/* Funding Progress Bar & Cap Markers Skeleton */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="h-4 bg-emerald-900/15 rounded w-44"></div>
              <div className="h-4 bg-emerald-900/20 rounded w-48"></div>
            </div>

            {/* Progress Bar Track with visual cap lines */}
            <div className="relative w-full bg-gray-200 h-4 rounded-full overflow-hidden my-6">
              <div className="bg-gradient-to-r from-emerald-500/40 to-emerald-600/40 h-full rounded-full w-3/5"></div>
            </div>

            {/* Cap Details 4-Card Grid Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {/* Live Raised */}
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <div className="h-2.5 w-16 bg-gray-300 rounded"></div>
                <div className="h-5 w-24 bg-emerald-900/15 rounded"></div>
              </div>
              {/* Target Goal */}
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <div className="h-2.5 w-16 bg-gray-300 rounded"></div>
                <div className="h-5 w-24 bg-emerald-900/15 rounded"></div>
              </div>
              {/* Soft Cap */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 space-y-2">
                <div className="h-2.5 w-16 bg-amber-300 rounded"></div>
                <div className="h-5 w-20 bg-amber-900/15 rounded"></div>
              </div>
              {/* Hard Cap */}
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2">
                <div className="h-2.5 w-16 bg-purple-300 rounded"></div>
                <div className="h-5 w-20 bg-purple-900/15 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats & Key Terms Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Total Backers Card Skeleton */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-gray-200 rounded"></div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100"></div>
            </div>
            <div className="space-y-1.5">
              <div className="h-10 w-24 bg-emerald-900/20 rounded-xl"></div>
              <div className="h-3 w-36 bg-emerald-100 rounded"></div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="h-3 w-full bg-gray-100 rounded"></div>
            </div>
          </div>

          {/* Financial & Campaign Terms Summary Skeleton */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
            <div className="h-5 w-64 bg-emerald-900/15 rounded-md"></div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              {[
                { labelW: "w-16", valW: "w-14" },
                { labelW: "w-16", valW: "w-24" },
                { labelW: "w-24", valW: "w-24" },
                { labelW: "w-24", valW: "w-20" },
                { labelW: "w-16", valW: "w-20" },
                { labelW: "w-20", valW: "w-16" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2"
                >
                  <div className={`h-2.5 ${item.labelW} bg-gray-300 rounded`}></div>
                  <div className={`h-5 ${item.valW} bg-emerald-900/15 rounded`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
