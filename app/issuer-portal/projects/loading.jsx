import React from "react";

export default function LoadingProjects() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded-xl w-48"></div>
          <div className="h-4 bg-gray-100 rounded-md w-72 sm:w-80"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded-xl w-40 shrink-0"></div>
      </div>

      {/* Projects Grid Skeleton (Clean 3-card layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs flex flex-col"
          >
            {/* Image Placeholder */}
            <div className="h-48 bg-gray-200 w-full" />

            {/* Card Content */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                {/* Status / Category tag placeholder */}
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 bg-gray-100 rounded-full" />
                  <div className="h-4 w-16 bg-gray-100 rounded" />
                </div>

                {/* Project Title */}
                <div className="h-6 w-3/4 bg-gray-200 rounded-lg" />

                {/* Short Description */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-3.5 bg-gray-100 rounded w-full" />
                  <div className="h-3.5 bg-gray-100 rounded w-4/5" />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {/* Funding Progress Skeleton */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-24 bg-gray-200 rounded" />
                    <div className="h-3.5 w-12 bg-gray-200 rounded" />
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full" />
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                  <div className="h-9 flex-1 bg-gray-100 rounded-xl" />
                  <div className="h-9 flex-1 bg-gray-200 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
