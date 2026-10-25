"use client";

import { CheckCircle2, PieChart, AlertTriangle, RotateCcw } from "lucide-react";
import { formatCurrency } from "./chartSetup";

export default function PledgeOutcomesCard({ data, currency = "AED" }) {
  const hasOutcomes = Boolean(data && data.hasOutcomes && data.totalCount > 0);

  const {
    fullyAllocated = { count: 0, pledgedAmount: 0, allocatedAmount: 0 },
    partlyAllocated = { count: 0, pledgedAmount: 0, allocatedAmount: 0, unallocatedAmount: 0 },
    notAllocated = { count: 0, pledgedAmount: 0 },
    refunded = { count: 0, pledgedAmount: 0 },
    totalCount = 0,
  } = data || {};

  return (
    <div
      role="region"
      aria-label="Pledge Outcomes Summary"
      className="bg-white rounded-2xl border border-[#059669]/15 p-6 shadow-xs flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#059669]/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#064e3b] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#059669]" /> Pledge Outcomes
          </h2>
          <p className="text-xs text-[#064e3b]/60 mt-0.5">
            Historical allocation outcomes across all closed campaign pledges
          </p>
        </div>
        {hasOutcomes && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-[#059669] border border-[#059669]/20">
            {totalCount} {totalCount === 1 ? "pledge processed" : "pledges processed"}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="py-4">
        {!hasOutcomes ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <CheckCircle2 className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">No closed campaign outcomes yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              When campaigns close, your allocation results (full, partial, oversubscribed, or refunded) will be tracked here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 4 Outcome Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Fully Allocated */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span>Fully Allocated</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-950 mt-2">
                  {fullyAllocated.count}
                </div>
                <p className="text-xs text-emerald-800/70 mt-1 font-medium">
                  {formatCurrency(fullyAllocated.allocatedAmount, currency)} invested
                </p>
              </div>

              {/* 2. Partly Allocated */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-teal-800">
                  <span>Partly Allocated</span>
                  <PieChart className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-2xl font-bold text-teal-950 mt-2">
                  {partlyAllocated.count}
                </div>
                <p className="text-xs text-teal-800/70 mt-1 font-medium">
                  {formatCurrency(partlyAllocated.allocatedAmount, currency)} filled
                </p>
              </div>

              {/* 3. Not Allocated (Oversubscribed) */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span>Not Allocated</span>
                  <AlertTriangle className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-2">
                  {notAllocated.count}
                </div>
                <p className="text-xs text-gray-600 mt-1 font-medium">
                  Rejected due to oversubscription
                </p>
              </div>

              {/* 4. Refunded (Failed/Late) */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
                  <span>Refunded</span>
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-bold text-rose-950 mt-2">
                  {refunded.count}
                </div>
                <p className="text-xs text-rose-800/70 mt-1 font-medium">
                  Campaign unmet or late pledge
                </p>
              </div>
            </div>

            {/* Accessible Screen-Reader Table */}
            <table className="sr-only">
              <caption>Pledge allocation outcomes and status counts</caption>
              <thead>
                <tr>
                  <th scope="col">Outcome Category</th>
                  <th scope="col">Count</th>
                  <th scope="col">Allocated Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fully Allocated</td>
                  <td>{fullyAllocated.count}</td>
                  <td>{formatCurrency(fullyAllocated.allocatedAmount, currency)}</td>
                </tr>
                <tr>
                  <td>Partly Allocated</td>
                  <td>{partlyAllocated.count}</td>
                  <td>{formatCurrency(partlyAllocated.allocatedAmount, currency)}</td>
                </tr>
                <tr>
                  <td>Not Allocated (Oversubscribed)</td>
                  <td>{notAllocated.count}</td>
                  <td>{formatCurrency(0, currency)}</td>
                </tr>
                <tr>
                  <td>Refunded</td>
                  <td>{refunded.count}</td>
                  <td>{formatCurrency(0, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mandatory Explanatory Sentence */}
      <div className="border-t border-[#059669]/10 pt-3 text-xs text-[#064e3b]/70 font-medium">
        Pledges are requests. When a campaign closes, allocation is by investor class, then amount, then time.
      </div>
    </div>
  );
}
