import React from "react";

export default function LoadingProjects() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-pulse text-[#064e3b]">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#059669]/15 pb-6">
        <div className="space-y-2">
          <div className="h-9 bg-emerald-900/15 rounded-xl w-48 sm:w-64"></div>
          <div className="h-4 bg-emerald-900/10 rounded-md w-72 sm:w-96"></div>
        </div>
        <div className="h-10 bg-emerald-900/20 rounded-xl w-44 shrink-0 shadow-xs"></div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => {
          const hasConversion = i % 2 === 0;

          return (
            <div
              key={i}
              className="bg-white rounded-3xl shadow-xs border border-gray-200/80 overflow-hidden flex flex-col"
            >
              {/* Card Header / Cover Image Skeleton */}
              <div className="relative h-48 bg-gradient-to-br from-emerald-950/15 via-emerald-900/10 to-gray-200 shrink-0 border-b border-gray-100 overflow-hidden">
                {/* Floating Status Badge Skeleton */}
                <div className="absolute top-4 right-4 h-6 w-24 bg-white/80 rounded-full shadow-xs"></div>
                {/* Floating Bottom Title Banner Skeleton */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="h-5 bg-white/90 rounded-md w-3/4 drop-shadow-xs"></div>
                </div>
              </div>

              {/* Card Body Skeleton */}
              <div className="p-5 flex-1 flex flex-col space-y-4">
                {/* Summary Lines */}
                <div className="space-y-2 min-h-[36px]">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                </div>

                {/* Funding Progress & Days Remaining Box Skeleton */}
                <div className="space-y-2.5 bg-[#fdfbf7] p-3.5 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-28 bg-emerald-900/10 rounded"></div>
                    <div className="h-3.5 w-10 bg-emerald-900/20 rounded font-mono"></div>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500/40 h-full rounded-full"
                      style={{ width: `${(i * 18) % 75 + 20}%` }}
                    ></div>
                  </div>

                  {/* Raised vs Target Goal Row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-1">
                      <div className="h-2 w-10 bg-gray-300 rounded"></div>
                      <div className="h-3.5 w-20 bg-gray-400/80 rounded"></div>
                    </div>
                    <div className="space-y-1 flex flex-col items-end">
                      <div className="h-2 w-14 bg-gray-300 rounded"></div>
                      <div className="h-3.5 w-24 bg-gray-400/80 rounded"></div>
                    </div>
                  </div>

                  {/* Days Remaining Footer */}
                  <div className="flex items-center gap-2 pt-1 border-t border-emerald-100/60">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-200/80 shrink-0"></div>
                    <div className="h-3 w-40 bg-emerald-900/15 rounded"></div>
                  </div>
                </div>

                {/* Conversion Pool Bar (Sampled on alternate cards) */}
                {hasConversion && (
                  <div className="space-y-2 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80">
                    <div className="flex items-center justify-between">
                      <div className="h-3.5 w-32 bg-emerald-900/15 rounded"></div>
                      <div className="h-3.5 w-24 bg-emerald-900/15 rounded font-mono"></div>
                    </div>
                    <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500/50 h-full rounded-full w-2/5"></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons Footer */}
                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2">
                  <div className="h-10 flex-1 bg-gray-200/90 rounded-xl"></div>
                  <div className="h-10 flex-1 bg-emerald-900/20 rounded-xl"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
