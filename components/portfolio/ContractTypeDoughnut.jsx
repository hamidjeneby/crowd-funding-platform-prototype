"use client";

import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Layers } from "lucide-react";
import { formatCurrency, formatPercent, PORTFOLIO_PALETTE } from "./chartSetup";

export default function ContractTypeDoughnut({ data, currency = "AED" }) {
  const hasData = Boolean(data && data.total > 0 && data.items?.length > 0);

  const chartData = useMemo(() => {
    if (!hasData) return null;
    return {
      labels: data.labels,
      datasets: [
        {
          label: "Allocated Capital",
          data: data.data,
          backgroundColor: data.items.map(
            (_, idx) => PORTFOLIO_PALETTE[idx % PORTFOLIO_PALETTE.length]
          ),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 4,
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
          position: "bottom",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            padding: 14,
            font: {
              size: 12,
              family: "inherit",
              weight: 500,
            },
            generateLabels: (chart) => {
              const orig = ChartJS.overrides?.doughnut?.plugins?.legend?.labels?.generateLabels || ChartJS.defaults.plugins.legend.labels.generateLabels;
              const labels = orig(chart);
              return labels.map((l, i) => {
                const pct = data?.percentages?.[i] ?? 0;
                return {
                  ...l,
                  text: `${l.text} (${pct}%)`,
                };
              });
            },
          },
        },
        tooltip: {
          backgroundColor: "#064e3b",
          titleFont: { size: 13, weight: "bold" },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const idx = context.dataIndex;
              const val = context.raw || 0;
              const pct = data?.percentages?.[idx] ?? 0;
              return ` ${context.label}: ${formatCurrency(val, currency)} (${formatPercent(pct)})`;
            },
          },
        },
      },
      cutout: "68%",
    };
  }, [data, currency]);

  return (
    <div
      role="region"
      aria-label="Allocation by Contract Type Chart"
      className="bg-white rounded-2xl border border-[#059669]/15 p-6 shadow-xs flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#059669]/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#064e3b] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#059669]" /> Allocation by Contract Type
          </h2>
          <p className="text-xs text-[#064e3b]/60 mt-0.5">
            Holdings distributed across Sharia financing structures
          </p>
        </div>
        {hasData && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-[#059669] border border-[#059669]/20">
            {data.items.length} {data.items.length === 1 ? "structure" : "structures"}
          </span>
        )}
      </div>

      {/* Chart Body */}
      <div className="py-4">
        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Layers className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">Not enough data yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Contract type allocation will populate once your pledges are allocated at campaign close.
            </p>
          </div>
        ) : (
          <>
            <div className="relative h-64 sm:h-72 w-full">
              {chartData && <Doughnut data={chartData} options={options} />}
            </div>

            {/* Accessible Screen-Reader Table */}
            <table className="sr-only">
              <caption>Portfolio allocation breakdown by Sharia contract type</caption>
              <thead>
                <tr>
                  <th scope="col">Contract Type</th>
                  <th scope="col">Allocated Amount</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
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
          Total: <span className="font-bold text-[#064e3b]">{formatCurrency(data.total, currency)}</span>
        </div>
      )}
    </div>
  );
}

import { ChartJS } from "./chartSetup";
