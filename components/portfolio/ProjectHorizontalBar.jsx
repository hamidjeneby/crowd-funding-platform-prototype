"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { Briefcase } from "lucide-react";
import { formatCurrency, formatPercent, PORTFOLIO_PALETTE } from "./chartSetup";

export default function ProjectHorizontalBar({ data, currency = "AED" }) {
  const hasData = Boolean(data && data.total > 0 && data.items?.length > 0);

  const chartData = useMemo(() => {
    if (!hasData) return null;

    // Truncate label for axis display (max 18 chars)
    const truncatedLabels = data.items.map((i) => {
      const t = i.title || "Project";
      return t.length > 20 ? `${t.slice(0, 18)}…` : t;
    });

    return {
      labels: truncatedLabels,
      datasets: [
        {
          label: "Allocated Amount",
          data: data.data,
          backgroundColor: data.items.map((item, idx) =>
            item.projectId === "other"
              ? "#94a3b8" // Slate-400 for Other
              : PORTFOLIO_PALETTE[idx % PORTFOLIO_PALETTE.length]
          ),
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 16,
        },
      ],
    };
  }, [data, hasData]);

  const options = useMemo(() => {
    return {
      indexAxis: "y",
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
            title: (items) => {
              if (!items.length) return "";
              const idx = items[0].dataIndex;
              return data?.items?.[idx]?.fullTitle || items[0].label;
            },
            label: (context) => {
              const idx = context.dataIndex;
              const val = context.raw || 0;
              const pct = data?.percentages?.[idx] ?? 0;
              return ` Allocated: ${formatCurrency(val, currency)} (${formatPercent(pct)})`;
            },
          },
        },
      },
      scales: {
        x: {
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
        y: {
          grid: {
            display: false,
          },
          ticks: {
            font: { size: 12, weight: 500 },
            color: "#1e293b",
          },
        },
      },
    };
  }, [data, currency]);

  return (
    <div
      role="region"
      aria-label="Allocation by Project Chart"
      className="bg-white rounded-2xl border border-[#059669]/15 p-6 shadow-xs flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#059669]/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#064e3b] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#059669]" /> Allocation by Project
          </h2>
          <p className="text-xs text-[#064e3b]/60 mt-0.5">
            Top 8 holdings by capital deployed (remaining positions grouped in &quot;Other&quot;)
          </p>
        </div>
        {hasData && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-[#059669] border border-[#059669]/20">
            {data.items.length} {data.items.length === 1 ? "holding" : "holdings"}
          </span>
        )}
      </div>

      {/* Chart Body */}
      <div className="py-4">
        {!hasData ? (
          <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Briefcase className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">Not enough data yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Project positions will display here once your campaigns close and pledges are allocated.
            </p>
          </div>
        ) : (
          <>
            <div className="relative h-64 sm:h-72 w-full">
              {chartData && <Bar data={chartData} options={options} />}
            </div>

            {/* Accessible Screen-Reader Table */}
            <table className="sr-only">
              <caption>Portfolio allocation by individual project position</caption>
              <thead>
                <tr>
                  <th scope="col">Project Title</th>
                  <th scope="col">Allocated Amount</th>
                  <th scope="col">Concentration</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.projectId}>
                    <td>{item.fullTitle}</td>
                    <td>{formatCurrency(item.amount, currency)}</td>
                    <td>{formatPercent(item.percentage)}</td>
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
          Total Invested: <span className="font-bold text-[#064e3b]">{formatCurrency(data.total, currency)}</span>
        </div>
      )}
    </div>
  );
}
