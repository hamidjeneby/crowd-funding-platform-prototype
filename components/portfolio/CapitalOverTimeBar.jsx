"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "./chartSetup";

export default function CapitalOverTimeBar({ data, currency = "AED" }) {
  const hasData = Boolean(data && data.total > 0 && data.items?.length > 0);

  const chartData = useMemo(() => {
    if (!hasData) return null;

    return {
      labels: data.labels,
      datasets: [
        {
          label: "Capital Deployed",
          data: data.data,
          backgroundColor: "#059669",
          hoverBackgroundColor: "#047857",
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 36,
        },
      ],
    };
  }, [data, hasData]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#064e3b",
          titleFont: { size: 13, weight: "bold" },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const val = context.raw || 0;
              return ` Capital Deployed: ${formatCurrency(val, currency)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: { size: 11, weight: 500 },
            color: "#475569",
          },
          title: {
            display: true,
            text: "Timeline (UTC)",
            color: "#94a3b8",
            font: { size: 11 },
          },
        },
        y: {
          grid: {
            color: "#f1f5f9",
          },
          ticks: {
            font: { size: 11 },
            callback: (val) => {
              if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
              return val;
            },
          },
        },
      },
    };
  }, [currency]);

  return (
    <div
      role="region"
      aria-label="Capital Invested Over Time Chart"
      className="bg-white rounded-2xl border border-[#059669]/15 p-6 shadow-xs flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#059669]/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#064e3b] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#059669]" /> Capital Invested Over Time
          </h2>
          <p className="text-xs text-[#064e3b]/60 mt-0.5">
            Cumulative monthly deployment based on allocation timestamps (UTC)
          </p>
        </div>
        {hasData && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-[#059669] border border-[#059669]/20">
            {data.items.length} {data.items.length === 1 ? "month" : "months"}
          </span>
        )}
      </div>

      {/* Chart Body */}
      <div className="py-4">
        {!hasData ? (
          <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <TrendingUp className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">Not enough data yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Monthly capital deployment will appear here once your first campaign closes.
            </p>
          </div>
        ) : (
          <>
            <div className="relative h-64 sm:h-72 w-full">
              {chartData && <Bar data={chartData} options={options} />}
            </div>

            {/* Accessible Screen-Reader Table */}
            <table className="sr-only">
              <caption>Monthly capital deployment history in UTC</caption>
              <thead>
                <tr>
                  <th scope="col">Month (UTC)</th>
                  <th scope="col">Capital Invested</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.key}>
                    <td>{item.label}</td>
                    <td>{formatCurrency(item.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Footer Summary */}
      {hasData && (
        <div className="border-t border-[#059669]/10 pt-3 text-xs text-center text-[#064e3b]/70 font-medium">
          Total Deployed: <span className="font-bold text-[#064e3b]">{formatCurrency(data.total, currency)}</span>
        </div>
      )}
    </div>
  );
}
