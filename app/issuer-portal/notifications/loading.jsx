import React from "react";

export default function LoadingIssuerNotifications() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 animate-pulse text-[#064e3b]">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div className="space-y-2">
          <div className="h-4 bg-emerald-100 rounded-md w-48"></div>
          <div className="h-8 bg-emerald-900/15 rounded-xl w-64 sm:w-80"></div>
          <div className="h-4 bg-emerald-900/10 rounded-md w-80 sm:w-96"></div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="h-10 w-44 rounded-xl bg-white border border-[#059669]/15 shadow-xs"></div>
          <div className="h-10 w-36 rounded-xl bg-[#064e3b]/20 shadow-xs"></div>
        </div>
      </div>

      {/* Category Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
        {[
          { w: "w-32", active: true },
          { w: "w-32", active: false },
          { w: "w-36", active: false },
          { w: "w-28", active: false },
          { w: "w-24", active: false },
          { w: "w-44", active: false },
        ].map((tab, idx) => (
          <div
            key={idx}
            className={`h-9 ${tab.w} rounded-xl ${
              tab.active
                ? "bg-[#064e3b]/25 shadow-xs"
                : "bg-white border border-[#059669]/15"
            }`}
          ></div>
        ))}
      </div>

      {/* Notification List Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4 flex-1">
              {/* Icon box skeleton */}
              <div className="w-10 h-10 rounded-xl bg-emerald-100/60 shrink-0"></div>

              <div className="space-y-2 flex-1">
                {/* Badges row skeleton */}
                <div className="flex items-center gap-2">
                  <div className="h-4.5 w-28 bg-emerald-100/70 rounded-full"></div>
                  {i % 2 === 1 && (
                    <div className="h-4.5 w-28 bg-amber-100/80 rounded-full"></div>
                  )}
                </div>

                {/* Title skeleton */}
                <div className="h-5 bg-emerald-900/15 rounded-md w-56 sm:w-80"></div>

                {/* Message lines skeleton */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="h-3.5 bg-gray-200/80 rounded w-full max-w-xl"></div>
                  <div className="h-3.5 bg-gray-100 rounded w-3/4 max-w-md"></div>
                </div>

                {/* Action button skeleton */}
                {i % 2 === 1 && (
                  <div className="pt-1.5">
                    <div className="h-7 w-28 bg-[#064e3b]/20 rounded-xl"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column skeleton: timestamp & mark read */}
            <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
              <div className="h-3.5 w-20 bg-gray-200 rounded"></div>
              <div className="h-7 w-20 bg-emerald-50 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
