import React from "react";

export default function LoadingProjectPreview() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] pb-24 animate-pulse">
      {/* Top Nav Bar Skeleton */}
      <div className="bg-white border-b border-gray-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="h-4 w-44 bg-gray-200 rounded-md"></div>
          <div className="h-7 w-36 bg-amber-100/70 rounded-full"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Hero Card Skeleton */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs space-y-6">
          {/* Header Row */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
              <div className="h-6 w-28 bg-emerald-100/60 rounded-full"></div>
            </div>
            <div className="h-9 w-3/5 bg-gray-200 rounded-xl"></div>
            <div className="space-y-2 pt-1 max-w-2xl">
              <div className="h-4 w-full bg-gray-100 rounded-md"></div>
              <div className="h-4 w-2/3 bg-gray-100 rounded-md"></div>
            </div>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-[#fcfaf7] border border-gray-100 space-y-2"
              >
                <div className="h-3 w-20 bg-gray-200 rounded"></div>
                <div className="h-6 w-28 bg-gray-200 rounded-md"></div>
              </div>
            ))}
          </div>

          {/* Simple Progress Track */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 bg-gray-200 rounded"></div>
              <div className="h-3 w-16 bg-gray-200 rounded"></div>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full"></div>
          </div>
        </div>

        {/* Media Placeholder Skeleton */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-4">
          <div className="h-6 w-44 bg-gray-200 rounded-lg"></div>
          <div className="aspect-video w-full rounded-2xl bg-gray-200"></div>
        </div>

        {/* Overview & Investment Case Skeleton */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs space-y-4">
          <div className="h-6 w-52 bg-gray-200 rounded-lg border-b border-gray-100 pb-2"></div>
          <div className="space-y-2.5 pt-2">
            <div className="h-4 w-full bg-gray-100 rounded"></div>
            <div className="h-4 w-11/12 bg-gray-100 rounded"></div>
            <div className="h-4 w-4/5 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
