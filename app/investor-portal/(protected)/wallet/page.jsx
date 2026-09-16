"use client";

import { useState, useEffect } from "react";
import { getInvestorPortalData, topUpWallet } from "@/app/actions/investor-portal";
import { Wallet, PlusCircle, ArrowDownLeft, ShieldCheck, CheckCircle2, X, DollarSign, Loader2 } from "lucide-react";

export default function MyWalletPage() {
  const [balance, setBalance] = useState(0);
  const [bankStatus, setBankStatus] = useState("verified");
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const [transactions, setTransactions] = useState([
    {
      id: 1,
      type: "Top Up",
      amount: 5000,
      date: "Sep 10, 2026",
      status: "Completed",
      reference: "TXN-8849201",
    },
    {
      id: 2,
      type: "Pledge Escrow",
      amount: -15000,
      date: "Aug 20, 2026",
      status: "Settled",
      reference: "TXN-7738209",
    },
    {
      id: 3,
      type: "Top Up",
      amount: 25000,
      date: "Aug 15, 2026",
      status: "Completed",
      reference: "TXN-6629104",
    },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getInvestorPortalData();
        setBalance(data.wallet_balance || 0);
        setBankStatus(data.bank_verification_status || "verified");
      } catch (err) {
        console.error("Failed to load wallet balance:", err);
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
        setTransactions((prev) => [
          {
            id: Date.now(),
            type: "Top Up",
            amount: amt,
            date: "Just Now",
            status: "Completed",
            reference: `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`,
          },
          ...prev,
        ]);
        setIsModalOpen(false);
        setTopUpAmount("");
        setSuccessToast(`Successfully added $${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} to your wallet!`);
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
            Manage your liquid balance, view deposit records, and fund upcoming investment pledges.
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
                `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
              Quick Tip
            </span>
            <h3 className="text-base font-bold text-[#064e3b]">Escrow Funding</h3>
            <p className="text-xs text-[#064e3b]/70 leading-relaxed">
              When you pledge towards a crowdfunding project, funds are drawn from your liquid wallet balance and held in regulated escrow until campaign milestones are verified.
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
      <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#064e3b]">Transaction Ledger</h2>
          <span className="text-xs font-semibold text-gray-500">Showing recent activity</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#064e3b]">
            <thead className="bg-[#ecfdf5] uppercase font-bold text-[#064e3b] border-b border-[#059669]/20">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Reference</th>
                <th className="py-3 px-4">Transaction Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-gray-500">{t.reference}</td>
                  <td className="py-3.5 px-4 font-bold text-[#064e3b]">{t.type}</td>
                  <td className="py-3.5 px-4 text-gray-600">{t.date}</td>
                  <td
                    className={`py-3.5 px-4 font-black ${
                      t.amount > 0 ? "text-emerald-600" : "text-amber-700"
                    }`}
                  >
                    {t.amount > 0 ? "+" : ""}${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
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
                  Enter Deposit Amount ($USD)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                    $
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 5000.00"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#fcfaf7] border border-[#059669]/30 text-[#064e3b] font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#059669]"
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
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 text-[#064e3b] font-bold text-xs border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    +${preset.toLocaleString()}
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
