"use client";

import { Sparkles, Info } from "lucide-react";
import { formatCurrency } from "./chartSetup";

export default function ConversionExposureCard({ data, currency = "AED" }) {
  if (!data || !data.hasExposure || !data.items?.length) {
    return null; // Only render if investor has holdings with conversion_eligible_units > 0
  }

  const { totalReservedUnits = 0, items = [] } = data;
  const maxUnits = Math.max(...items.map((i) => i.conversionEligibleUnits), 1);

  return (
    <div
      role="region"
      aria-label="Conversion Exposure Summary"
      className="bg-white rounded-2xl border border-teal-500/20 p-6 shadow-xs flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-teal-500/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" /> Conversion Exposure
          </h2>
          <p className="text-xs text-teal-800/60 mt-0.5">
            Convertible Sukuk holding positions with reserved SPV equity share rights
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-teal-900">
            {totalReservedUnits.toLocaleString()}
          </div>
          <p className="text-[11px] text-teal-700 font-semibold uppercase tracking-wider">
            Total Reserved Units
          </p>
        </div>
      </div>

      {/* Body: per holding bars */}
      <div className="py-4 space-y-3">
        {items.map((holding) => {
          const pct = Math.min(100, (holding.conversionEligibleUnits / maxUnits) * 100);
          return (
            <div key={holding.pledgeId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                <span className="font-semibold text-[#064e3b] truncate max-w-[65%]">
                  {holding.projectTitle}
                </span>
                <span className="text-teal-900 font-bold">
                  {holding.conversionEligibleUnits.toLocaleString()} units{" "}
                  <span className="font-normal text-gray-400">
                    ({formatCurrency(holding.allocatedAmount, holding.currency || currency)})
                  </span>
                </span>
              </div>
              {/* Visual mini bar */}
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Accessible Table */}
        <table className="sr-only">
          <caption>Reserved conversion unit entitlements per holding</caption>
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Reserved Conversion Units</th>
              <th scope="col">Allocated Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.pledgeId}>
                <td>{i.projectTitle}</td>
                <td>{i.conversionEligibleUnits}</td>
                <td>{formatCurrency(i.allocatedAmount, i.currency || currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mandatory Footnote */}
      <div className="border-t border-teal-500/10 pt-3 text-xs text-teal-800/70 font-medium flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>Reserved units are not guaranteed to convert.</span>
      </div>
    </div>
  );
}
