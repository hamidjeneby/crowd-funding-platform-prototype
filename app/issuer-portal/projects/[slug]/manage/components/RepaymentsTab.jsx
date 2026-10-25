"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Coins,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  FileText,
  ShieldCheck,
  Info,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import {
  getProjectRepaymentPeriods,
  previewPeriodPayout,
  payPeriod,
  reportPeriod,
  declareDividend,
  recordExit,
} from "@/app/actions/repayments";

export default function RepaymentsTab({ project }) {
  const projectId = project?.id;
  const projectStatus = project?.status;
  const isSpvEquity = project?.sharia_contract_type === "spv_equity";
  const currency = project?.currency || "AED";

  const contractTerms = useMemo(() => {
    if (!project?.contract_terms) return {};
    if (typeof project.contract_terms === "string") {
      try {
        return JSON.parse(project.contract_terms);
      } catch {
        return {};
      }
    }
    return project.contract_terms;
  }, [project?.contract_terms]);

  const isIjaraThirdPartySale =
    project?.sharia_contract_type === "ijara" &&
    contractTerms?.end_of_term === "sale_to_third_party";

  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState([]);
  const [error, setError] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  // Modals state
  const [payModal, setPayModal] = useState({
    isOpen: false,
    period: null,
    loading: false,
    preview: null,
    submitting: false,
  });

  const [reportModal, setReportModal] = useState({
    isOpen: false,
    period: null,
    amount: "",
    notes: "",
    capitalReturnPercent: "100",
    submitting: false,
    error: null,
  });

  const [equityModal, setEquityModal] = useState({
    isOpen: false,
    type: "dividend", // 'dividend' | 'exit'
    amount: "",
    notes: "",
    submitting: false,
    error: null,
  });

  // Fetch periods data
  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getProjectRepaymentPeriods(projectId);
      if (!res.success) {
        throw new Error(res.error || "Failed to load repayment schedule.");
      }
      setPeriods(res.periods || []);
    } catch (err) {
      console.error("Error loading repayment periods:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if exit period already recorded for equity
  const hasExitPeriod = useMemo(
    () => periods.some((p) => p.kind === "exit"),
    [periods]
  );

  // Calculate if all earlier periods for the report modal were profitable
  const earlierModalPeriods = useMemo(() => {
    if (!reportModal.period) return [];
    return periods.filter((p) => p.period_no < reportModal.period.period_no);
  }, [periods, reportModal.period]);

  const allEarlierProfitable = useMemo(() => {
    if (earlierModalPeriods.length === 0) return true;
    return earlierModalPeriods.every((p) => {
      const profit = Number(p.reported_amount ?? p.total_paid ?? 0);
      return profit > 0;
    });
  }, [earlierModalPeriods]);

  // Handle open Pay modal with preview
  const handleOpenPayModal = async (period) => {
    setPayModal({
      isOpen: true,
      period,
      loading: true,
      preview: null,
      submitting: false,
    });

    try {
      const previewRes = await previewPeriodPayout(period.id);
      if (!previewRes.success) {
        throw new Error(previewRes.error || "Failed to preview payout.");
      }
      setPayModal((prev) => ({
        ...prev,
        loading: false,
        preview: previewRes,
      }));
    } catch (err) {
      alert(`Error loading payout preview: ${err.message}`);
      setPayModal({ isOpen: false, period: null, loading: false, preview: null, submitting: false });
    }
  };

  // Handle confirm Pay action
  const handleConfirmPay = async () => {
    if (!payModal.period) return;
    setPayModal((prev) => ({ ...prev, submitting: true }));
    setActionSuccessMessage(null);

    try {
      const res = await payPeriod(payModal.period.id);
      if (!res.success) {
        throw new Error(res.error || "Failed to execute payout.");
      }

      setPayModal({ isOpen: false, period: null, loading: false, preview: null, submitting: false });

      if (res.failed_count > 0) {
        setActionSuccessMessage(
          `Simulated payment executed: ${res.paid_count} investors paid (${currency} ${Number(res.total_paid).toLocaleString()}). ${res.failed_count} investors could not be paid (no bank account on file), retry later.`
        );
      } else {
        setActionSuccessMessage(
          `Simulated payment executed successfully: ${res.paid_count} investors paid (${currency} ${Number(res.total_paid).toLocaleString()}).`
        );
      }

      await loadData();
    } catch (err) {
      alert(`Payment failed: ${err.message}`);
      setPayModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Handle submit Report (Mudarabah profit or Ijara sale proceeds)
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportModal.period) return;

    setReportModal((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const numericAmount = Number(reportModal.amount);
      if (isNaN(numericAmount) || numericAmount < 0) {
        throw new Error("Amount must be a valid number >= 0.");
      }

      let capPercent = null;
      if (reportModal.period.is_final && project?.sharia_contract_type === "mudarabah") {
        capPercent = Number(reportModal.capitalReturnPercent);
        if (isNaN(capPercent) || capPercent < 0 || capPercent > 100) {
          throw new Error("Capital return percentage must be between 0 and 100.");
        }
        if (allEarlierProfitable && numericAmount > 0 && capPercent !== 100) {
          throw new Error("Capital return percentage must be 100% when profits (> 0) are reported and all previous quarters were profitable. Set profit to 0 to declare a capital loss.");
        }
      }

      const res = await reportPeriod(
        reportModal.period.id,
        numericAmount,
        reportModal.notes,
        capPercent
      );

      if (!res.success) {
        throw new Error(res.error || "Failed to submit profit report.");
      }

      setReportModal({
        isOpen: false,
        period: null,
        amount: "",
        notes: "",
        capitalReturnPercent: "100",
        submitting: false,
        error: null,
      });

      setActionSuccessMessage(
        `Period #${res.period_no} report submitted successfully. Payout is now ready to execute.`
      );
      await loadData();
    } catch (err) {
      setReportModal((prev) => ({ ...prev, submitting: false, error: err.message }));
    }
  };

  // Handle submit Equity action (dividend or exit)
  const handleSubmitEquity = async (e) => {
    e.preventDefault();
    setEquityModal((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      const numericAmount = Number(equityModal.amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error("Amount must be a number greater than 0.");
      }

      let res;
      if (equityModal.type === "dividend") {
        res = await declareDividend(projectId, numericAmount, equityModal.notes);
      } else {
        res = await recordExit(projectId, numericAmount, equityModal.notes);
      }

      if (!res.success) {
        throw new Error(res.error || "Failed to record equity distribution.");
      }

      setEquityModal({
        isOpen: false,
        type: "dividend",
        amount: "",
        notes: "",
        submitting: false,
        error: null,
      });

      setActionSuccessMessage(
        equityModal.type === "dividend"
          ? `Dividend period declared (${currency} ${numericAmount.toLocaleString()}). Ready to pay.`
          : `Exit proceeds recorded (${currency} ${numericAmount.toLocaleString()}). Ready to execute final settlement.`
      );
      await loadData();
    } catch (err) {
      setEquityModal((prev) => ({ ...prev, submitting: false, error: err.message }));
    }
  };

  // 1. Guard: When project is 'funded' but not yet active
  if (projectStatus === "funded") {
    return (
      <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 shadow-xs text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto">
          <Clock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-[#064e3b]">
          Funds have not been released yet.
        </h3>
        <p className="text-sm text-[#064e3b]/70 leading-relaxed max-w-md mx-auto">
          This project has closed successfully and is currently funded in escrow. Once milestone verification and administrative fund release are finalized, repayment schedules and periodic distribution reporting will be generated and displayed here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Simulation Notice Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-[#059669]/25 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#064e3b]">
                Repayment Engine • Realistic Simulation
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 text-[#064e3b] border border-emerald-300">
                Wallet Untouched
              </span>
            </div>
            <p className="text-xs text-[#064e3b]/80 mt-1 leading-relaxed">
              Payments record Sharia profit and principal disbursements as if sent to each investor&apos;s verified bank account. No wallet funds are deducted.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#059669]/20 text-[#064e3b] hover:bg-emerald-50 transition-colors shadow-2xs shrink-0 self-end sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#059669]" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Action Success Alert */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* SPV Equity Action Bar */}
      {isSpvEquity && projectStatus === "active" && (
        <div className="bg-white rounded-2xl border border-[#059669]/20 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-[#064e3b] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#059669]" /> SPV Equity Distributions
            </h4>
            <p className="text-xs text-[#064e3b]/60 mt-0.5">
              Declare dividend distributions or execute final equity exit settlement
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setEquityModal({
                  isOpen: true,
                  type: "dividend",
                  amount: "",
                  notes: "",
                  submitting: false,
                  error: null,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#064e3b] text-white hover:bg-[#047857] shadow-xs transition-colors cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Declare Dividend
            </button>

            <button
              onClick={() =>
                setEquityModal({
                  isOpen: true,
                  type: "exit",
                  amount: "",
                  notes: "",
                  submitting: false,
                  error: null,
                })
              }
              disabled={hasExitPeriod}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs ${
                hasExitPeriod
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : "bg-purple-700 text-white hover:bg-purple-800 cursor-pointer"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Record Exit
            </button>
          </div>
        </div>
      )}

      {/* Repayments Periods Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#059669]" /> Payout Schedule & Execution
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Contractual Sharia cash flow periods, profit reporting milestones, and settlement status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
              Contract: {project?.sharia_contract_type?.replace("_", " ").toUpperCase()}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#059669] animate-spin" />
            <p className="text-xs font-medium text-gray-500">Loading payout periods...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-sm font-bold text-rose-800">{error}</p>
            <button
              onClick={loadData}
              className="text-xs font-semibold text-rose-700 underline"
            >
              Try again
            </button>
          </div>
        ) : periods.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs space-y-2">
            <CalendarClock className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="font-semibold text-gray-700">No payout periods created yet.</p>
            {isSpvEquity && (
              <p className="text-gray-400 max-w-sm mx-auto">
                For SPV Equity projects, declare a dividend or record an exit above to initiate distribution periods.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-extrabold text-[10px] bg-gray-50/50">
                  <th className="py-3 px-4">Period #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Due Date (UTC)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Details / Outcome</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {periods.map((p, idx) => {
                  const isPaid = p.status === "paid";
                  const isReported = p.status === "reported";
                  const isScheduled = p.status === "scheduled";
                  const isDue = p.due_date ? new Date(p.due_date) <= new Date() : true;

                  // Check if earlier periods are paid
                  const earlierUnpaid = periods.slice(0, idx).some((prev) => prev.status !== "paid");

                  const canReportProfit =
                    !isPaid &&
                    !isReported &&
                    isDue &&
                    !earlierUnpaid &&
                    (p.kind === "profit_share" || (isIjaraThirdPartySale && p.is_final));

                  const canPay =
                    !isPaid &&
                    !earlierUnpaid &&
                    (isReported || (isScheduled && isDue && p.kind !== "profit_share" && !(isIjaraThirdPartySale && p.is_final)));

                  const hasFailedRows = p.failed_count > 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#fdfbf7] transition-all">
                      {/* Period # */}
                      <td className="py-3.5 px-4 font-bold text-[#064e3b]">
                        <div className="flex items-center gap-1.5">
                          <span>Period {p.period_no}</span>
                          {p.is_final && (
                            <span className="text-[10px] bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-extrabold border border-purple-200">
                              Final
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-semibold text-gray-700">
                          {p.kind.replace("_", " ")}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 text-gray-600">
                        {p.due_date ? (
                          <>
                            {new Date(p.due_date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold border border-emerald-300">
                            Paid
                          </span>
                        ) : isReported ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300">
                            Reported
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
                            Scheduled
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-[#064e3b]">
                        {isPaid && p.total_paid != null ? (
                          `${currency} ${Number(p.total_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : isReported && p.reported_amount != null ? (
                          `${currency} ${Number(p.reported_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : p.total_scheduled != null && p.total_scheduled > 0 ? (
                          <div>
                            <span>
                              {currency} {Number(p.total_scheduled).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                              Scheduled
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Details / Outcome */}
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        {isPaid ? (
                          <div className="space-y-0.5">
                            <span className="text-emerald-800 font-bold block">
                              Paid on {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "today"}
                            </span>
                            {hasFailedRows && (
                              <span className="text-rose-700 font-bold text-[11px] block">
                                {p.failed_count} failed (no bank account)
                              </span>
                            )}
                          </div>
                        ) : isReported ? (
                          <span className="text-amber-800 font-semibold block">
                            Reported • Ready to pay
                          </span>
                        ) : earlierUnpaid ? (
                          <span className="text-gray-400 text-[11px] italic block">
                            Waiting for earlier periods
                          </span>
                        ) : !isDue ? (
                          <span className="text-gray-500 text-[11px] block">
                            Scheduled for due date
                          </span>
                        ) : (
                          <span className="text-blue-700 font-semibold block">
                            Due now
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canReportProfit && (
                            <button
                              onClick={() =>
                                setReportModal({
                                  isOpen: true,
                                  period: p,
                                  amount: "",
                                  notes: "",
                                  capitalReturnPercent: "100",
                                  submitting: false,
                                  error: null,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-2xs transition-colors cursor-pointer"
                            >
                              {project?.sharia_contract_type === "ijara"
                                ? "Report sale proceeds"
                                : "Report profit"}
                            </button>
                          )}

                          {canPay && (
                            <button
                              onClick={() => handleOpenPayModal(p)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#064e3b] text-white hover:bg-[#047857] shadow-2xs transition-colors cursor-pointer"
                            >
                              Pay investors
                            </button>
                          )}

                          {hasFailedRows && !canPay && (
                            <button
                              onClick={() => handleOpenPayModal(p)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition-colors cursor-pointer"
                            >
                              Retry failed
                            </button>
                          )}

                          {isPaid && !hasFailedRows && (
                            <div className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Completed</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: PAY INVESTORS CONFIRMATION */}
      {payModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-lg w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#059669]">
                  Period #{payModal.period?.period_no} Distribution
                </span>
                <h3 className="text-xl font-extrabold text-[#064e3b] mt-0.5">
                  Authorize Investor Payment
                </h3>
              </div>
              <button
                onClick={() => setPayModal({ isOpen: false, period: null, loading: false, preview: null, submitting: false })}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Simulation Warning Callout */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                Simulated payment, no money moves.
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                This transaction validates investor bank records, generates simulated bank reference codes, and notifies all verified holders. No real cash is moved and investor wallet balances remain untouched.
              </p>
            </div>

            {/* Payout Preview Metrics */}
            {payModal.loading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 text-[#059669] animate-spin" />
                <span className="text-xs text-gray-500">Calculating distribution amounts...</span>
              </div>
            ) : payModal.preview ? (
              <div className="bg-[#fcfaf7] border border-[#059669]/15 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Total Payout Amount:</span>
                  <span className="text-base font-extrabold text-[#064e3b]">
                    {currency} {Number(payModal.preview.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Eligible Investors:</span>
                  <span className="font-bold text-gray-800">
                    {payModal.preview.investor_count} {payModal.preview.investor_count === 1 ? "investor" : "investors"}
                  </span>
                </div>
                {payModal.preview.failed_count > 0 && (
                  <div className="flex items-center justify-between text-xs text-rose-700 font-semibold pt-1 border-t border-gray-200">
                    <span>Missing Bank Details:</span>
                    <span>{payModal.preview.failed_count} will be flagged as failed</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPayModal({ isOpen: false, period: null, loading: false, preview: null, submitting: false })}
                disabled={payModal.submitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPay}
                disabled={payModal.loading || payModal.submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#064e3b] text-white hover:bg-[#047857] shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {payModal.submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REPORT PROFIT / PROCEEDS */}
      {reportModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReport}
            className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-md w-full p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Period #{reportModal.period?.period_no} Disclosure
                </span>
                <h3 className="text-xl font-extrabold text-[#064e3b] mt-0.5">
                  {project?.sharia_contract_type === "ijara"
                    ? "Report Sale Proceeds"
                    : "Report Realized Profit"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportModal({ isOpen: false, period: null, amount: "", notes: "", capitalReturnPercent: "100", submitting: false, error: null })}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {reportModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                {reportModal.error}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Reported Amount ({currency}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={reportModal.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "" && Number(val) < 0) return;
                    setReportModal((prev) => {
                      const numVal = Number(val);
                      // If all earlier periods were profitable and amount > 0, lock and reset capitalReturnPercent to 100
                      const nextCap =
                        allEarlierProfitable && numVal > 0 ? "100" : prev.capitalReturnPercent;
                      return {
                        ...prev,
                        amount: val,
                        capitalReturnPercent: nextCap,
                      };
                    });
                  }}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669] text-sm font-semibold"
                />
                <span className="text-gray-400 text-[11px] mt-1 block">
                  {project?.sharia_contract_type === "mudarabah"
                    ? "Enter 0 if no profit was realized during this cycle."
                    : "Enter total proceeds realized from the third-party asset sale."}
                </span>
              </div>

              {/* Capital Return % on final period (Mudarabah only) */}
              {reportModal.period?.is_final && project?.sharia_contract_type === "mudarabah" && (() => {
                const isProfitReported = Number(reportModal.amount) > 0;
                const isLocked = allEarlierProfitable && isProfitReported;

                return (
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Capital Return Percentage (%) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      disabled={isLocked}
                      value={isLocked ? "100" : reportModal.capitalReturnPercent}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setReportModal((prev) => ({ ...prev, capitalReturnPercent: "" }));
                          return;
                        }
                        const num = Number(val);
                        if (num < 0 || num > 100) return;
                        setReportModal((prev) => ({ ...prev, capitalReturnPercent: val }));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        isLocked
                          ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed select-none"
                          : "border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      }`}
                    />
                    <span className="text-gray-400 text-[11px] mt-1 block">
                      {isLocked
                        ? "Under Sharia rules, capital return is locked at 100% because all previous quarters and this quarter were profitable. To declare a capital loss, set Reported Amount to 0."
                        : "Default is 100% (full capital return). Enter a lower percentage (e.g. 80%) to simulate partial capital loss."}
                    </span>
                  </div>
                );
              })()}

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Notes & Operational Disclosures
                </label>
                <textarea
                  rows={3}
                  value={reportModal.notes}
                  onChange={(e) => setReportModal((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Provide context or audited milestone performance notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669] text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setReportModal({ isOpen: false, period: null, amount: "", notes: "", capitalReturnPercent: "100", submitting: false, error: null })}
                disabled={reportModal.submitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reportModal.submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#064e3b] text-white hover:bg-[#047857] shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {reportModal.submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: SPV EQUITY DECLARE DIVIDEND / RECORD EXIT */}
      {equityModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitEquity}
            className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-md w-full p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#059669]">
                  SPV Equity Distribution
                </span>
                <h3 className="text-xl font-extrabold text-[#064e3b] mt-0.5">
                  {equityModal.type === "dividend" ? "Declare Dividend Pool" : "Record Exit Proceeds"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEquityModal({ isOpen: false, type: "dividend", amount: "", notes: "", submitting: false, error: null })}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {equityModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                {equityModal.error}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  {equityModal.type === "dividend" ? "Total Dividend Pool" : "Total Exit Proceeds"} ({currency}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={equityModal.amount}
                  onChange={(e) => setEquityModal((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669] text-sm font-semibold"
                />
                <span className="text-gray-400 text-[11px] mt-1 block">
                  Amount will be distributed pro-rata across all held equity units.
                </span>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Notes / Dividend Resolution
                </label>
                <textarea
                  rows={3}
                  value={equityModal.notes}
                  onChange={(e) => setEquityModal((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Details of board approval or exit valuation..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669] text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEquityModal({ isOpen: false, type: "dividend", amount: "", notes: "", submitting: false, error: null })}
                disabled={equityModal.submitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={equityModal.submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#064e3b] text-white hover:bg-[#047857] shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {equityModal.submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {equityModal.type === "dividend" ? "Create Dividend Period" : "Record Final Exit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
