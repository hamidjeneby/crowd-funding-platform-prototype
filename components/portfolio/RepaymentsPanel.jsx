"use client";

import { useMemo } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  CalendarClock,
  ShieldCheck,
  TrendingUp,
  Coins,
  CheckCircle2,
  Clock,
  Info,
} from "lucide-react";
import { formatCurrency } from "./chartSetup";
import {
  buildRepaymentsSummary,
  byMonthReceived,
  cumulativeReceivedVsExpected,
} from "@/lib/portfolio/repaymentsAggregate";

export default function RepaymentsPanel({
  repayments = [],
  periods = [],
  holdings = [],
  currency = "AED",
}) {
  const summary = useMemo(
    () => buildRepaymentsSummary(repayments, periods, holdings),
    [repayments, periods, holdings]
  );

  const monthlyData = useMemo(
    () => byMonthReceived(repayments),
    [repayments]
  );

  const cumulativeData = useMemo(
    () => cumulativeReceivedVsExpected(repayments),
    [repayments]
  );

  const hasPaidRepayments = monthlyData.items.length > 0;
  const hasFixedContracts = summary.hasFixedContract;
  const hasCumulativeData = cumulativeData.hasFixedContract && cumulativeData.labels.length > 0;

  // Bar chart setup for monthly payments received
  const monthlyChartData = useMemo(() => {
    if (!hasPaidRepayments) return null;
    return {
      labels: monthlyData.labels,
      datasets: [
        {
          label: "Payments Received",
          data: monthlyData.data,
          backgroundColor: "#059669",
          hoverBackgroundColor: "#047857",
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 36,
        },
      ],
    };
  }, [monthlyData, hasPaidRepayments]);

  const monthlyChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#064e3b",
          titleFont: { size: 13, weight: "bold" },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const val = context.raw || 0;
              return ` Received: ${formatCurrency(val, currency)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, weight: 500 },
            color: "#475569",
          },
        },
        y: {
          grid: { color: "rgba(5, 150, 105, 0.08)" },
          ticks: {
            font: { size: 11 },
            color: "#64748b",
            callback: (value) => formatCurrency(value, currency),
          },
        },
      },
    };
  }, [currency]);

  // Line chart setup for cumulative received vs expected
  const cumulativeChartData = useMemo(() => {
    if (!hasCumulativeData) return null;
    return {
      labels: cumulativeData.labels,
      datasets: [
        {
          label: "Cumulative Expected",
          data: cumulativeData.expectedData,
          borderColor: "#94a3b8",
          backgroundColor: "transparent",
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: "#94a3b8",
          tension: 0.1,
        },
        {
          label: "Cumulative Received",
          data: cumulativeData.receivedData,
          borderColor: "#059669",
          backgroundColor: "rgba(5, 150, 105, 0.08)",
          borderWidth: 2.5,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#059669",
          tension: 0.1,
        },
      ],
    };
  }, [cumulativeData, hasCumulativeData]);

  const cumulativeChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: { size: 11, weight: 600 },
            color: "#064e3b",
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
              const label = context.dataset.label || "";
              const val = context.raw || 0;
              return ` ${label}: ${formatCurrency(val, currency)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, weight: 500 },
            color: "#475569",
          },
        },
        y: {
          grid: { color: "rgba(5, 150, 105, 0.08)" },
          ticks: {
            font: { size: 11 },
            color: "#64748b",
            callback: (value) => formatCurrency(value, currency),
          },
        },
      },
    };
  }, [currency]);

  return (
    <div
      role="region"
      aria-label="Repayments and Payouts Panel"
      className="bg-white rounded-2xl border border-[#059669]/15 p-6 shadow-xs space-y-6"
    >
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#059669]/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[#059669]" /> Repayments & Sharia Distributions
          </h2>
          <p className="text-xs text-[#064e3b]/70 mt-0.5">
            Realized cash receipts, upcoming contractual schedules, and Sharia profit tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary.countPaid > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-[#059669] border border-[#059669]/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              {summary.countPaid} {summary.countPaid === 1 ? "payment" : "payments"} realized
            </span>
          )}
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#fcfaf7] text-[#064e3b]/70 border border-[#059669]/15">
            Primary Currency: {currency}
          </span>
        </div>
      </div>

      {/* 2. Summary Metric Strip (3 core metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Received to Date */}
        <div className="bg-[#fcfaf7] border border-[#059669]/15 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#064e3b]/70 uppercase tracking-wider">
              Received to Date
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-[#059669] flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#064e3b]">
              {formatCurrency(summary.totalReceived, currency)}
            </div>
            <p className="text-xs text-[#064e3b]/60 mt-0.5">
              Directly credited to verified bank account
            </p>
          </div>
        </div>

        {/* Metric 2: Expected Remaining (Murabaha & Ijara only) */}
        <div className="bg-[#fcfaf7] border border-[#059669]/15 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#064e3b]/70 uppercase tracking-wider">
              Expected Remaining
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-[#059669] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#064e3b]">
              {hasFixedContracts && summary.remainingExpected !== null
                ? formatCurrency(summary.remainingExpected, currency)
                : "—"}
            </div>
            <p className="text-xs text-[#064e3b]/60 mt-0.5">
              {hasFixedContracts
                ? "Contractual principal & expected profit remaining"
                : "N/A for variable-return structures (Mudarabah & Equity)"}
            </p>
          </div>
        </div>

        {/* Metric 3: Next Payment / Report Event */}
        <div className="bg-[#fcfaf7] border border-[#059669]/15 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#064e3b]/70 uppercase tracking-wider">
              Next Payment
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-[#059669] flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            {summary.nextPaymentInfo?.type === "fixed_payment" ? (
              <>
                <div className="text-xl font-extrabold text-[#064e3b]">
                  {formatCurrency(summary.nextPaymentInfo.amount, currency)}
                </div>
                <p className="text-xs text-[#059669] font-semibold mt-0.5">
                  Due {summary.nextPaymentInfo.formattedDate}
                </p>
              </>
            ) : summary.nextPaymentInfo?.type === "profit_report" ? (
              <>
                <div className="text-sm font-bold text-[#064e3b]">
                  {summary.nextPaymentInfo.displayText}
                </div>
                <p className="text-xs text-[#064e3b]/60 mt-0.5">
                  Mudarabah profit periodic disclosure
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold text-[#064e3b]">—</div>
                <p className="text-xs text-[#064e3b]/60 mt-0.5">
                  No upcoming scheduled payment
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Empty State or Charts Section */}
      {!summary.hasData ? (
        <div className="py-12 border border-dashed border-[#059669]/25 rounded-2xl flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-[#059669]/20 flex items-center justify-center text-[#059669]">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#064e3b]">
              No repayments yet
            </p>
            <p className="text-xs text-[#064e3b]/70 leading-relaxed">
              Repayments and distributions will appear here once your funded projects are released by escrow and scheduled issuer payouts are executed.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Chart 1: Payments Received per Month (UTC) */}
          <div className="border border-[#059669]/15 rounded-xl p-5 bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#059669]/10 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#064e3b] flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-[#059669]" /> Payments Received per Month (UTC)
                </h3>
                <p className="text-xs text-[#064e3b]/60 mt-0.5">
                  Realized distributions grouped by calendar month
                </p>
              </div>
              {hasPaidRepayments && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-[#059669] border border-[#059669]/20">
                  {monthlyData.items.length} {monthlyData.items.length === 1 ? "month" : "months"}
                </span>
              )}
            </div>

            <div className="py-2">
              {!hasPaidRepayments ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <Coins className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">No realized payouts yet</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Monthly receipts will plot here as soon as the issuer processes the first distribution.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative h-64 w-full">
                    {monthlyChartData && <Bar data={monthlyChartData} options={monthlyChartOptions} />}
                  </div>

                  {/* Accessible Screen-Reader Table */}
                  <table className="sr-only">
                    <caption>Monthly repayments received history in UTC</caption>
                    <thead>
                      <tr>
                        <th scope="col">Month (UTC)</th>
                        <th scope="col">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.items.map((item) => (
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

            {hasPaidRepayments && (
              <div className="border-t border-[#059669]/10 pt-3 text-xs text-center text-[#064e3b]/70 font-medium">
                Total Realized: <span className="font-bold text-[#064e3b]">{formatCurrency(monthlyData.total, currency)}</span>
              </div>
            )}
          </div>

          {/* Chart 2: Cumulative Received vs Expected (Fixed contracts) */}
          <div className="border border-[#059669]/15 rounded-xl p-5 bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#059669]/10 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#064e3b] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#059669]" /> Cumulative Received vs Expected
                </h3>
                <p className="text-xs text-[#064e3b]/60 mt-0.5">
                  Contractual cash schedule versus realized distributions
                </p>
              </div>
              {hasCumulativeData && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-[#059669] border border-[#059669]/20">
                  Fixed Tenor
                </span>
              )}
            </div>

            <div className="py-2">
              {!hasFixedContracts ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[#fcfaf7] rounded-xl border border-[#059669]/10">
                  <Info className="w-8 h-8 mb-2 text-[#059669]/60" />
                  <p className="text-sm font-bold text-[#064e3b]">
                    Variable-Return Portfolio
                  </p>
                  <p className="text-xs text-[#064e3b]/70 mt-1 max-w-sm leading-relaxed">
                    Cumulative schedule projection applies to fixed-income structures (Murabaha & Ijara).
                    Variable contracts (Mudarabah profit sharing and SPV Equity dividends) report payouts periodically upon performance milestones.
                  </p>
                </div>
              ) : !hasCumulativeData ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <TrendingUp className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">Awaiting schedule activation</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Contractual payout schedules activate when project funds are released from escrow.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative h-64 w-full">
                    {cumulativeChartData && <Line data={cumulativeChartData} options={cumulativeChartOptions} />}
                  </div>

                  {/* Accessible Screen-Reader Table */}
                  <table className="sr-only">
                    <caption>Cumulative expected versus received repayments in UTC</caption>
                    <thead>
                      <tr>
                        <th scope="col">Month (UTC)</th>
                        <th scope="col">Cumulative Expected</th>
                        <th scope="col">Cumulative Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cumulativeData.labels.map((label, idx) => (
                        <tr key={label}>
                          <td>{label}</td>
                          <td>{formatCurrency(cumulativeData.expectedData[idx] || 0, currency)}</td>
                          <td>{formatCurrency(cumulativeData.receivedData[idx] || 0, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {hasCumulativeData && (
              <div className="border-t border-[#059669]/10 pt-3 text-xs text-center text-[#064e3b]/70 font-medium">
                Target Realization:{" "}
                <span className="font-bold text-[#064e3b]">
                  {formatCurrency(cumulativeData.expectedData[cumulativeData.expectedData.length - 1] || 0, currency)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Footer Compliance & Security Notice */}
      <div className="border-t border-[#059669]/10 pt-3 text-xs text-center text-[#064e3b]/70 font-medium flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-[#059669]" />
        <span>
          Distributions are recorded directly to investor bank accounts upon issuer authorization and verified against Sharia parameters.
        </span>
      </div>
    </div>
  );
}
