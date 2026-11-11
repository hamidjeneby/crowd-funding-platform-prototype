"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getInvestorPortalData,
  topUpWallet,
  getInvestorWalletTransactions,
} from "@/app/actions/investor-portal";
import {
  Wallet,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  X,
  DollarSign,
  Loader2,
  FileText,
  Clock,
  ExternalLink,
  Layers,
} from "lucide-react";

function formatUtcDateTime(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
  } catch (e) {
    return "—";
  }
}

export default function MyWalletPage() {
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState("AED");
  const [bankStatus, setBankStatus] = useState("verified");
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Ledger Transactions State
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    async function loadData() {
      try {
        const [portalData, txData] = await Promise.all([
          getInvestorPortalData(),
          getInvestorWalletTransactions(),
        ]);
        setBalance(portalData.wallet_balance || 0);
        setCurrency(portalData.bank_details?.currency || "AED");
        setBankStatus(portalData.bank_verification_status || "verified");
        setTransactions(txData || []);
      } catch (err) {
        console.error("Failed to load wallet data:", err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, []);

  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a valid positive dollar amount.");
      return;
    }

    if (bankStatus === "pending") {
      setErrorMsg("Wallet loading is temporarily disabled while your bank details verification is PENDING.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await topUpWallet(amt);
      if (res.success) {
        setBalance(res.newBalance);
        try {
          const freshTxs = await getInvestorWalletTransactions();
          setTransactions(freshTxs || []);
        } catch (fetchErr) {
          console.error("Error refreshing wallet transactions:", fetchErr);
        }
        setIsModalOpen(false);
        setTopUpAmount("");
        setSuccessToast(
          `Successfully added ${currency} ${amt.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} to your wallet!`
        );
        setTimeout(() => setSuccessToast(""), 5000);
      } else {
        setErrorMsg(res.error || "Failed to process wallet top-up.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ledger Aggregations & Filtering
  const totalDeposited = transactions
    .filter((t) => t.type === "top_up")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalEscrowDebited = transactions
    .filter((t) => t.type === "pledge_debit")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalRefunded = transactions
    .filter((t) => t.type === "refund_credit")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const depositsCount = transactions.filter((t) => t.type === "top_up").length;
  const pledgesCount = transactions.filter((t) => t.type === "pledge_debit").length;
  const refundsCount = transactions.filter((t) => t.type === "refund_credit").length;

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === "top_up") return t.type === "top_up";
    if (filterType === "pledge_debit") return t.type === "pledge_debit";
    if (filterType === "refund_credit") return t.type === "refund_credit";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8">
      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-900 text-emerald-100 border border-emerald-700 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast("")} className="text-emerald-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Investor Treasury
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            My Wallet
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Manage your liquid balance, track real-time escrow allocations, and inspect your immutable transaction ledger.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg("");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#064e3b] text-white font-bold text-sm hover:bg-[#047857] transition-all shadow-md cursor-pointer self-start md:self-auto"
        >
          <PlusCircle className="w-5 h-5" /> Top Up Wallet
        </button>
      </div>

      {/* Wallet Balance Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-[#064e3b] via-emerald-900 to-emerald-950 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet className="w-48 h-48 text-white" />
          </div>

          <div className="relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              Available Liquid Balance
            </span>
            <div className="text-4xl lg:text-5xl font-black tracking-tight text-white mt-2">
              {isLoadingData ? (
                <span className="text-2xl text-emerald-200">Loading balance...</span>
              ) : (
                `${currency} ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-200">
            <span>Escrow Ready: Yes</span>
            <span>Bank Status: {bankStatus.toUpperCase()}</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#059669]/15 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Escrow Operations
            </span>
            <h3 className="text-base font-bold text-[#064e3b]">How Escrow Works</h3>
            <p className="text-xs text-[#064e3b]/70 leading-relaxed">
              When you submit a pledge, funds are debited from your liquid balance and held in regulated campaign escrow. If a campaign is oversubscribed or fails to meet its soft cap, funds are refunded back directly to your wallet.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full mt-4 py-2.5 rounded-xl bg-emerald-50 text-[#064e3b] font-bold text-xs hover:bg-emerald-100 transition-colors border border-emerald-200 cursor-pointer"
          >
            Add Funds Now
          </button>
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="p-6 lg:p-8 rounded-3xl bg-white border border-[#059669]/15 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#059669]" /> Transaction Ledger
            </h2>
            <p className="text-xs text-[#064e3b]/70 mt-0.5">
              Immutable audit ledger of your wallet balance events, escrow debits, and refund credits.
            </p>
          </div>

          {/* Quick Ledger Summary Badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#064e3b] font-medium flex items-center gap-1.5">
              <span className="text-gray-500">Deposits:</span>
              <span className="font-extrabold text-emerald-700">
                +{currency}{" "}
                {totalDeposited.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium flex items-center gap-1.5">
              <span className="text-amber-700/80">In Escrow:</span>
              <span className="font-extrabold text-amber-800">
                -{currency}{" "}
                {totalEscrowDebited.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-medium flex items-center gap-1.5">
              <span className="text-teal-700/80">Refunded:</span>
              <span className="font-extrabold text-teal-800">
                +{currency}{" "}
                {totalRefunded.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3 overflow-x-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-[#064e3b] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Activity ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType("top_up")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "top_up"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Deposits ({depositsCount})
          </button>
          <button
            onClick={() => setFilterType("pledge_debit")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "pledge_debit"
                ? "bg-amber-700 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Pledge Debits ({pledgesCount})
          </button>
          <button
            onClick={() => setFilterType("refund_credit")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "refund_credit"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Refunds ({refundsCount})
          </button>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#064e3b]">
            <thead className="bg-[#ecfdf5] uppercase font-bold text-[#064e3b] border-b border-[#059669]/20 text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 rounded-l-xl whitespace-nowrap min-w-[230px]">
                  Reference
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Type</th>
                <th className="py-3 px-4 min-w-[200px]">Description / Project</th>
                <th className="py-3 px-4 whitespace-nowrap">Date (UTC)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Amount</th>
                <th className="py-3 px-4 rounded-r-xl text-right whitespace-nowrap">
                  Balance After
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {isLoadingData ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
                      <span>Loading ledger transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669]">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-[#064e3b]">
                        No transactions found
                      </p>
                      <p className="text-xs text-gray-500 max-w-sm">
                        {filterType === "all"
                          ? "You have not made any deposits, pledges, or refunds yet. Top up your wallet to get started."
                          : `No ${filterType.replace("_", " ")} transactions recorded in your ledger.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const isCredit =
                    t.type === "top_up" || t.type === "refund_credit";
                  const projectTitle = t.pledge?.project?.title;
                  const projectSlug = t.pledge?.project?.slug;
                  const txCurrency = t.pledge?.project?.currency || currency;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-emerald-50/40 transition-colors"
                    >
                      {/* 1. Reference & Pledge Link */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap min-w-[230px]">
                        <div className="font-bold text-[#064e3b] text-xs tracking-tight">
                          {t.reference_code || `TXN-${String(t.id).padStart(6, "0")}`}
                        </div>
                        {t.pledge_id && (
                          <Link
                            href="/investor-portal/investments"
                            className="inline-flex items-center gap-1 text-[10px] text-[#059669] hover:underline font-semibold mt-0.5"
                            title="View in My Investments"
                          >
                            Pledge #{t.pledge_id}
                          </Link>
                        )}
                      </td>

                      {/* 2. Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {t.type === "top_up" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px]">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />{" "}
                            Deposit
                          </span>
                        )}
                        {t.type === "pledge_debit" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px]">
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />{" "}
                            Pledge Escrow
                          </span>
                        )}
                        {t.type === "refund_credit" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-300 font-bold text-[11px]">
                            <RotateCcw className="w-3.5 h-3.5 text-teal-700" />{" "}
                            Escrow Refund
                          </span>
                        )}
                      </td>

                      {/* 3. Description / Project */}
                      <td className="py-3.5 px-4">
                        {projectTitle ? (
                          <div className="space-y-0.5 max-w-xs">
                            <Link
                              href={
                                projectSlug
                                  ? `/investor-portal/projects/${projectSlug}`
                                  : "/investor-portal/investments"
                              }
                              className="font-bold text-[#064e3b] hover:text-[#059669] transition-colors flex items-center gap-1 group line-clamp-1"
                            >
                              <span>{projectTitle}</span>
                              <ExternalLink className="w-3 h-3 text-[#059669] opacity-70 group-hover:opacity-100 shrink-0" />
                            </Link>
                            <p className="text-[11px] text-gray-500">
                              {t.type === "pledge_debit"
                                ? "Committed to campaign escrow"
                                : "Returned from campaign escrow"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="font-bold text-gray-800">
                              {t.type === "top_up"
                                ? "Direct Liquid Deposit"
                                : t.type === "refund_credit"
                                ? "Debit Reversal / Escrow Refund"
                                : "Escrow Reservation"}
                            </span>
                            <p className="text-[11px] text-gray-500">
                              {t.type === "top_up"
                                ? "Funds credited to wallet"
                                : "Account adjustment"}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* 4. Date & Time (UTC) */}
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                        {formatUtcDateTime(t.created_at)}
                      </td>

                      {/* 5. Amount */}
                      <td
                        className={`py-3.5 px-4 font-black text-right whitespace-nowrap ${
                          isCredit ? "text-emerald-600" : "text-amber-800"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {txCurrency}{" "}
                        {t.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* 6. Balance After */}
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-700 text-right whitespace-nowrap">
                        {currency}{" "}
                        {t.balance_after.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Up Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 lg:p-8 space-y-6 shadow-2xl border border-[#059669]/20 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#064e3b]">
                <Wallet className="w-5 h-5 text-[#059669]" />
                <h3 className="text-xl font-bold">Top Up Wallet</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleTopUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#064e3b] mb-1.5">
                  Enter Deposit Amount ({currency})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                    {currency}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 5000.00"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    required
                    className="w-full pl-14 pr-4 py-3 rounded-xl bg-[#fcfaf7] border border-[#059669]/30 text-[#064e3b] font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Amount will be credited instantly to your wallet balance.
                </p>
              </div>

              {/* Quick Choice Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {[1000, 5000, 10000, 25000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopUpAmount(preset.toString())}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 text-[#064e3b] font-bold text-xs border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    +{preset.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-gray-600 font-semibold text-xs hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    "Submit Top Up"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
