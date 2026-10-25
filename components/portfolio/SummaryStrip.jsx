"use client";

import { Wallet, Clock, Briefcase, PieChart, AlertCircle } from "lucide-react";
import { formatCurrency, formatPercent } from "./chartSetup";

export default function SummaryStrip({ summary }) {
  if (!summary) return null;

  const {
    totalInvested = 0,
    awaitingAllocation = 0,
    holdingsCount = 0,
    largestHoldingPercent = 0,
    largestHoldingAmount = 0,
    primaryCurrency = "AED",
    hasMixedCurrencies = false,
    currencies = [],
    byCurrency = {},
  } = summary;

  return (
    <div className="space-y-4">
      {/* Mixed Currency Banner (shown only if multiple currencies exist) */}
      {hasMixedCurrencies && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Multi-Currency Portfolio Notice</p>
            <p className="text-amber-800/90 leading-relaxed">
              Your investments span multiple currencies ({currencies.join(", ")}). To prevent exchange rate distortion, values are not converted into a single currency. Totals per currency are shown below.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs">
              {currencies.map((curr) => {
                const cData = byCurrency[curr] || {};
                return (
                  <div key={curr} className="bg-white/80 border border-amber-300/60 rounded-lg px-3 py-1.5 font-medium">
                    <span className="font-bold text-amber-950">{curr}: </span>
                    Invested {formatCurrency(cData.totalInvested, curr)} | Awaiting {formatCurrency(cData.awaitingAllocation, curr)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Invested */}
        <div className="bg-white rounded-2xl border border-[#059669]/15 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <span>Total Invested</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-[#059669]">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-[#064e3b]">
              {formatCurrency(totalInvested, primaryCurrency)}
            </div>
            <p className="text-xs text-[#064e3b]/60 mt-1">
              Active deployed capital in closed campaigns
            </p>
          </div>
        </div>

        {/* 2. Awaiting Allocation */}
        <div className="bg-white rounded-2xl border border-amber-500/20 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-700">
            <span>Awaiting Allocation</span>
            <span className="p-2 bg-amber-50 rounded-xl text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-amber-900">
              {formatCurrency(awaitingAllocation, primaryCurrency)}
            </div>
            <p className="text-xs text-amber-800/60 mt-1">
              Committed pledges in open campaigns
            </p>
          </div>
        </div>

        {/* 3. Holdings Count */}
        <div className="bg-white rounded-2xl border border-[#059669]/15 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <span>Holdings</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-[#059669]">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-[#064e3b]">
              {holdingsCount}
            </div>
            <p className="text-xs text-[#064e3b]/60 mt-1">
              {holdingsCount === 1 ? "Active holding position" : "Active holding positions"}
            </p>
          </div>
        </div>

        {/* 4. Largest Holding Concentration */}
        <div className="bg-white rounded-2xl border border-[#059669]/15 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <span>Largest Holding</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-[#059669]">
              <PieChart className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-[#064e3b]">
              {formatPercent(largestHoldingPercent)}
            </div>
            <p className="text-xs text-[#064e3b]/60 mt-1">
              {totalInvested > 0
                ? `${formatCurrency(largestHoldingAmount, primaryCurrency)} portfolio concentration`
                : "No active holdings yet"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
