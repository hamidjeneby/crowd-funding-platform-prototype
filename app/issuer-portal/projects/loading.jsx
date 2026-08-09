import React from "react";
import { FolderOpen, PlusCircle, AlertCircle, Edit, Eye, Image as ImageIcon } from "lucide-react";

export default function LoadingProjects() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div className="h-10 bg-gray-200 rounded w-48"></div>
        <div className="h-11 bg-gray-200 rounded-md w-56"></div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            {/* Cover Skeleton */}
            <div className="relative h-48 bg-gray-200 flex-shrink-0 border-b border-gray-200">
              <div className="absolute top-4 right-4 h-7 w-24 bg-gray-300 rounded-full"></div>
              <div className="absolute bottom-4 left-4 h-7 w-3/4 bg-gray-300 rounded"></div>
            </div>

            {/* Body Skeleton */}
            <div className="p-5 flex-1 flex flex-col">
              
              {/* Summary skeleton */}
              <div className="mb-4 space-y-2">
                <div className="h-3.5 bg-gray-200 rounded w-full"></div>
                <div className="h-3.5 bg-gray-200 rounded w-5/6"></div>
              </div>

              {/* Media count skeleton */}
              <div className="h-8 w-28 bg-gray-200 rounded-lg mb-5"></div>

              {/* Target Goal skeleton */}
              <div className="mb-5">
                <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-7 bg-gray-200 rounded w-32"></div>
              </div>

              {/* Action Buttons Skeleton */}
              <div className="mt-auto pt-4 flex gap-3 border-t border-gray-100">
                <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
