import React from "react";

export default function LoadingIssuerAccount() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 animate-pulse text-[#064e3b]">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div className="space-y-2">
          <div className="h-4 bg-emerald-100 rounded-md w-48"></div>
          <div className="h-9 bg-emerald-900/15 rounded-xl w-64 sm:w-80"></div>
          <div className="h-4 bg-emerald-900/10 rounded-md w-80 sm:w-96"></div>
        </div>
      </div>

      {/* SECTION 1 SKELETON: Corporate Legal KYB Profile */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100"></div>
            <div className="space-y-1">
              <div className="h-5 bg-emerald-900/15 rounded-md w-52"></div>
              <div className="h-3.5 bg-gray-200 rounded w-72"></div>
            </div>
          </div>
          <div className="h-6 w-24 bg-gray-100 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { labelW: "w-28", valW: "w-44" },
            { labelW: "w-32", valW: "w-36" },
            { labelW: "w-24", valW: "w-28" },
            { labelW: "w-28", valW: "w-32" },
            { labelW: "w-20", valW: "w-40" },
            { labelW: "w-36", valW: "w-32" },
          ].map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-2"
            >
              <div className={`h-3 ${item.labelW} bg-gray-300 rounded`}></div>
              <div className={`h-5 ${item.valW} bg-emerald-900/15 rounded`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2 SKELETON: Authorized Representatives */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100"></div>
            <div className="space-y-1">
              <div className="h-5 bg-emerald-900/15 rounded-md w-56"></div>
              <div className="h-3.5 bg-gray-200 rounded w-80"></div>
            </div>
          </div>
          <div className="h-6 w-20 bg-gray-100 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100/70"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-emerald-900/15 rounded w-36"></div>
                  <div className="h-3 bg-gray-200 rounded w-28"></div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-44"></div>
                <div className="h-3 bg-gray-200 rounded w-36"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3 SKELETON: Settlement Bank Details */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100"></div>
            <div className="space-y-1">
              <div className="h-5 bg-emerald-900/15 rounded-md w-64"></div>
              <div className="h-3.5 bg-gray-200 rounded w-80"></div>
            </div>
          </div>
          <div className="h-8 w-28 bg-emerald-50 rounded-xl"></div>
        </div>

        {/* Bank Status Banner Placeholder */}
        <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 shrink-0"></div>
          <div className="space-y-1.5 flex-1">
            <div className="h-4 bg-amber-900/20 rounded w-44"></div>
            <div className="h-3 bg-amber-900/10 rounded w-full max-w-lg"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {[
            { labelW: "w-20", valW: "w-40" },
            { labelW: "w-36", valW: "w-44" },
            { labelW: "w-28", valW: "w-48" },
            { labelW: "w-24", valW: "w-52" },
            { labelW: "w-32", valW: "w-36" },
            { labelW: "w-16", valW: "w-20" },
          ].map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-2"
            >
              <div className={`h-3 ${item.labelW} bg-gray-300 rounded`}></div>
              <div className={`h-5 ${item.valW} bg-emerald-900/15 rounded`}></div>
            </div>
          ))}

          {/* Full-width Bank Address skeleton */}
          <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-2">
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
            <div className="h-5 w-72 bg-emerald-900/15 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
