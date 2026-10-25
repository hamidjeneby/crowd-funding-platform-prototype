"use client";

export default function PortfolioSkeleton() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading portfolio analysis">
      {/* Summary Strip Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs h-28 flex flex-col justify-between">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-7 w-32 bg-gray-200 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs h-96 flex flex-col justify-between">
          <div className="h-4 w-44 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-100 rounded-xl mt-4" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs h-96 flex flex-col justify-between">
          <div className="h-4 w-44 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-100 rounded-xl mt-4" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs h-96 flex flex-col justify-between">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-100 rounded-xl mt-4" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs h-64 flex flex-col justify-between">
        <div className="h-4 w-40 bg-gray-200 rounded" />
        <div className="h-36 bg-gray-100 rounded-xl mt-4" />
      </div>
    </div>
  );
}
