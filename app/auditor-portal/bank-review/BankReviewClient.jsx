"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  Clock,
  Building2,
  User,
  ShieldCheck,
  AlertCircle,
  X,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Globe,
  CreditCard,
  Building,
  Mail,
  FileCheck2,
} from "lucide-react";
import {
  getBankReviewDetails,
  updateBankVerificationDecision,
} from "@/app/actions/auditor";

export default function BankReviewClient({ initialItems = [], initialError = null }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState(initialError);

  // Selected item modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalDetails, setModalDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Action states
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const handleOpenModal = async (item) => {
    setSelectedItem(item);
    setModalDetails(null);
    setLoadingDetails(true);
    setDetailsError(null);
    setShowRejectForm(false);
    setRejectionReason("");
    setActionError(null);

    try {
      const res = await getBankReviewDetails({
        entityType: item.entityType,
        entityId: item.id,
      });

      if (res.error) {
        setDetailsError(res.error);
      } else {
        setModalDetails(res);
      }
    } catch (err) {
      setDetailsError(err.message || "Failed to load bank details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    if (actionLoading) return;
    setSelectedItem(null);
    setModalDetails(null);
    setShowRejectForm(false);
    setRejectionReason("");
    setActionError(null);
  };

  const handleDecision = async (decision) => {
    if (!selectedItem) return;

    if (decision === "rejected" && !rejectionReason.trim()) {
      setActionError("Please provide a rejection reason before confirming.");
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await updateBankVerificationDecision({
        entityType: selectedItem.entityType,
        entityId: selectedItem.id,
        decision,
        rejectionReason: decision === "rejected" ? rejectionReason.trim() : null,
      });

      if (!res.success) {
        setActionError(res.error || "Failed to submit bank decision.");
        setActionLoading(false);
        return;
      }

      // Remove item from active queue list
      setItems((prev) => prev.filter((i) => !(i.entityType === selectedItem.entityType && i.id === selectedItem.id)));
      handleCloseModal();
      router.refresh();
    } catch (err) {
      setActionError(err.message || "An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
            <Landmark className="w-4 h-4 text-[#059669]" /> Module Verification
          </div>
          <h1 className="text-2xl font-extrabold text-[#064e3b]">Bank Details Reviews</h1>
          <p className="text-xs text-gray-500">
            Verify investor and issuer settlement bank accounts, IBAN validity, trade licenses, and proof of banking credentials.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-2xl text-xs font-extrabold self-start sm:self-auto">
          {items.length} Pending Review{items.length !== 1 ? "s" : ""}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue List Cards */}
      <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-xs">
        {items.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <Landmark className="w-10 h-10 mx-auto text-cyan-500/40" />
            <h3 className="text-sm font-bold text-gray-700">Queue Clear!</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              There are currently no settlement bank details pending auditor verification.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const isIssuer = item.entityType === "issuer";
              const isInstitutional = item.investorCategory === "institutional" || item.investorCategory === "corporate";

              return (
                <div
                  key={`${item.entityType}_${item.id}`}
                  onClick={() => handleOpenModal(item)}
                  className="p-5 sm:p-6 hover:bg-[#fcfbf7]/80 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Entity Badge */}
                      {isIssuer ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-extrabold uppercase tracking-wider">
                          <Building2 className="w-3 h-3 text-purple-600" />
                          <span>Issuer</span>
                        </span>
                      ) : isInstitutional ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider">
                          <Building className="w-3 h-3 text-indigo-600" />
                          <span>Institutional Investor</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider">
                          <User className="w-3 h-3 text-emerald-600" />
                          <span>Individual Investor</span>
                        </span>
                      )}

                      {/* Status Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                      </span>
                    </div>

                    <div>
                      {/* Card Title */}
                      <h3 className="text-base font-extrabold text-[#064e3b]">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                        {item.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" /> {item.email}</span>}
                        {item.country && <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-gray-400" /> {item.country}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <div className="text-left md:text-right text-[11px] text-gray-400">
                      <div>Submitted</div>
                      <div className="font-semibold text-gray-600">
                        {new Date(item.submittedAt || Date.now()).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(item);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#041d16] hover:bg-[#062c22] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      <span>Review Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bank Details Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-extrabold uppercase">
                    Bank Verification
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase">
                    Pending Review
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-[#064e3b]">
                  {selectedItem.title}
                </h2>
              </div>

              <button
                onClick={handleCloseModal}
                disabled={actionLoading}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Loading / Error / Data */}
            {loadingDetails ? (
              <div className="py-12 text-center text-gray-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-600" />
                <p className="text-xs font-semibold text-gray-500">Decrypting bank details & fetching profile records...</p>
              </div>
            ) : detailsError ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{detailsError}</span>
              </div>
            ) : modalDetails ? (
              <div className="space-y-6">
                {/* 1. Account Holder / Profile Summary */}
                <div className="bg-[#fcfbf7] border border-emerald-900/10 rounded-2xl p-4 sm:p-5 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#064e3b] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Profile & Identity Details</span>
                  </h3>

                  {modalDetails.entityType === "investor" && modalDetails.entity?.type === "individual" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block font-medium">Full Name</span>
                        <span className="font-bold text-gray-800">{modalDetails.entity.full_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Decrypted ID Number</span>
                        <span className="font-mono font-bold text-emerald-900">{modalDetails.entity.id_number || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Nationality</span>
                        <span className="font-bold text-gray-800">{modalDetails.entity.nationality || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Date of Birth</span>
                        <span className="font-bold text-gray-800">{modalDetails.entity.date_of_birth || "N/A"}</span>
                      </div>
                    </div>
                  )}

                  {((modalDetails.entityType === "investor" && modalDetails.entity?.type === "institutional") || modalDetails.entityType === "issuer") && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block font-medium">Legal Entity Name</span>
                        <span className="font-bold text-gray-800">{modalDetails.entity.legal_entity_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Decrypted Trade License Number</span>
                        <span className="font-mono font-bold text-emerald-900">{modalDetails.entity.trade_license_number || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">License Authority</span>
                        <span className="font-bold text-gray-800">{modalDetails.entity.license_authority || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Business Type</span>
                        <span className="font-bold text-gray-800">{modalDetails.entity.business_type || "N/A"}</span>
                      </div>
                      {modalDetails.entity.issuer_type && (
                        <div>
                          <span className="text-gray-400 block font-medium">Issuer Type</span>
                          <span className="font-bold text-gray-800 uppercase">{modalDetails.entity.issuer_type}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Decrypted Settlement Bank Details */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#064e3b] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Settlement Bank Account Details</span>
                  </h3>

                  {modalDetails.entity?.bank_details ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                        <span className="text-gray-400 block text-[11px]">Bank Name</span>
                        <span className="font-extrabold text-gray-900 text-sm">
                          {modalDetails.entity.bank_details.bank_name || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                        <span className="text-gray-400 block text-[11px]">Account Holder Name</span>
                        <span className="font-bold text-gray-900">
                          {modalDetails.entity.bank_details.account_holder || modalDetails.entity.bank_details.account_name || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl space-y-1 sm:col-span-2">
                        <span className="text-emerald-800 block text-[11px] font-bold uppercase tracking-wider">
                          Decrypted IBAN / Account Number
                        </span>
                        <span className="font-mono font-black text-[#064e3b] text-base tracking-wide select-all">
                          {modalDetails.entity.bank_details.iban || modalDetails.entity.bank_details.account_number || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                        <span className="text-gray-400 block text-[11px]">SWIFT / BIC Code</span>
                        <span className="font-bold text-gray-800 font-mono">
                          {modalDetails.entity.bank_details.swift_code || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                        <span className="text-gray-400 block text-[11px]">Settlement Currency</span>
                        <span className="font-extrabold text-gray-900">
                          {modalDetails.entity.bank_details.currency || "AED"}
                        </span>
                      </div>

                      {modalDetails.entity.bank_details.bank_address && (
                        <div className="p-3 bg-gray-50 rounded-xl space-y-1 sm:col-span-2">
                          <span className="text-gray-400 block text-[11px]">Bank Branch Address</span>
                          <span className="font-medium text-gray-700">
                            {modalDetails.entity.bank_details.bank_address}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                      No bank details object found on entity record.
                    </div>
                  )}
                </div>

                {/* 3. Bank Verification Letter Document */}
                {modalDetails.letterDoc && (
                  <div className="bg-cyan-50/50 border border-cyan-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-cyan-950">Bank Verification Letter</h4>
                        <p className="text-[11px] text-cyan-700">Proof of account ownership document uploaded during onboarding.</p>
                      </div>
                    </div>

                    {modalDetails.letterDoc.signedUrl ? (
                      <a
                        href={modalDetails.letterDoc.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-colors shrink-0"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No File URL</span>
                    )}
                  </div>
                )}

                {/* Error Banner for Action */}
                {actionError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Rejection Form Input */}
                {showRejectForm && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                    <label className="block text-xs font-extrabold text-red-900 uppercase tracking-wider">
                      Specify Bank Verification Rejection Reason *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g., Account holder name does not match legal entity name, or IBAN format is invalid."
                      className="w-full p-3 rounded-xl border border-red-300 text-xs text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-hidden bg-white"
                      rows={3}
                      disabled={actionLoading}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowRejectForm(false)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200/60 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDecision("rejected")}
                        disabled={actionLoading || !rejectionReason.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>Confirm Rejection</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Decision Actions Footer */}
                {!showRejectForm && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Bank Details</span>
                    </button>

                    <button
                      onClick={() => handleDecision("approved")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/10 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Approve Bank Details</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
