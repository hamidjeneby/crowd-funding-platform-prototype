"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateInvestorDocumentDecision,
  updateInvestorBankDecision,
  updateInvestorClassDecision,
  submitInvestorFinalOnboardingDecision,
} from "@/app/actions/auditor";
import {
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  User,
  Building2,
  FileText,
  Lock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  Code,
  Landmark,
  RotateCcw,
  Send,
  X,
  Bot,
  Loader2,
} from "lucide-react";

export default function InvestorOnboardingDetailClient({
  investor: initialInvestor,
  documents: initialDocuments = [],
  representatives = [],
  classAiReview: initialClassAiReview = null,
  error: initialError,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic local state for immediate UI responsiveness
  const [documents, setLocalDocs] = useState(initialDocuments);
  const [investor, setLocalInvestor] = useState(initialInvestor);
  const [classAiReview, setLocalClassAiReview] = useState(initialClassAiReview);

  useEffect(() => {
    setLocalDocs(initialDocuments);
  }, [initialDocuments]);

  useEffect(() => {
    setLocalInvestor(initialInvestor);
  }, [initialInvestor]);

  useEffect(() => {
    setLocalClassAiReview(initialClassAiReview);
  }, [initialClassAiReview]);

  // Modal States
  const [rawOutputDoc, setRawOutputDoc] = useState(null);
  const [rawViewMode, setRawViewMode] = useState("rows"); // 'rows' or 'raw'
  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [docRejectionReason, setDocRejectionReason] = useState("");

  const [finalDecisionModal, setFinalDecisionModal] = useState(null); // 'send_back' or 'reject'
  const [finalReviewNotes, setFinalReviewNotes] = useState("");
  const [confirmationModal, setConfirmationModal] = useState(null); // { decision: "approve" | "send_back" | "reject", message: string }

  const [actionError, setActionError] = useState(initialError || null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [activeAction, setActiveAction] = useState(null);

  // Investor Class State
  const [selectedClass, setSelectedClass] = useState(
    investor?.investor_class || classAiReview?.suggested_class || 10
  );

  useEffect(() => {
    if (investor?.investor_class) {
      setSelectedClass(Number(investor.investor_class));
    } else if (classAiReview?.suggested_class) {
      setSelectedClass(Number(classAiReview.suggested_class));
    }
  }, [investor?.investor_class, classAiReview?.suggested_class]);

  const isClassConfirmed = !!(classAiReview?.reviewed_by);

  // Gating Validation: Check if status is pending_review, any document is pending, bank status is pending, or class is unconfirmed
  const pendingDocsCount = documents.filter((d) => d.status === "pending").length;
  const isBankPending = investor?.bank_verification_status === "pending";
  const rawOnboardingStatus = (investor?.onboarding_status || "").toLowerCase().trim();
  const isPendingReviewStatus =
    rawOnboardingStatus === "pending_review" ||
    rawOnboardingStatus === "pending review" ||
    rawOnboardingStatus === "pending";

  const isFinalDecisionDisabled =
    !isPendingReviewStatus || pendingDocsCount > 0 || isBankPending || !isClassConfirmed;

  // Handlers for Document Decisions
  const handleApproveDoc = (docId) => {
    setActionError(null);
    setActionSuccess(null);
    setActiveAction(`approve_doc_${docId}`);
    startTransition(async () => {
      try {
        const res = await updateInvestorDocumentDecision({
          docId,
          decision: "approved",
        });
        if (!res.success) {
          setActionError(res.error || "Failed to approve document.");
        } else {
          setActionSuccess("Document approved successfully.");
          setLocalDocs((prev) =>
            prev.map((d) => (d.id === docId ? { ...d, status: "approved", rejection_reason: null } : d))
          );
          router.refresh();
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  const handleConfirmRejectDoc = () => {
    if (!docRejectionReason.trim()) {
      setActionError("Please provide a rejection reason for this document.");
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    const docId = rejectingDoc.id;
    setActiveAction(`reject_doc_${docId}`);

    startTransition(async () => {
      try {
        const res = await updateInvestorDocumentDecision({
          docId,
          decision: "rejected",
          rejectionReason: docRejectionReason,
        });
        if (!res.success) {
          setActionError(res.error || "Failed to reject document.");
        } else {
          setActionSuccess("Document rejected successfully.");
          setLocalDocs((prev) =>
            prev.map((d) =>
              d.id === docId
                ? {
                    ...d,
                    status: "rejected",
                    url: null,
                    signedUrl: null,
                    rejection_reason: docRejectionReason,
                  }
                : d
            )
          );
          setRejectingDoc(null);
          setDocRejectionReason("");
          router.refresh();
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  // Handlers for Bank Details Decisions
  const handleBankDecision = (decision) => {
    setActionError(null);
    setActionSuccess(null);
    setActiveAction(`bank_${decision}`);
    startTransition(async () => {
      try {
        const res = await updateInvestorBankDecision({
          investorId: investor.id,
          decision,
        });
        if (!res.success) {
          setActionError(res.error || "Failed to update bank details status.");
        } else {
          setActionSuccess(`Bank details ${decision} successfully.`);
          setLocalInvestor((prev) => ({
            ...prev,
            bank_verification_status: decision,
          }));
          router.refresh();
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  // Handler for Investor Class Confirmation
  const handleConfirmClass = () => {
    setActionError(null);
    setActionSuccess(null);
    setActiveAction("confirm_class");

    startTransition(async () => {
      try {
        const res = await updateInvestorClassDecision({
          investorId: investor.id,
          selectedClass,
        });
        if (!res.success) {
          setActionError(res.error || "Failed to confirm investor class.");
        } else {
          setActionSuccess(`Investor Class ${selectedClass} approved and assigned successfully.`);
          setLocalClassAiReview((prev) => ({
            ...(prev || {}),
            reviewed_by: "auditor",
            final_decision: String(selectedClass),
          }));
          setLocalInvestor((prev) => ({
            ...prev,
            investor_class: Number(selectedClass),
          }));
          router.refresh();
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  // Handlers for Overall Final Decision
  const handleApproveFinalOnboarding = () => {
    setActionError(null);
    setActionSuccess(null);
    setActiveAction("final_approve");
    startTransition(async () => {
      try {
        const res = await submitInvestorFinalOnboardingDecision({
          investorId: investor.id,
          decision: "approve",
        });
        if (!res.success) {
          setActionError(res.error || "Failed to approve onboarding.");
        } else {
          setLocalInvestor((prev) => ({ ...prev, onboarding_status: "completed" }));
          setConfirmationModal({
            decision: "approve",
            message: `The investor onboarding application for "${displayName}" has been approved successfully.`,
          });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  const handleConfirmFinalReviewNotes = () => {
    if (!finalReviewNotes.trim()) {
      setActionError("Please enter review notes explaining your decision.");
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    const chosenDecision = finalDecisionModal;
    setActiveAction(`final_confirm_${chosenDecision}`);

    startTransition(async () => {
      try {
        const res = await submitInvestorFinalOnboardingDecision({
          investorId: investor.id,
          decision: chosenDecision,
          reviewNotes: finalReviewNotes,
        });
        if (!res.success) {
          setActionError(res.error || "Failed to process onboarding decision.");
        } else {
          setLocalInvestor((prev) => ({
            ...prev,
            onboarding_status: chosenDecision === "send_back" ? "incomplete" : "rejected",
            review_notes: finalReviewNotes,
          }));
          setFinalDecisionModal(null);
          setFinalReviewNotes("");
          setConfirmationModal({
            decision: chosenDecision,
            message:
              chosenDecision === "send_back"
                ? `The onboarding application for "${displayName}" has been sent back to the user as incomplete for corrections.`
                : `The onboarding application for "${displayName}" has been marked as rejected.`,
          });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  const displayName =
    investor?.type === "institutional"
      ? investor.legal_entity_name || "Institutional Entity"
      : investor?.full_name || `Investor #${investor?.id}`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/auditor-portal/investor-onboarding"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-800 hover:text-emerald-950 bg-white border border-gray-200/80 px-3.5 py-2 rounded-2xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Investor Queue</span>
        </Link>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/10 border border-emerald-800/20 text-[#064e3b] text-xs font-extrabold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" /> Investor ID #{investor?.id}
        </span>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              {investor?.type === "institutional" ? (
                <Building2 className="w-3 h-3 text-purple-600" />
              ) : (
                <User className="w-3 h-3 text-emerald-600" />
              )}
              <span>{investor?.type || "Individual"} Investor</span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${
                investor?.onboarding_status === "completed"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : investor?.onboarding_status === "rejected"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : investor?.onboarding_status === "draft"
                  ? "bg-gray-100 text-gray-700 border-gray-300"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="capitalize">{investor?.onboarding_status || "Pending Review"}</span>
            </span>

            {isClassConfirmed ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase">
                Class {investor?.investor_class} (Approved)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase">
                Class Pending Approval
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#064e3b]">
            {displayName}
          </h1>

          {investor?.review_notes && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-0.5">
              <span className="font-extrabold block">Current Review Notes:</span>
              <p>{investor.review_notes}</p>
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* SECTION 1: INVESTOR PROFILE INFORMATION */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-3">
          <User className="w-5 h-5 text-emerald-600" /> Onboarding Profile Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Investor Type</span>
            <span className="font-bold text-gray-800 text-sm capitalize">{investor?.type || "Individual"}</span>
          </div>

          {investor?.type === "institutional" ? (
            <>
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Legal Entity Name</span>
                <span className="font-bold text-gray-800 text-sm">{investor?.legal_entity_name || "N/A"}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Decrypted Trade License Number</span>
                <span className="font-bold font-mono text-emerald-900 text-sm flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  {investor?.trade_license_number || "Decryption Pending / N/A"}
                </span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Business Type</span>
                <span className="font-bold text-gray-800 text-sm">{investor?.business_type || "N/A"}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">License Authority</span>
                <span className="font-bold text-gray-800 text-sm">{investor?.license_authority || "N/A"}</span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Full Legal Name</span>
                <span className="font-bold text-gray-800 text-sm">{investor?.full_name || "N/A"}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Decrypted National ID / Passport</span>
                <span className="font-bold font-mono text-emerald-900 text-sm flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  {investor?.id_number || "Decryption Pending / N/A"}
                </span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Nationality</span>
                <span className="font-bold text-gray-800 text-sm">{investor?.nationality || "N/A"}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Date of Birth</span>
                <span className="font-bold text-gray-800 text-sm">{investor?.DOB || "N/A"}</span>
              </div>
            </>
          )}

          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Email Address</span>
            <span className="font-bold text-gray-800 text-sm">{investor?.email || "N/A"}</span>
          </div>
          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Phone Number</span>
            <span className="font-bold text-gray-800 text-sm">{investor?.phone || "N/A"}</span>
          </div>
          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Country & City</span>
            <span className="font-bold text-gray-800 text-sm">
              {investor?.country || "N/A"} {investor?.city ? `(${investor.city})` : ""}
            </span>
          </div>
          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Net Worth</span>
            <span className="font-bold text-emerald-800 text-sm">
              {investor?.net_worth ? `$${Number(investor.net_worth).toLocaleString()}` : "N/A"}
            </span>
          </div>
          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Annual Income</span>
            <span className="font-bold text-emerald-800 text-sm">
              {investor?.annual_income ? `$${Number(investor.annual_income).toLocaleString()}` : "N/A"}
            </span>
          </div>
          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Investment Experience</span>
            <span className="font-bold text-gray-800 text-sm">
              {investor?.investment_experience_years !== null ? `${investor.investment_experience_years} Years` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: INVESTOR CLASS ASSIGNMENT & AI SUGGESTION */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> Investor Class Level Assignment
          </h2>

          <div className="flex items-center gap-2">
            {isClassConfirmed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Auditor Approved (Class {investor?.investor_class || selectedClass})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Class Pending Auditor Confirmation
              </span>
            )}
          </div>
        </div>

        {/* AI Class Suggestion Card */}
        {classAiReview ? (
          <div className="bg-[#041d16] text-[#fdfbf7] p-5 rounded-2xl border border-[#059669]/30 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-400" /> AI Class Level Recommendation
              </div>
              {classAiReview.confidence_score !== null && classAiReview.confidence_score !== undefined && (
                <span className="text-[11px] font-black text-emerald-300 bg-emerald-900/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Confidence: {Math.round(classAiReview.confidence_score * 100)}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-emerald-400/70 font-semibold block mb-0.5">Suggested Investor Class</span>
                <span className="text-base font-extrabold text-white">
                  Class {classAiReview.suggested_class || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-emerald-400/70 font-semibold block mb-0.5">AI Flagged Concerns</span>
                {classAiReview.flags && classAiReview.flags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {classAiReview.flags.map((flag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-600/50 text-amber-200 text-[10px] font-semibold"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-emerald-300 font-semibold text-[11px]">Nothing flagged</span>
                )}
              </div>
            </div>

            {classAiReview.reasoning_summary && (
              <div>
                <span className="text-emerald-400/70 font-semibold block mb-0.5">AI Reasoning Summary</span>
                <p className="text-emerald-100/80 text-[11px] leading-relaxed bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/40">
                  {classAiReview.reasoning_summary}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic bg-gray-50 p-4 rounded-2xl">
            No automated AI class suggestion found. Please review the profile and manually select the appropriate class level below.
          </p>
        )}

        {/* Auditor Class Selector & Confirm Button */}
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 block">
              Assign Platform Investor Class (Level 1–10) <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-gray-500">
              Governs project pledge ceilings, marketplace visibility, fee rates, and Sukuk conversion rights according to platform rules.
            </p>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(Number(e.target.value))}
              className="w-full text-xs font-bold bg-white border border-gray-300 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value={1}>Class 1 — Unlimited Max Pledge (0.5% Fee, Full Conversion Access)</option>
              <option value={2}>Class 2 — AED 5,000,000 Max Pledge (0.6% Fee, AED 1M Conversion Cap)</option>
              <option value={3}>Class 3 — AED 2,000,000 Max Pledge (0.7% Fee, AED 500k Conversion Cap)</option>
              <option value={4}>Class 4 — AED 1,000,000 Max Pledge (0.8% Fee, AED 250k Conversion Cap)</option>
              <option value={5}>Class 5 — AED 500,000 Max Pledge (0.9% Fee, Cash-only Sukuk)</option>
              <option value={6}>Class 6 — AED 200,000 Max Pledge (1.0% Fee, Cash-only Sukuk)</option>
              <option value={7}>Class 7 — AED 50,000 Max Pledge (1.2% Fee, Cash-only Sukuk)</option>
              <option value={8}>Class 8 — AED 10,000 Max Pledge (1.5% Fee, Cash-only Sukuk)</option>
              <option value={9}>Class 9 — AED 2,000 Max Pledge (2.0% Fee, Retail awareness)</option>
              <option value={10}>Class 10 — AED 500 Max Pledge (2.5% Fee, General public default)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
            <div className="text-xs text-gray-600">
              Selected Level: <strong className="text-emerald-900 font-extrabold">Class {selectedClass}</strong>
            </div>

            <button
              type="button"
              disabled={isPending || activeAction !== null}
              onClick={handleConfirmClass}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 ${
                isClassConfirmed
                  ? "bg-emerald-800 hover:bg-emerald-900 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {activeAction === "confirm_class" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {activeAction === "confirm_class"
                  ? "Saving Class..."
                  : isClassConfirmed
                  ? "Update & Re-confirm Class"
                  : "Confirm & Approve Investor Class"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: ATTACHED DOCUMENTS & AI REVIEW RESULTS */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> Uploaded KYC/KYB Verification Documents
          </h2>
          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {documents.length} Document{documents.length !== 1 ? "s" : ""}
          </span>
        </div>

        {documents.length === 0 ? (
          <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-2xl">
            No verification documents uploaded yet.
          </p>
        ) : (
          <div className="space-y-6">
            {documents.map((doc) => {
              const ai = doc.aiReview;
              const isPendingDoc = doc.status === "pending";

              return (
                <div
                  key={doc.id}
                  className="bg-gray-50/80 rounded-2xl border border-gray-200/80 p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900 capitalize">
                          {doc.doc_type?.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            doc.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : doc.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          Status: {doc.status}
                        </span>
                      </div>

                      {doc.rejection_reason && (
                        <p className="text-xs text-red-600 font-semibold">
                          Rejection Reason: {doc.rejection_reason}
                        </p>
                      )}
                    </div>

                    {doc.signedUrl ? (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/10 hover:bg-emerald-950/20 text-[#064e3b] text-xs font-bold transition-colors shrink-0 self-start sm:self-auto"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-xs">File link unavailable</span>
                    )}
                  </div>

                  {/* AI REVIEW ANALYSIS BOX (If present & status is pending) */}
                  {isPendingDoc && ai && (
                    <div className="bg-[#041d16] text-[#fdfbf7] p-4 rounded-2xl border border-[#059669]/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2">
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                          <Sparkles className="w-4 h-4 text-emerald-400" /> AI Document Inspection
                        </div>
                        {ai.confidence_score !== null && ai.confidence_score !== undefined && (
                          <span className="text-[11px] font-black text-emerald-300 bg-emerald-900/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                            Confidence: {Math.round(ai.confidence_score * 100)}%
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-emerald-400/70 font-semibold block mb-0.5">Suggested Outcome</span>
                          <span className="font-extrabold uppercase text-white flex items-center gap-1.5">
                            {ai.suggested_outcome === "approved" || ai.suggested_outcome === "approve" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400 inline" />
                            )}
                            {ai.suggested_outcome || "Review Required"}
                          </span>
                        </div>

                        <div>
                          <span className="text-emerald-400/70 font-semibold block mb-0.5">Compliance Flags</span>
                          {ai.flags && ai.flags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {ai.flags.map((flag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-700/50 text-red-200 text-[10px] font-semibold"
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-300 font-semibold text-[11px]">
                              Nothing flagged
                            </span>
                          )}
                        </div>
                      </div>

                      {ai.reasoning_summary && (
                        <div>
                          <span className="text-emerald-400/70 font-semibold block mb-0.5">AI Reasoning Summary</span>
                          <p className="text-emerald-100/80 text-[11px] leading-relaxed bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40">
                            {ai.reasoning_summary}
                          </p>
                        </div>
                      )}

                      {ai.raw_model_output && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setRawOutputDoc(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-400/30 transition-all"
                          >
                            <Code className="w-3.5 h-3.5" />
                            <span>Show Raw Model Output</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Per-Document Approve / Reject Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200/60">
                    <button
                      type="button"
                      disabled={isPending || doc.status === "approved" || activeAction !== null}
                      onClick={() => handleApproveDoc(doc.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      {activeAction === `approve_doc_${doc.id}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {activeAction === `approve_doc_${doc.id}`
                          ? "Approving..."
                          : doc.status === "approved"
                          ? "Approved"
                          : "Approve Document"}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending || doc.status === "rejected" || activeAction !== null}
                      onClick={() => setRejectingDoc(doc)}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{doc.status === "rejected" ? "Rejected" : "Reject Document"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: AUTHORIZED REPRESENTATIVES */}
      {representatives.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" /> Authorized Entity Representatives
            </h2>
            <span className="text-xs font-extrabold text-purple-800 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              {representatives.length} Rep{representatives.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {representatives.map((rep) => (
              <div
                key={rep.id}
                className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-gray-900">
                    {rep.full_name || "Representative"}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-200/80 px-2 py-0.5 rounded-md">
                    {rep.id_type || "ID Doc"}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-mono font-bold">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>ID Number: {rep.id_number || "Decryption Pending / N/A"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {rep.is_authorized_signatory && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold text-[10px] border border-blue-200">
                      Signatory
                    </span>
                  )}
                  {rep.is_director && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-extrabold text-[10px] border border-purple-200">
                      Director
                    </span>
                  )}
                  {rep.is_ubo && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-extrabold text-[10px] border border-amber-200">
                      UBO ({rep.ubo_percentage || 0}%)
                    </span>
                  )}
                  {rep.other_designation && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-800 font-bold text-[10px]">
                      {rep.other_designation}
                    </span>
                  )}
                </div>

                {rep.signedIdUrl ? (
                  <div className="pt-2 border-t border-gray-200/60">
                    <a
                      href={rep.signedIdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/10 hover:bg-purple-950/20 text-purple-900 font-bold text-xs transition-colors"
                    >
                      <span>View Rep ID Document</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <span className="text-gray-400 italic text-[11px] block pt-1">No attached ID document</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: BANK DETAILS REVIEW */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600" /> Settlement Bank Payout Account
          </h2>
          <span
            className={`px-3 py-1 rounded-full border text-xs font-extrabold uppercase ${
              investor?.bank_verification_status === "approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : investor?.bank_verification_status === "rejected"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            Bank Status: {investor?.bank_verification_status || "pending"}
          </span>
        </div>

        {investor?.bank_details ? (
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Bank Name</span>
                <span className="font-bold text-gray-800 text-sm">{investor.bank_details.bank_name || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Account Holder Name</span>
                <span className="font-bold text-gray-800 text-sm">
                  {investor.bank_details.account_name || investor.bank_details.account_holder || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Decrypted IBAN</span>
                <span className="font-bold font-mono text-emerald-900 text-sm flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  {investor.bank_details.iban || "Decryption Pending / N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Account Number</span>
                <span className="font-bold font-mono text-gray-800 text-sm">
                  {investor.bank_details.account_number || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">SWIFT / BIC Code</span>
                <span className="font-bold text-gray-800 text-sm">{investor.bank_details.swift_code || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Currency</span>
                <span className="font-bold text-gray-800 text-sm">{investor.bank_details.currency || "USD"}</span>
              </div>
            </div>

            {investor.bank_verification_status === "pending" && (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200/60">
                <button
                  type="button"
                  disabled={isPending || activeAction !== null}
                  onClick={() => handleBankDecision("approved")}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {activeAction === "bank_approved" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{activeAction === "bank_approved" ? "Approving..." : "Approve Bank Details"}</span>
                </button>

                <button
                  type="button"
                  disabled={isPending || activeAction !== null}
                  onClick={() => handleBankDecision("rejected")}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {activeAction === "bank_rejected" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{activeAction === "bank_rejected" ? "Rejecting..." : "Reject Bank Details"}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-2xl">
            No settlement bank details submitted.
          </p>
        )}
      </div>

      {/* SECTION 5: GATED OVERALL ONBOARDING FINAL DECISION */}
      <div className="bg-[#041d16] text-[#fdfbf7] rounded-3xl border border-[#059669]/30 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-emerald-800/40 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Final Onboarding Application Decision
            </h3>
            <p className="text-xs text-emerald-200/70">
              Conclude auditor verification and update investor account clearance.
            </p>
          </div>
        </div>

        {!isPendingReviewStatus ? (
          <div className="p-5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed">
              <span className="font-extrabold text-sm block text-white">
                Review Decision Closed
              </span>
              <p className="text-emerald-100/80 text-xs">
                This investor's onboarding status is currently{" "}
                <strong className="capitalize text-emerald-300">
                  {investor?.onboarding_status || "Completed"}
                </strong>
                . A decision cannot be provided on this application because it is not currently awaiting compliance review (Pending Review).
              </p>
            </div>
          </div>
        ) : isFinalDecisionDisabled ? (
          <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <span className="font-extrabold block text-amber-300">Final Decision Locked</span>
              <p>
                Before finalizing this application, decisions must be submitted for all pending items:
              </p>
              <ul className="list-disc list-inside text-[11px] text-amber-200/80 pt-1 space-y-0.5">
                {!isClassConfirmed && (
                  <li>Investor Class Level assignment has not been confirmed by auditor</li>
                )}
                {pendingDocsCount > 0 && (
                  <li>{pendingDocsCount} verification document(s) remaining in Pending status</li>
                )}
                {isBankPending && <li>Settlement Bank Details currently in Pending status</li>}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              All documents, bank details, and investor class assignments have been reviewed and approved. Select a final disposition below:
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="button"
                disabled={isPending || activeAction !== null}
                onClick={handleApproveFinalOnboarding}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#041d16] font-extrabold text-xs inline-flex items-center gap-2 shadow-lg transition-all"
              >
                {activeAction === "final_approve" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {activeAction === "final_approve"
                    ? "Processing Activation..."
                    : "Approve Onboarding (Activate Account)"}
                </span>
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setFinalDecisionModal("send_back");
                  setFinalReviewNotes("");
                }}
                className="px-6 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-all"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" />
                <span>Send Back to User (Request Corrections)</span>
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setFinalDecisionModal("reject");
                  setFinalReviewNotes("");
                }}
                className="px-6 py-3 rounded-2xl bg-red-600/80 hover:bg-red-600 border border-red-400/30 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-all"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Application</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: SHOW RAW MODEL OUTPUT */}
      {rawOutputDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#041d16] border border-[#059669]/40 rounded-3xl max-w-3xl w-full p-6 text-white space-y-4 shadow-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/40 pb-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-300">
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Raw Model Inspection Output ({rawOutputDoc.doc_type})</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setRawViewMode("rows")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                    rawViewMode === "rows"
                      ? "bg-emerald-500/30 text-emerald-200 border-emerald-400"
                      : "bg-emerald-950/60 text-emerald-300/60 border-emerald-800/40"
                  }`}
                >
                  Formatted JSON Rows
                </button>
                <button
                  type="button"
                  onClick={() => setRawViewMode("raw")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                    rawViewMode === "raw"
                      ? "bg-emerald-500/30 text-emerald-200 border-emerald-400"
                      : "bg-emerald-950/60 text-emerald-300/60 border-emerald-800/40"
                  }`}
                >
                  Raw String
                </button>
                <button
                  type="button"
                  onClick={() => setRawOutputDoc(null)}
                  className="text-gray-400 hover:text-white transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {(() => {
              const rawData = rawOutputDoc.aiReview?.raw_model_output;
              let parsedObj = null;

              if (rawData) {
                if (typeof rawData === "object" && rawData !== null) {
                  parsedObj = rawData;
                } else if (typeof rawData === "string") {
                  try {
                    parsedObj = JSON.parse(rawData);
                  } catch (e) {}
                }
              }

              if (rawViewMode === "raw" || !parsedObj || typeof parsedObj !== "object") {
                return (
                  <pre className="bg-[#02130e] p-4 rounded-2xl border border-emerald-900/60 font-mono text-[11px] text-emerald-300/90 overflow-x-auto max-h-96 leading-relaxed whitespace-pre-wrap">
                    {typeof rawData === "string"
                      ? rawData
                      : JSON.stringify(rawData, null, 2) || "No raw model output recorded."}
                  </pre>
                );
              }

              const entries = Object.entries(parsedObj);

              return (
                <div className="bg-[#02130e] rounded-2xl border border-emerald-900/60 p-4 max-h-[440px] overflow-y-auto space-y-2 font-mono text-xs shadow-inner">
                  <div className="text-emerald-500 font-bold">{`{`}</div>
                  <div className="pl-4 space-y-2.5">
                    {entries.map(([key, value], idx) => {
                      const isLast = idx === entries.length - 1;
                      return (
                        <div
                          key={key}
                          className="flex flex-col sm:flex-row sm:items-start gap-2 py-2 border-b border-emerald-900/40 last:border-0"
                        >
                          <span className="text-emerald-400 font-bold shrink-0 sm:w-48">
                            "{key}":
                          </span>

                          <div className="flex-1 min-w-0">
                            {typeof value === "boolean" ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  value
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/50"
                                    : "bg-red-950 text-red-300 border border-red-500/50"
                                }`}
                              >
                                {String(value)}
                              </span>
                            ) : typeof value === "number" ? (
                              <span className="text-cyan-300 font-bold">{value}</span>
                            ) : Array.isArray(value) ? (
                              <div className="space-y-1 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/40">
                                <span className="text-emerald-400 font-bold">[</span>
                                <div className="pl-3 space-y-1">
                                  {value.map((item, i) => (
                                    <div key={i} className="text-amber-200 text-[11px] leading-relaxed">
                                      "{String(item)}"{i < value.length - 1 ? "," : ""}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-emerald-400 font-bold">]</span>
                              </div>
                            ) : typeof value === "object" && value !== null ? (
                              <pre className="text-emerald-200/90 text-[11px] whitespace-pre-wrap bg-emerald-950/40 p-2 rounded-xl">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-amber-200 leading-relaxed font-semibold">
                                "{String(value)}"
                              </span>
                            )}
                            {!isLast && <span className="text-emerald-500 font-bold">,</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-emerald-500 font-bold">{`}`}</div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRawOutputDoc(null)}
                className="px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-200 text-xs font-bold border border-emerald-800/50"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT DOCUMENT REASON */}
      {rejectingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-gray-900 space-y-4 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Reject Document ({rejectingDoc.doc_type})
              </h3>
              <button
                type="button"
                onClick={() => setRejectingDoc(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Please enter the explicit reason for rejecting this document. This note will be recorded for audit logs and user notification.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={docRejectionReason}
                onChange={(e) => setDocRejectionReason(e.target.value)}
                placeholder="e.g., Unclear document image, expired document date, or name mismatch..."
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingDoc(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending || activeAction !== null}
                onClick={handleConfirmRejectDoc}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
              >
                {activeAction === `reject_doc_${rejectingDoc?.id}` ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>
                  {activeAction === `reject_doc_${rejectingDoc?.id}`
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FINAL OVERALL REVIEW NOTES (Send Back / Reject) */}
      {finalDecisionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-gray-900 space-y-4 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
                {finalDecisionModal === "send_back" ? (
                  <>
                    <RotateCcw className="w-5 h-5 text-amber-600" /> Send Onboarding Application Back to User
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" /> Reject Onboarding Application
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setFinalDecisionModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              {finalDecisionModal === "send_back"
                ? "Enter specific instructions and feedback for the investor. The onboarding status will return to Draft so they can correct their submission."
                : "Enter auditor notes explaining why this onboarding application is rejected."}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">
                Auditor Review Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={finalReviewNotes}
                onChange={(e) => setFinalReviewNotes(e.target.value)}
                placeholder="Provide detailed feedback for the investor..."
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFinalDecisionModal(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending || activeAction !== null}
                onClick={handleConfirmFinalReviewNotes}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 ${
                  finalDecisionModal === "send_back"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {activeAction === `final_confirm_${finalDecisionModal}` ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : finalDecisionModal === "send_back" ? (
                  <RotateCcw className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>
                  {activeAction === `final_confirm_${finalDecisionModal}`
                    ? "Submitting..."
                    : finalDecisionModal === "send_back"
                    ? "Send Back to User"
                    : "Confirm Rejection"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: NON-CLOSABLE DECISION CONFIRMATION MODAL */}
      {confirmationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 text-center shadow-2xl border border-gray-200 animate-in zoom-in-95">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center">
              {confirmationModal.decision === "approve" && (
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              )}
              {confirmationModal.decision === "send_back" && (
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <RotateCcw className="w-10 h-10" />
                </div>
              )}
              {confirmationModal.decision === "reject" && (
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                  <XCircle className="w-10 h-10" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                  confirmationModal.decision === "approve"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : confirmationModal.decision === "send_back"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {confirmationModal.decision === "approve"
                  ? "Onboarding Approved"
                  : confirmationModal.decision === "send_back"
                  ? "Sent Back for Corrections"
                  : "Application Rejected"}
              </span>
              <h3 className="text-2xl font-black text-[#064e3b] pt-1">
                Decision Submitted!
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {confirmationModal.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  router.push("/auditor-portal/investor-onboarding");
                }}
                className="w-full py-3.5 rounded-2xl bg-[#064e3b] hover:bg-[#047857] text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to Investor Onboarding Review Page</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
