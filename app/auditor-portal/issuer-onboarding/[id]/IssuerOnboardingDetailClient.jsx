"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateIssuerDocumentDecision,
  updateIssuerBankDecision,
  submitIssuerFinalOnboardingDecision,
} from "@/app/actions/auditor";
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
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
  User,
} from "lucide-react";

export default function IssuerOnboardingDetailClient({
  issuer: initialIssuer,
  documents: initialDocuments = [],
  representatives = [],
  error: initialError,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic local state for immediate UI responsiveness
  const [documents, setLocalDocs] = useState(initialDocuments);
  const [issuer, setLocalIssuer] = useState(initialIssuer);

  useEffect(() => {
    setLocalDocs(initialDocuments);
  }, [initialDocuments]);

  useEffect(() => {
    setLocalIssuer(initialIssuer);
  }, [initialIssuer]);

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

  // Gating Validation: Check if status is pending_review, any document is pending, or bank status is pending
  const pendingDocsCount = documents.filter((d) => d.status === "pending").length;
  const isBankPending = issuer?.bank_verification_status === "pending";
  const rawOnboardingStatus = (issuer?.onboarding_status || "").toLowerCase().trim();
  const isPendingReviewStatus =
    rawOnboardingStatus === "pending_review" ||
    rawOnboardingStatus === "pending review" ||
    rawOnboardingStatus === "pending";

  const isFinalDecisionDisabled =
    !isPendingReviewStatus || pendingDocsCount > 0 || isBankPending;

  // Handlers for Document Decisions
  const handleApproveDoc = (docId) => {
    setActionError(null);
    setActionSuccess(null);
    setActiveAction(`approve_doc_${docId}`);
    startTransition(async () => {
      try {
        const res = await updateIssuerDocumentDecision({
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
        const res = await updateIssuerDocumentDecision({
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
        const res = await updateIssuerBankDecision({
          issuerId: issuer.id,
          decision,
        });
        if (!res.success) {
          setActionError(res.error || "Failed to update bank details status.");
        } else {
          setActionSuccess(`Bank details ${decision} successfully.`);
          setLocalIssuer((prev) => ({
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

  // Handlers for Overall Final Decision
  const handleApproveFinalOnboarding = () => {
    setActionError(null);
    setActionSuccess(null);
    setActiveAction("final_approve");
    startTransition(async () => {
      try {
        const res = await submitIssuerFinalOnboardingDecision({
          issuerId: issuer.id,
          decision: "approve",
        });
        if (!res.success) {
          setActionError(res.error || "Failed to approve issuer onboarding.");
        } else {
          setLocalIssuer((prev) => ({ ...prev, onboarding_status: "completed" }));
          setConfirmationModal({
            decision: "approve",
            message: `The corporate issuer onboarding application for "${displayName}" has been approved successfully.`,
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
        const res = await submitIssuerFinalOnboardingDecision({
          issuerId: issuer.id,
          decision: chosenDecision,
          reviewNotes: finalReviewNotes,
        });
        if (!res.success) {
          setActionError(res.error || "Failed to process onboarding decision.");
        } else {
          setLocalIssuer((prev) => ({
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

  const displayName = issuer?.legal_entity_name || `Issuer #${issuer?.id}`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/auditor-portal/issuer-onboarding"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-800 hover:text-emerald-950 bg-white border border-gray-200/80 px-3.5 py-2 rounded-2xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Issuer Queue</span>
        </Link>
      </div>

      {/* Review Closed Notice Banner */}
      {!isPendingReviewStatus && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 sm:p-6 text-amber-900 flex items-start gap-4 shadow-xs">
          <div className="p-2.5 bg-amber-500/20 rounded-2xl shrink-0">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-amber-900">Review Decision Closed</h3>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              This issuer onboarding application is currently in status{" "}
              <strong className="capitalize font-black text-amber-950">"{issuer?.onboarding_status}"</strong>. A decision cannot be updated or resubmitted unless the application is submitted for auditor review.
            </p>
          </div>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>Corporate Issuer</span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${
                issuer?.onboarding_status === "completed"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : issuer?.onboarding_status === "rejected"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : issuer?.onboarding_status === "incomplete"
                  ? "bg-gray-100 text-gray-700 border-gray-300"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="capitalize">{issuer?.onboarding_status || "Pending Review"}</span>
            </span>

            {issuer?.license_authority && (
              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-extrabold uppercase">
                {issuer.license_authority}
              </span>
            )}
          </div>

          <span className="text-xs font-extrabold text-gray-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Issuer ID #{issuer?.id}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#064e3b]">
            {displayName}
          </h1>

          {issuer?.review_notes && (
            <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-0.5">
              <span className="font-extrabold block">Current Auditor Review Notes:</span>
              <p>{issuer.review_notes}</p>
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* SECTION 1: CORPORATE PROFILE & REGISTRATION DETAILS */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" /> Company Registration Profile
          </h2>
          <span className="text-xs text-gray-400 font-bold">Step {issuer?.current_step || 5} of 5 Completed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Legal Entity Name</span>
            <span className="font-extrabold text-gray-800 text-sm">{issuer?.legal_entity_name || "N/A"}</span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Decrypted Trade License Number</span>
            <span className="font-bold font-mono text-purple-900 text-sm flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              {issuer?.trade_license_number || "Decryption Pending / N/A"}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Licensing Authority</span>
            <span className="font-bold text-gray-800 text-sm">{issuer?.license_authority || "N/A"}</span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">License Expiry Date</span>
            <span className="font-bold text-gray-800 text-sm">
              {issuer?.license_expiry_date
                ? new Date(issuer.license_expiry_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Business Type</span>
            <span className="font-bold text-gray-800 text-sm">{issuer?.business_type || "N/A"}</span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Country & City</span>
            <span className="font-bold text-gray-800 text-sm">
              {issuer?.country || "N/A"} {issuer?.city ? `(${issuer.city})` : ""}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Business Email</span>
            <span className="font-bold text-gray-800 text-sm">{issuer?.business_email || "N/A"}</span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Business Phone</span>
            <span className="font-bold text-gray-800 text-sm">{issuer?.business_phone_number || "N/A"}</span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl">
            <span className="text-gray-400 font-semibold block mb-0.5">Organization ID</span>
            <span className="font-mono text-gray-700 text-xs font-semibold">{issuer?.org_id || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: AUTHORIZED REPRESENTATIVES */}
      {representatives.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" /> Authorized Representatives ({representatives.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {representatives.map((rep) => (
              <div key={rep.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-gray-800 text-sm">{rep.full_name || `Rep #${rep.id}`}</h3>
                  {rep.title && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {rep.title}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">ID Number</span>
                    <span className="font-bold font-mono text-gray-800">{rep.id_number || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">ID Type</span>
                    <span className="font-bold text-gray-800 capitalize">{rep.id_type || "National ID"}</span>
                  </div>
                </div>

                {rep.signedIdUrl && (
                  <a
                    href={rep.signedIdUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors pt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Representative ID Document</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: KYB VERIFICATION DOCUMENTS & AI INSPECTION */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" /> Verification Documents & AI Reviews
          </h2>
          <span className="text-xs font-bold text-purple-800 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            {documents.length} Document{documents.length !== 1 ? "s" : ""}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl">
            No corporate verification documents uploaded yet.
          </div>
        ) : (
          <div className="space-y-6 divide-y divide-gray-100">
            {documents.map((doc) => {
              const ai = doc.aiReview;
              const isPendingDoc = doc.status === "pending";

              return (
                <div key={doc.id} className="pt-6 first:pt-0 space-y-4">
                  {/* Doc Header & Action Controls */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900 capitalize">
                          {(doc.doc_type || "document").replace(/_/g, " ")}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            doc.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : doc.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          Status: {doc.status || "Pending"}
                        </span>
                      </div>

                      {doc.rejection_reason && (
                        <p className="text-xs text-red-600 font-medium">
                          Rejection Reason: {doc.rejection_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {doc.signedUrl ? (
                        <a
                          href={doc.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-700 hover:text-gray-900 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Document</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No File Link</span>
                      )}

                      {/* Document Approve / Reject Buttons */}
                      <button
                        type="button"
                        disabled={!isPendingReviewStatus || isPending || activeAction !== null}
                        onClick={() => handleApproveDoc(doc.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 ${
                          doc.status === "approved"
                            ? "bg-emerald-800 text-white"
                            : "bg-emerald-700 hover:bg-emerald-800 text-white"
                        }`}
                      >
                        {activeAction === `approve_doc_${doc.id}` ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{doc.status === "approved" ? "Approved" : "Approve"}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={!isPendingReviewStatus || isPending || activeAction !== null}
                        onClick={() => setRejectingDoc(doc)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 ${
                          doc.status === "rejected"
                            ? "bg-red-800 text-white"
                            : "bg-red-700 hover:bg-red-800 text-white"
                        }`}
                      >
                        {activeAction === `reject_doc_${doc.id}` ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Rejecting...</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{doc.status === "rejected" ? "Rejected" : "Reject"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AI REVIEW CARD FOR THIS DOCUMENT (Shown ONLY when status is pending) */}
                  {isPendingDoc && ai && (
                    <div className="bg-[#041d16] text-[#fdfbf7] p-5 rounded-2xl border border-[#059669]/30 space-y-3 shadow-md">
                      <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2">
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                          <Bot className="w-4 h-4 text-emerald-400" /> AI Document Verification Analysis
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              ai.suggested_outcome === "approved"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                : "bg-red-950 text-red-300 border-red-500/40"
                            }`}
                          >
                            AI Suggestion: {ai.suggested_outcome || "Reviewed"}
                          </span>

                          {ai.confidence_score !== null && ai.confidence_score !== undefined && (
                            <span className="text-[11px] font-black text-emerald-300 bg-emerald-900/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              {Math.round(ai.confidence_score * 100)}% Confidence
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        {ai.flags && ai.flags.length > 0 && (
                          <div>
                            <span className="text-emerald-400/70 font-semibold block mb-1">Flagged Concerns:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {ai.flags.map((flag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-200 text-[11px] font-semibold"
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {ai.reasoning_summary && (
                          <div>
                            <span className="text-emerald-400/70 font-semibold block mb-0.5">AI Reasoning Summary:</span>
                            <p className="text-emerald-100/90 text-xs leading-relaxed bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/40">
                              {ai.reasoning_summary}
                            </p>
                          </div>
                        )}
                      </div>

                      {ai.raw_model_output && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRawOutputDoc(doc);
                              setRawViewMode("rows");
                            }}
                            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 underline decoration-emerald-500/40"
                          >
                            <Code className="w-3.5 h-3.5" />
                            <span>View Raw AI Verification Data</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4: BANK ACCOUNT VERIFICATION */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
            <Landmark className="w-5 h-5 text-purple-600" /> Corporate Banking Credentials
          </h2>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                issuer?.bank_verification_status === "approved"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : issuer?.bank_verification_status === "rejected"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              Bank Status: {issuer?.bank_verification_status || "pending"}
            </span>
          </div>
        </div>

        {issuer?.bank_details ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Bank Name</span>
                <span className="font-bold text-gray-800 text-sm">{issuer.bank_details.bank_name || "N/A"}</span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Account Holder Name</span>
                <span className="font-bold text-gray-800 text-sm">
                  {issuer.bank_details.account_name || issuer.bank_details.account_holder || "N/A"}
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Decrypted IBAN</span>
                <span className="font-bold font-mono text-purple-900 text-sm flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-600" />
                  {issuer.bank_details.iban || "Decryption Pending / N/A"}
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Account Number</span>
                <span className="font-bold font-mono text-gray-800 text-sm">
                  {issuer.bank_details.account_number || "N/A"}
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">SWIFT / BIC Code</span>
                <span className="font-bold text-gray-800 text-sm">{issuer.bank_details.swift_code || "N/A"}</span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="text-gray-400 font-semibold block mb-0.5">Currency & Address</span>
                <span className="font-bold text-gray-800 text-sm">
                  {issuer.bank_details.currency || "AED"}{" "}
                  {issuer.bank_details.bank_address ? `(${issuer.bank_details.bank_address})` : ""}
                </span>
              </div>
            </div>

            {/* Bank Approve / Reject Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={!isPendingReviewStatus || isPending || activeAction !== null}
                onClick={() => handleBankDecision("approved")}
                className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 ${
                  issuer?.bank_verification_status === "approved"
                    ? "bg-emerald-800 text-white"
                    : "bg-emerald-700 hover:bg-emerald-800 text-white"
                }`}
              >
                {activeAction === "bank_approved" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving Bank Details...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {issuer?.bank_verification_status === "approved"
                        ? "Bank Details Approved"
                        : "Approve Bank Details"}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={!isPendingReviewStatus || isPending || activeAction !== null}
                onClick={() => handleBankDecision("rejected")}
                className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 ${
                  issuer?.bank_verification_status === "rejected"
                    ? "bg-red-800 text-white"
                    : "bg-red-700 hover:bg-red-800 text-white"
                }`}
              >
                {activeAction === "bank_rejected" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting Bank Details...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>
                      {issuer?.bank_verification_status === "rejected"
                        ? "Bank Details Rejected"
                        : "Reject Bank Details"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic bg-gray-50 p-4 rounded-2xl">
            No bank details submitted for this corporate issuer application.
          </p>
        )}
      </div>

      {/* SECTION 5: FINAL AUDITOR DISPOSITION & SUBMISSION */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
            <Send className="w-5 h-5 text-purple-600" /> Final Auditor Onboarding Decision
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Complete document reviews and bank credentials verification before finalizing the issuer onboarding application.
          </p>
        </div>

        {isFinalDecisionDisabled && isPendingReviewStatus && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> Requirements Pending Before Final Action:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              {pendingDocsCount > 0 && (
                <li>{pendingDocsCount} document{pendingDocsCount !== 1 ? "s" : ""} require an explicit Approve or Reject decision.</li>
              )}
              {isBankPending && (
                <li>Bank details verification status is pending auditor decision.</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {/* Send Back to User */}
          <button
            type="button"
            disabled={isFinalDecisionDisabled || isPending || activeAction !== null}
            onClick={() => {
              setActionError(null);
              setFinalDecisionModal("send_back");
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Send Back to User for Revision</span>
          </button>

          {/* Reject Application */}
          <button
            type="button"
            disabled={isFinalDecisionDisabled || isPending || activeAction !== null}
            onClick={() => {
              setActionError(null);
              setFinalDecisionModal("reject");
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-40"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject Onboarding Application</span>
          </button>

          {/* Approve Onboarding Application */}
          <button
            type="button"
            disabled={isFinalDecisionDisabled || isPending || activeAction !== null}
            onClick={handleApproveFinalOnboarding}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-40"
          >
            {activeAction === "final_approve" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Approving Issuer Onboarding...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Issuer Onboarding</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL: DOCUMENT REJECTION REASON */}
      {rejectingDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-red-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" /> Reject Document Verification
              </h3>
              <button
                type="button"
                onClick={() => setRejectingDoc(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              You are rejecting the document{" "}
              <strong className="capitalize text-gray-800">
                "{(rejectingDoc.doc_type || "").replace(/_/g, " ")}"
              </strong>
              . Please enter the compliance rejection reason for the issuer.
            </p>

            <textarea
              rows={4}
              value={docRejectionReason}
              onChange={(e) => setDocRejectionReason(e.target.value)}
              placeholder="e.g. Uploaded trade license is expired or company name does not match legal entity records..."
              className="w-full text-xs p-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/40 text-gray-800"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingDoc(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={activeAction === `reject_doc_${rejectingDoc.id}`}
                onClick={handleConfirmRejectDoc}
                className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
              >
                {activeAction === `reject_doc_${rejectingDoc.id}` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>Confirm Document Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FINAL DISPOSITION REVIEW NOTES (SEND BACK / REJECT) */}
      {finalDecisionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3
                className={`text-base font-extrabold flex items-center gap-2 ${
                  finalDecisionModal === "send_back" ? "text-amber-900" : "text-red-900"
                }`}
              >
                {finalDecisionModal === "send_back" ? (
                  <>
                    <RotateCcw className="w-5 h-5 text-amber-600" /> Send Application Back to User
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" /> Reject Issuer Onboarding
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setFinalDecisionModal(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {finalDecisionModal === "send_back"
                ? `Please detail the changes, missing documents, or corrections required from "${displayName}". Their onboarding status will be updated to incomplete.`
                : `Please provide the formal audit justification for rejecting the onboarding application for "${displayName}".`}
            </p>

            <textarea
              rows={4}
              value={finalReviewNotes}
              onChange={(e) => setFinalReviewNotes(e.target.value)}
              placeholder={
                finalDecisionModal === "send_back"
                  ? "e.g. Please re-upload your valid corporate trade license with clear entity details..."
                  : "e.g. Corporate entity fails compliance background checks due to invalid trade license..."
              }
              className="w-full text-xs p-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-gray-800"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFinalDecisionModal(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={activeAction === `final_confirm_${finalDecisionModal}`}
                onClick={handleConfirmFinalReviewNotes}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors ${
                  finalDecisionModal === "send_back"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-red-700 hover:bg-red-800"
                }`}
              >
                {activeAction === `final_confirm_${finalDecisionModal}` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : finalDecisionModal === "send_back" ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>
                  {finalDecisionModal === "send_back"
                    ? "Confirm & Send Back to User"
                    : "Confirm & Reject Application"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NON-CLOSABLE CONFIRMATION MODAL */}
      {confirmationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 text-center">
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600">
              {confirmationModal.decision === "approve" ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              ) : confirmationModal.decision === "send_back" ? (
                <RotateCcw className="w-8 h-8 text-amber-600" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-[#064e3b]">
                {confirmationModal.decision === "approve"
                  ? "Issuer Onboarding Approved"
                  : confirmationModal.decision === "send_back"
                  ? "Application Sent Back"
                  : "Onboarding Rejected"}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {confirmationModal.message}
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/auditor-portal/issuer-onboarding"
                className="w-full py-3 px-6 rounded-2xl bg-[#041d16] hover:bg-[#062c22] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <span>Go to Issuer Onboarding Review Page</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RAW AI MODEL OUTPUT */}
      {rawOutputDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#041d16] text-[#fdfbf7] rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-emerald-500/30 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-white">
                  Raw AI Review Output —{" "}
                  <span className="capitalize text-emerald-300">
                    {(rawOutputDoc.doc_type || "").replace(/_/g, " ")}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-emerald-950 rounded-xl p-1 border border-emerald-800/60">
                  <button
                    type="button"
                    onClick={() => setRawViewMode("rows")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      rawViewMode === "rows"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-emerald-400 hover:text-emerald-200"
                    }`}
                  >
                    Structured View
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawViewMode("raw")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      rawViewMode === "raw"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-emerald-400 hover:text-emerald-200"
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setRawOutputDoc(null)}
                  className="p-1 rounded-full text-emerald-400 hover:text-emerald-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
              {rawViewMode === "rows" ? (
                <div className="space-y-3">
                  {Object.entries(
                    typeof rawOutputDoc.aiReview?.raw_model_output === "string"
                      ? (() => {
                          try {
                            return JSON.parse(rawOutputDoc.aiReview.raw_model_output);
                          } catch (e) {
                            return { raw_output: rawOutputDoc.aiReview.raw_model_output };
                          }
                        })()
                      : rawOutputDoc.aiReview?.raw_model_output || {}
                  ).map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-800/40 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                    >
                      <span className="font-mono text-emerald-400 font-bold uppercase text-[11px] shrink-0">
                        {key.replace(/_/g, " ")}:
                      </span>
                      <span className="font-mono text-emerald-100 text-right break-all">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="bg-emerald-950/90 p-4 rounded-2xl font-mono text-emerald-300 text-xs overflow-x-auto whitespace-pre-wrap border border-emerald-800/60">
                  {typeof rawOutputDoc.aiReview?.raw_model_output === "string"
                    ? (() => {
                        try {
                          return JSON.stringify(
                            JSON.parse(rawOutputDoc.aiReview.raw_model_output),
                            null,
                            2
                          );
                        } catch (e) {
                          return rawOutputDoc.aiReview.raw_model_output;
                        }
                      })()
                    : JSON.stringify(rawOutputDoc.aiReview?.raw_model_output, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
