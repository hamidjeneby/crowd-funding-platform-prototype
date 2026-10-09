"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitAuditorDecision } from "@/app/actions/auditor";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
  FileText,
  Lock,
  ExternalLink,
  AlertTriangle,
  User,
  Building2,
  Briefcase,
  Target,
  Bot,
  Calendar,
  DollarSign,
  Check,
  Zap,
  Loader2,
} from "lucide-react";

export default function AuditorCaseDetailClient({
  type,
  id,
  entity,
  aiReview,
  documents = [],
  media = [],
  projectTimeline = [],
  error: initialError,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [decision, setDecision] = useState(
    aiReview?.suggested_outcome === "approved" || aiReview?.suggested_outcome === "approve"
      ? "approve"
      : "reject"
  );
  const [investorClass, setInvestorClass] = useState(
    entity?.investor_class || aiReview?.suggested_class || "retail"
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState(initialError || null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState(null);

  const isAiDecided = entity?.reviewed_by === 0 || entity?.status === "ai_decided";
  const isAlreadyResolved =
    entity?.status === "approved" ||
    entity?.status === "rejected" ||
    isAiDecided;

  const handleAcceptAiSuggestion = () => {
    if (aiReview?.suggested_outcome) {
      const outcome =
        aiReview.suggested_outcome.toLowerCase() === "approved" ||
        aiReview.suggested_outcome.toLowerCase() === "approve"
          ? "approve"
          : "reject";
      setDecision(outcome);
    }
    if (aiReview?.suggested_class) {
      setInvestorClass(aiReview.suggested_class.toLowerCase());
    }
  };

  const handleSubmitDecision = (chosenDecision) => {
    setActionError(null);
    setActionSuccess(null);

    if (chosenDecision === "reject" && !rejectionReason.trim()) {
      setActionError("Please provide a rejection reason before rejecting.");
      return;
    }

    setActiveAction(chosenDecision);

    startTransition(async () => {
      try {
        const result = await submitAuditorDecision({
          entityType: type,
          entityId: id,
          decision: chosenDecision,
          investorClass: type === "investor" ? investorClass : null,
          rejectionReason: chosenDecision === "reject" ? rejectionReason : null,
        });

        if (!result.success) {
          setActionError(result.error || "Failed to submit decision");
        } else {
          setConfirmationModal({
            decision: chosenDecision,
            message: `The ${type} decision (${chosenDecision}) has been submitted successfully.`,
          });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  const confidenceScorePercent = aiReview?.confidence_score
    ? Math.round(aiReview.confidence_score * 100)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/auditor-portal"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-800 hover:text-emerald-950 bg-white border border-gray-200/80 px-3.5 py-2 rounded-2xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Review Queue</span>
        </Link>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/10 border border-emerald-800/20 text-[#064e3b] text-xs font-extrabold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" /> Case #{id} &bull; {type}
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
              {type} verification
            </span>

            {isAiDecided ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                <Bot className="w-3.5 h-3.5 text-indigo-600" /> Auto-Approved (AI)
              </span>
            ) : entity?.status === "approved" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
              </span>
            ) : entity?.status === "rejected" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                <XCircle className="w-3.5 h-3.5 text-red-600" /> Rejected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Pending Review
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#064e3b]">
            {type === "investor" && `${entity?.first_name || ""} ${entity?.last_name || ""}`.trim()}
            {type === "issuer" && entity?.company_name}
            {type === "project" && entity?.title}
            {type === "milestone" && entity?.title}
          </h1>

          <p className="text-xs text-gray-500 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Submitted on {new Date(entity?.created_at || Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          </p>
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

      {/* Main Grid: Left Entity Details & Right AI/Decision Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Case Details & Documents (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Investor Specific View */}
          {type === "investor" && (
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
              <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-3">
                <User className="w-5 h-5 text-emerald-600" /> Investor Profile Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Full Legal Name</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {entity?.first_name} {entity?.last_name}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Email Address</span>
                  <span className="font-bold text-gray-800 text-sm">{entity?.email || "N/A"}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Country of Residence</span>
                  <span className="font-bold text-gray-800 text-sm">{entity?.country || "N/A"}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Phone Number</span>
                  <span className="font-bold text-gray-800 text-sm">{entity?.phone || "N/A"}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-gray-400 font-semibold block mb-0.5">Decrypted National ID / Passport Number</span>
                  <span className="font-bold font-mono text-emerald-900 text-sm flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    {entity?.id_number || "Decryption pending / Not provided"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Issuer Specific View */}
          {type === "issuer" && (
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
              <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-3">
                <Building2 className="w-5 h-5 text-purple-600" /> Issuer Corporate Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Company Name</span>
                  <span className="font-bold text-gray-800 text-sm">{entity?.company_name}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Legal Structure</span>
                  <span className="font-bold text-gray-800 text-sm">{entity?.legal_structure || "N/A"}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Decrypted Trade License Number</span>
                  <span className="font-bold font-mono text-emerald-900 text-sm flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    {entity?.trade_license_number || "Decryption pending / N/A"}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Tax Identification Number</span>
                  <span className="font-bold text-gray-800 text-sm">{entity?.tax_id || "N/A"}</span>
                </div>
              </div>

              {/* Decrypted Bank Details */}
              {entity?.bank_details && (
                <div className="bg-emerald-950/5 border border-emerald-900/10 rounded-2xl p-4 space-y-2">
                  <h3 className="text-xs font-bold text-[#064e3b] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" /> Decrypted Bank Account Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block">Bank Name</span>
                      <span className="font-semibold text-gray-800">{entity.bank_details.bank_name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Account Holder</span>
                      <span className="font-semibold text-gray-800">{entity.bank_details.account_holder || "N/A"}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block">IBAN</span>
                      <span className="font-mono font-bold text-emerald-900">{entity.bank_details.iban || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Project Specific View */}
          {type === "project" && (
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
              <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-3">
                <Briefcase className="w-5 h-5 text-emerald-600" /> Project Listing Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Funding Target Goal</span>
                  <span className="font-bold text-emerald-800 text-base flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    {entity?.funding_goal ? Number(entity.funding_goal).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Minimum Investment</span>
                  <span className="font-bold text-gray-800 text-base">
                    ${entity?.minimum_investment ? Number(entity.minimum_investment).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Category</span>
                  <span className="font-bold text-gray-800 text-sm capitalize">{entity?.category || "General"}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl">
                  <span className="text-gray-400 font-semibold block mb-0.5">Minimum Investor Class Required</span>
                  <span className="font-extrabold text-blue-700 text-sm uppercase">{entity?.min_investor_class || "Retail"}</span>
                </div>
              </div>

              {entity?.pitch_summary && (
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-gray-700">Pitch Summary</h3>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl">
                    {entity.pitch_summary}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Milestone Specific View */}
          {type === "milestone" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
                <h2 className="text-lg font-bold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Target className="w-5 h-5 text-emerald-700" /> Milestone Submission & Proof
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-gray-50 p-3.5 rounded-2xl">
                    <span className="text-gray-400 font-semibold block mb-0.5">Release Amount / Share</span>
                    <span className="font-bold text-emerald-800 text-base">
                      {entity?.amount ? `$${Number(entity.amount).toLocaleString()}` : `${entity?.release_percentage || 0}% of Total Pool`}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-2xl">
                    <span className="text-gray-400 font-semibold block mb-0.5">Sequence Position</span>
                    <span className="font-bold text-gray-800 text-sm">
                      Milestone #{entity?.sequence_order || 1}
                    </span>
                  </div>
                </div>

                {entity?.description && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-gray-700">Milestone Deliverable Description</h3>
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl">
                      {entity.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Project Timeline Context */}
              {projectTimeline.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-[#064e3b]">Project Timeline Context</h3>
                  <div className="space-y-2">
                    {projectTimeline.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                          item.id === entity?.id
                            ? "bg-emerald-50/80 border-emerald-300 font-bold"
                            : "bg-gray-50 border-gray-200/60 opacity-80"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-900/10 text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                            {idx + 1}
                          </span>
                          <span className="text-gray-800">{item.title}</span>
                        </div>
                        <span className="capitalize text-[10px] font-semibold text-gray-500">
                          {item.status || "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Documents & Media List */}
          {(documents.length > 0 || media.length > 0) && (
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="w-5 h-5 text-emerald-600" /> Uploaded Documents & Media
              </h2>

              <div className="space-y-3">
                {documents.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-gray-800 capitalize flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{doc.document_type || doc.name || `Document #${idx + 1}`}</span>
                      </div>
                      {doc.verification_notes && (
                        <p className="text-[11px] text-gray-500 leading-tight">
                          {doc.verification_notes}
                        </p>
                      )}
                    </div>

                    {doc.signedUrl ? (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/10 hover:bg-emerald-950/20 text-[#064e3b] text-xs font-bold shrink-0 self-start sm:self-auto transition-colors"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-[11px]">Url unavailable</span>
                    )}
                  </div>
                ))}

                {media.map((med, idx) => (
                  <div
                    key={med.id || idx}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-gray-800 capitalize flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Media Asset: {med.media_type || med.file_name || `Media #${idx + 1}`}</span>
                      </div>
                    </div>

                    {med.signedUrl ? (
                      <a
                        href={med.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/10 hover:bg-blue-950/20 text-blue-900 text-xs font-bold shrink-0 self-start sm:self-auto transition-colors"
                      >
                        <span>View Media</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-[11px]">Url unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Insights & Decision Panel (1 col) */}
        <div className="space-y-6">
          {/* AI Insights Suggestion Panel */}
          <div className="bg-[#041d16] text-[#fdfbf7] rounded-3xl border border-[#059669]/30 p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-emerald-800/40 pb-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-400" /> AI Engine Analysis
              </div>
              {confidenceScorePercent !== null && (
                <span className="text-xs font-black text-emerald-300 bg-emerald-900/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {confidenceScorePercent}% Confidence
                </span>
              )}
            </div>

            {aiReview ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-emerald-400/70 font-semibold block mb-1">Suggested Decision</span>
                  <span className="text-base font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    {aiReview.suggested_outcome === "approved" || aiReview.suggested_outcome === "approve" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    {aiReview.suggested_outcome || "Review Required"}
                  </span>
                </div>

                {aiReview.suggested_class && (
                  <div>
                    <span className="text-emerald-400/70 font-semibold block mb-1">Suggested Investor Class</span>
                    <span className="text-sm font-extrabold uppercase text-blue-300 bg-blue-950/80 border border-blue-500/30 px-3 py-1 rounded-xl inline-block">
                      {aiReview.suggested_class}
                    </span>
                  </div>
                )}

                {aiReview.reasoning_summary && (
                  <div>
                    <span className="text-emerald-400/70 font-semibold block mb-1">Reasoning Summary</span>
                    <p className="text-emerald-100/80 leading-relaxed bg-emerald-950/60 border border-emerald-800/40 p-3 rounded-2xl text-[11px]">
                      {aiReview.reasoning_summary}
                    </p>
                  </div>
                )}

                {/* Normalized Extracted Flags */}
                {aiReview.flags && Array.isArray(aiReview.flags) && aiReview.flags.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-emerald-400/70 font-semibold block">Compliance & Verification Flags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiReview.flags.map((flag, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg bg-emerald-900/50 border border-emerald-700/50 text-emerald-200 text-[10px] font-semibold"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-emerald-200/60 leading-relaxed">
                No automated AI review results recorded for this entity. Standard manual auditor verification guidelines apply.
              </p>
            )}

            {!isAlreadyResolved && aiReview?.suggested_outcome && (
              <button
                type="button"
                onClick={handleAcceptAiSuggestion}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-300" />
                <span>Accept AI Suggestion</span>
              </button>
            )}
          </div>

          {/* Decision Panel */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Auditor Action Panel
            </h3>

            {isAiDecided ? (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Auto-Approved by AI Engine</span>
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  This milestone met high confidence criteria (&gt;80%) and was automatically approved and released by the automated pipeline.
                </p>
              </div>
            ) : isAlreadyResolved ? (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-700 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Case Resolved ({entity?.status})</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  This case has already been decided. Status: <strong className="uppercase">{entity?.status}</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Investor Class Selector (For Investor cases) */}
                {type === "investor" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">
                      Assign Investor Class
                    </label>
                    <select
                      value={investorClass}
                      onChange={(e) => setInvestorClass(e.target.value)}
                      className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="retail">Retail Investor</option>
                      <option value="sophisticated">Sophisticated Investor</option>
                      <option value="institutional">Institutional Investor</option>
                    </select>
                  </div>
                )}

                {/* Rejection Reason Text Area */}
                {decision === "reject" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">
                      Rejection Reason / Auditor Notes <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Specify compliance issues or missing documentation..."
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    />
                  </div>
                )}

                {/* Approve / Reject Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isPending || activeAction !== null}
                    onClick={() => {
                      setDecision("approve");
                      handleSubmitDecision("approve");
                    }}
                    className="py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  >
                    {activeAction === "approve" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{activeAction === "approve" ? "Approving..." : "Approve"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending || activeAction !== null}
                    onClick={() => {
                      setDecision("reject");
                      if (decision !== "reject") {
                        // user clicked reject first time to toggle view
                        return;
                      }
                      handleSubmitDecision("reject");
                    }}
                    className="py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  >
                    {activeAction === "reject" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>{activeAction === "reject" ? "Rejecting..." : "Reject"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* NON-CLOSABLE DECISION CONFIRMATION MODAL */}
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
                  ? `${type} Approved`
                  : confirmationModal.decision === "send_back"
                  ? `${type} Sent Back`
                  : `${type} Rejected`}
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
                  const targetUrl =
                    type === "investor"
                      ? "/auditor-portal/investor-onboarding"
                      : type === "issuer"
                      ? "/auditor-portal/issuer-onboarding"
                      : type === "project"
                      ? "/auditor-portal/project-creation"
                      : type === "milestone"
                      ? "/auditor-portal/milestone-review"
                      : "/auditor-portal/investor-onboarding";
                  router.push(targetUrl);
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
