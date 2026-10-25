"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

export default function PortfolioError({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xs max-w-lg mx-auto text-center space-y-4 my-12"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
        <AlertCircle className="w-6 h-6" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-gray-900">
          Failed to load portfolio analysis
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Unable to load your investment positions at this time. Please try again or refresh the page.
        </p>
      </div>

      <div className="pt-2">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#064e3b] text-white font-semibold text-xs hover:bg-[#047857] transition-all shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}
