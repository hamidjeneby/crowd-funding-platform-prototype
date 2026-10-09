"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateProjectDocumentDecision,
  updateProjectMediaDecision,
  updateProjectMinClassDecision,
  updateMilestoneDecision,
  submitProjectFinalDecision,
  updateProjectShariahCompliance,
  updateProjectCoverImageDecision,
} from "@/app/actions/auditor";
import {
  ArrowLeft,
  Briefcase,
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
  Image as ImageIcon,
  Target,
  X,
  Loader2,
  Building2,
  DollarSign,
  Calendar,
  Layers,
  Award,
  Film,
  RotateCcw,
  Globe,
  Info,
  Check,
  ChevronRight,
  Upload,
  FileCheck,
} from "lucide-react";

/**
 * Calculates baseline minimum eligible investor class based on class-rules.md §1 & §9
 */
export function calculateBaselineMinClass(targetGoalNum, minFloorNum) {
  const goal = Number(targetGoalNum || 0);
  const floor = Number(minFloorNum || 0);

  // 1. Floor Rule (§9): Max pledge ceilings per class
  let highestClassByFloor = 10;
  if (floor > 5000000) highestClassByFloor = 1;
  else if (floor > 2000000) highestClassByFloor = 2;
  else if (floor > 1000000) highestClassByFloor = 3;
  else if (floor > 500000) highestClassByFloor = 4;
  else if (floor > 200000) highestClassByFloor = 5;
  else if (floor > 50000) highestClassByFloor = 6;
  else if (floor > 10000) highestClassByFloor = 7;
  else if (floor > 2000) highestClassByFloor = 8;
  else if (floor > 500) highestClassByFloor = 9;
  else highestClassByFloor = 10;

  // 2. Goal Rule (§1): Target raise size thresholds
  let highestClassByGoal = 10;
  if (goal > 20000000) highestClassByGoal = 8;
  else if (goal > 15000000) highestClassByGoal = 7;
  else if (goal > 10000000) highestClassByGoal = 6;
  else if (goal > 5000000) highestClassByGoal = 5;
  else highestClassByGoal = 10;

  // Combination: Most restrictive (smallest numeric class)
  const calculatedMinClass = Math.min(highestClassByFloor, highestClassByGoal);

  return {
    calculatedMinClass,
    highestClassByFloor,
    highestClassByGoal,
    floor,
    goal,
  };
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateStr);
  }
}

export default function ProjectDetailReviewClient({
  project: initialProject,
  spvDetails,
  issuer,
  documents: initialDocuments = [],
  media: initialMedia = [],
  minVisClassAiReview,
  milestones: initialMilestones = [],
  error: initialError,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic local states
  const [project, setLocalProject] = useState(initialProject);
  const [documents, setLocalDocs] = useState(initialDocuments);
  const [media, setLocalMedia] = useState(initialMedia);
  const [milestones, setLocalMilestones] = useState(initialMilestones);

  // Baseline Class Analysis
  const baselineInfo = calculateBaselineMinClass(
    project?.target_goal,
    project?.min_investment_floor || project?.min_investment_amount,
  );

  const [minClass, setLocalMinClass] = useState(
    initialProject?.min_eligible_investor_class !== null &&
      initialProject?.min_eligible_investor_class !== undefined
      ? String(initialProject.min_eligible_investor_class)
      : String(baselineInfo.calculatedMinClass),
  );

  useEffect(() => {
    setLocalProject(initialProject);
    if (
      initialProject?.min_eligible_investor_class !== null &&
      initialProject?.min_eligible_investor_class !== undefined
    ) {
      setLocalMinClass(String(initialProject.min_eligible_investor_class));
    } else {
      setLocalMinClass(String(baselineInfo.calculatedMinClass));
    }
  }, [initialProject]);

  // Class actually saved on the project vs. the auditor's current (possibly unsaved) pick
  const assignedClass =
    project?.min_eligible_investor_class !== null &&
    project?.min_eligible_investor_class !== undefined
      ? String(project.min_eligible_investor_class)
      : null;
  const isClassSelectionDirty = String(minClass) !== assignedClass;

  useEffect(() => {
    setLocalDocs(initialDocuments);
  }, [initialDocuments]);

  useEffect(() => {
    setLocalMedia(initialMedia);
  }, [initialMedia]);

  useEffect(() => {
    setLocalMilestones(initialMilestones);
  }, [initialMilestones]);

  // Modals & Forms
  const [rawOutputItem, setRawOutputItem] = useState(null); // { title, aiReview }
  const [rawViewMode, setRawViewMode] = useState("rows"); // "rows" | "raw"
  const [rejectingItem, setRejectingItem] = useState(null); // { type: 'doc'|'media', id, title }
  const [rejectionReason, setRejectionReason] = useState("");

  const [finalDecisionModal, setFinalDecisionModal] = useState(null); // 'send_back' | 'reject'
  const [finalReviewNotes, setFinalReviewNotes] = useState("");
  const [confirmationModal, setConfirmationModal] = useState(null); // { decision, message }

  const [actionError, setActionError] = useState(initialError || null);
  const [activeAction, setActiveAction] = useState(null);
  const [shariahFile, setShariahFile] = useState(null);

  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (actionError && actionError !== initialError) {
      const timer = setTimeout(() => setActionError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  // Gating Validation
  const pendingDocsCount = documents.filter(
    (d) => (d.review_status || d.status) === "pending",
  ).length;
  const pendingMediaCount = media.filter(
    (m) => (m.review_status || m.status) === "pending",
  ).length;
  const pendingMilestonesCount = milestones.filter(
    (m) => (m.verification_status || m.status) === "pending",
  ).length;
  const isCoverPending = project?.cover_image_url
    ? (project?.cover_image_review_status || "pending") === "pending"
    : false;

  const rawProjectStatus = (project?.status || "").toLowerCase().trim();
  const isPendingReviewStatus =
    rawProjectStatus === "pending_review" ||
    rawProjectStatus === "pending review" ||
    rawProjectStatus === "pending";

  const isFinalDecisionDisabled =
    !isPendingReviewStatus ||
    pendingDocsCount > 0 ||
    pendingMediaCount > 0 ||
    pendingMilestonesCount > 0 ||
    isCoverPending;

  const handleCoverImageDecision = async (decision) => {
    setActionError(null);
    setActiveAction(`cover_image_${decision}`);

    try {
      const res = await updateProjectCoverImageDecision({
        projectId: project.id,
        decision,
      });
      if (!res.success) {
        setActionError(res.error || `Failed to ${decision} cover image.`);
      } else {
        setLocalProject((prev) => ({
          ...prev,
          cover_image_review_status: decision,
        }));
      }
    } catch (err) {
      setActionError(
        "An unexpected error occurred while updating cover image decision.",
      );
    } finally {
      setActiveAction(null);
    }
  };

  // ------------------------------------------------------------------
  // Handlers for Document Decisions
  // ------------------------------------------------------------------
  const handleApproveDoc = async (docId) => {
    setActionError(null);
    setActiveAction(`approve_doc_${docId}`);

    try {
      const res = await updateProjectDocumentDecision({
        docId,
        decision: "approved",
      });
      if (!res.success) {
        setActionError(res.error || "Failed to approve document.");
      } else {
        setLocalDocs((prev) =>
          prev.map((d) =>
            d.id === docId
              ? { ...d, review_status: "approved", rejection_reason: null }
              : d,
          ),
        );
      }
    } catch (err) {
      setActionError("An unexpected error occurred.");
    } finally {
      setActiveAction(null);
    }
  };

  const handleConfirmRejectDoc = async () => {
    if (!rejectionReason.trim()) {
      setActionError("Please provide a rejection reason for this document.");
      return;
    }
    setActionError(null);
    const docId = rejectingItem.id;
    setActiveAction(`reject_doc_${docId}`);

    try {
      const res = await updateProjectDocumentDecision({
        docId,
        decision: "rejected",
        rejectionReason,
      });
      if (!res.success) {
        setActionError(res.error || "Failed to reject document.");
      } else {
        setLocalDocs((prev) =>
          prev.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  review_status: "rejected",
                  rejection_reason: rejectionReason,
                }
              : d,
          ),
        );
        setRejectingItem(null);
        setRejectionReason("");
      }
    } catch (err) {
      setActionError("An unexpected error occurred.");
    } finally {
      setActiveAction(null);
    }
  };

  // ------------------------------------------------------------------
  // Handlers for Media Decisions
  // ------------------------------------------------------------------
  const handleApproveMedia = async (mediaId) => {
    setActionError(null);
    setActiveAction(`approve_media_${mediaId}`);

    try {
      const res = await updateProjectMediaDecision({
        mediaId,
        decision: "approved",
      });
      if (!res.success) {
        setActionError(res.error || "Failed to approve media file.");
      } else {
        setLocalMedia((prev) =>
          prev.map((m) =>
            m.id === mediaId
              ? { ...m, review_status: "approved", rejection_reason: null }
              : m,
          ),
        );
      }
    } catch (err) {
      setActionError("An unexpected error occurred.");
    } finally {
      setActiveAction(null);
    }
  };

  const handleConfirmRejectMedia = async () => {
    if (!rejectionReason.trim()) {
      setActionError("Please provide a rejection reason for this media file.");
      return;
    }
    setActionError(null);
    const mediaId = rejectingItem.id;
    setActiveAction(`reject_media_${mediaId}`);

    try {
      const res = await updateProjectMediaDecision({
        mediaId,
        decision: "rejected",
        rejectionReason,
      });
      if (!res.success) {
        setActionError(res.error || "Failed to reject media file.");
      } else {
        setLocalMedia((prev) =>
          prev.map((m) =>
            m.id === mediaId
              ? {
                  ...m,
                  review_status: "rejected",
                  rejection_reason: rejectionReason,
                }
              : m,
          ),
        );
        setRejectingItem(null);
        setRejectionReason("");
      }
    } catch (err) {
      setActionError("An unexpected error occurred.");
    } finally {
      setActiveAction(null);
    }
  };

  // ------------------------------------------------------------------
  // Handlers for Minimum Class Assignment
  // ------------------------------------------------------------------
  const handleAssignMinClass = async (selectedLevel) => {
    setActionError(null);
    setActiveAction("assign_min_class");

    try {
      const res = await updateProjectMinClassDecision({
        projectId: project.id,
        selectedClass: selectedLevel,
      });
      if (!res.success) {
        setActionError(res.error || "Failed to update minimum investor class.");
      } else {
        setLocalMinClass(selectedLevel);
        setLocalProject((prev) => ({
          ...prev,
          min_eligible_investor_class: Number(selectedLevel),
        }));
      }
    } catch (err) {
      setActionError("An unexpected error occurred.");
    } finally {
      setActiveAction(null);
    }
  };

  // ------------------------------------------------------------------
  // Handlers for Milestone Decisions (NO MODAL FOR REJECTION!)
  // ------------------------------------------------------------------
  const handleApproveMilestone = async (milestoneId) => {
    setActionError(null);
    setActiveAction(`approve_ms_${milestoneId}`);

    try {
      const res = await updateMilestoneDecision({
        milestoneId,
        decision: "approved",
      });
      if (!res.success) {
        setActionError(res.error || "Failed to approve milestone.");
      } else {
        setLocalMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId
              ? {
                  ...m,
                  verification_status: "approved",
                  status: "completed",
                  rejection_reason: null,
                }
              : m,
          ),
        );
      }
    } catch (err) {
      setActionError("An unexpected error occurred.");
    } finally {
      setActiveAction(null);
    }
  };

  const handleDirectRejectMilestone = async (milestoneId) => {
    setActionError(null);
    setActiveAction(`reject_ms_${milestoneId}`);

    try {
      const res = await updateMilestoneDecision({
        milestoneId,
        decision: "rejected",
        rejectionReason: null,
      });
      if (!res.success) {
        setActionError(res.error || "Failed to reject milestone.");
      } else {
        setLocalMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId
              ? {
                  ...m,
                  verification_status: "rejected",
                  rejection_reason: null,
                }
              : m,
          ),
        );
      }
    } catch (err) {
      setActionError("An unexpected error occurred.");
    } finally {
      setActiveAction(null);
    }
  };

  // ------------------------------------------------------------------
  // Handler for Shariah Compliance Decision & Certificate Upload
  // ------------------------------------------------------------------
  const handleUpdateShariahCompliance = async (decision) => {
    setActionError(null);
    setActiveAction(`shariah_${decision}`);

    try {
      const formData = new FormData();
      formData.append("projectId", project.id);
      formData.append("decision", decision);
      if (shariahFile) {
        formData.append("certificateFile", shariahFile);
      }

      const res = await updateProjectShariahCompliance(formData);
      if (!res.success) {
        setActionError(res.error || "Failed to update Shariah compliance.");
      } else {
        setLocalProject((prev) => ({
          ...prev,
          shariah_compliance_status: res.shariah_compliance_status,
          shariah_certificate_doc_url: res.shariah_certificate_doc_url,
          shariah_compliance_doc_url: res.shariah_certificate_doc_url,
          signedShariahDocUrl:
            res.signedShariahDocUrl || prev?.signedShariahDocUrl,
        }));
        setShariahFile(null);
      }
    } catch (err) {
      setActionError(
        "An unexpected error occurred while updating Shariah compliance.",
      );
    } finally {
      setActiveAction(null);
    }
  };

  // ------------------------------------------------------------------
  // Handlers for Overall Final Project Decision
  // ------------------------------------------------------------------
  const handleApproveFinalProject = () => {
    setActionError(null);
    setActiveAction("final_approve");

    startTransition(async () => {
      try {
        const res = await submitProjectFinalDecision({
          projectId: project.id,
          decision: "approve",
        });
        if (!res.success) {
          setActionError(res.error || "Failed to approve project proposal.");
        } else {
          setLocalProject((prev) => ({ ...prev, status: "campaign_live" }));
          setConfirmationModal({
            decision: "approve",
            message: `The project proposal "${project.title}" has been approved and moved to Live Campaign.`,
          });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  const handleConfirmFinalActionModal = () => {
    if (!finalDecisionModal) return;
    if (!finalReviewNotes.trim()) {
      setActionError("Please provide review notes explaining the decision.");
      return;
    }
    setActionError(null);
    const decision = finalDecisionModal;
    setActiveAction(`final_${decision}`);

    startTransition(async () => {
      try {
        const res = await submitProjectFinalDecision({
          projectId: project.id,
          decision,
          reviewNotes: finalReviewNotes,
        });
        if (!res.success) {
          setActionError(
            res.error ||
              `Failed to ${decision.replace("_", " ")} project proposal.`,
          );
        } else {
          const actionText =
            decision === "send_back" ? "sent back for revision" : "rejected";
          setLocalProject((prev) => ({
            ...prev,
            status: decision === "send_back" ? "draft" : "rejected",
            review_notes: finalReviewNotes,
          }));
          setConfirmationModal({
            decision,
            message: `The project proposal "${project.title}" has been ${actionText} successfully.`,
          });
          setFinalDecisionModal(null);
          setFinalReviewNotes("");
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  const formattedGoal = project.target_goal
    ? `${project.currency || "AED"} ${Number(project.target_goal).toLocaleString()}`
    : "N/A";

  const issuerName =
    issuer?.legal_entity_name || `Issuer #${project.issuer_id}`;

  return (
    <div className="space-y-8 pb-16">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/auditor-portal/project-creation"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#064e3b] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Project Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">
            Project ID: #{project.id}
          </span>
          {project.slug && (
            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-mono">
              /{project.slug}
            </span>
          )}
          {spvDetails && (
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase">
              SPV Structure Attached
            </span>
          )}
        </div>
      </div>

      {/* Main Hero Header Card */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
              <Briefcase className="w-3 h-3 text-[#059669]" />
              <span>Project Review</span>
            </span>

            {isPendingReviewStatus ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />{" "}
                Pending Auditor Review
              </span>
            ) : project.status === "campaign_live" ||
              project.status === "published" ||
              project.status === "approved" ||
              project.status === "active" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                Campaign Live / Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-bold uppercase">
                <XCircle className="w-3.5 h-3.5 text-red-600" />{" "}
                {project.status}
              </span>
            )}

            {project.shariah_compliance_status && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase">
                Shariah: {project.shariah_compliance_status}
              </span>
            )}
          </div>

          <div className="flex items-start gap-4">
            {project.cover_image_url && (
              <img
                src={project.cover_image_url}
                alt="Campaign Cover Preview"
                className="w-20 h-20 rounded-2xl object-cover border border-gray-200 shrink-0 hidden sm:block shadow-xs"
              />
            )}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#064e3b]">
                {project.title}
              </h1>
              <p className="text-xs text-gray-600 leading-relaxed">
                {project.summary ||
                  project.short_summary ||
                  "No summary provided."}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#fcfbf7] border border-emerald-900/10 rounded-2xl p-4 sm:p-5 text-right shrink-0 space-y-2">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase block">
              Target Campaign Goal
            </span>
            <span className="text-2xl font-black text-[#064e3b] font-mono block">
              {formattedGoal}
            </span>
          </div>
          <div className="text-xs text-gray-600 space-y-0.5">
            <span className="font-semibold text-gray-800 block">
              Issuer: {issuerName}
            </span>
            {issuer?.business_email && (
              <span className="block text-[11px] text-gray-400">
                {issuer.business_email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error notice (fixed so it's visible at any scroll position) */}
      {actionError && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-[60] max-w-sm w-[calc(100%-3rem)] sm:w-auto p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="cursor-pointer text-red-400 hover:text-red-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SECTION 1: ALL PROJECT CREATION DATA */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" /> Complete Campaign
            Proposal Specifications
          </h2>
          <span className="text-xs font-semibold text-gray-400">
            Step {project.current_step || 6} / 6 Complete
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Sharia Contract Structure
            </span>
            <span className="font-extrabold text-gray-900 uppercase">
              {project.sharia_contract_type || "Standard"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Target Campaign Goal
            </span>
            <span className="font-extrabold text-emerald-900 font-mono">
              {project.currency || "AED"}{" "}
              {project.target_goal
                ? Number(project.target_goal).toLocaleString()
                : "N/A"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Soft Cap Threshold
            </span>
            <span className="font-bold text-gray-800 font-mono">
              {project.currency || "AED"}{" "}
              {project.soft_cap
                ? Number(project.soft_cap).toLocaleString()
                : "N/A"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Hard Cap Ceiling
            </span>
            <span className="font-bold text-gray-800 font-mono">
              {project.currency || "AED"}{" "}
              {project.hard_cap
                ? Number(project.hard_cap).toLocaleString()
                : "N/A"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Minimum Investment Floor
            </span>
            <span className="font-bold text-emerald-900 font-mono">
              {project.currency || "AED"}{" "}
              {project.min_investment_floor || project.min_investment_amount
                ? Number(
                    project.min_investment_floor ||
                      project.min_investment_amount,
                  ).toLocaleString()
                : "1,000"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Unit Price / Instrument Face Value
            </span>
            <span className="font-bold text-gray-900 font-mono">
              {project.currency || "AED"}{" "}
              {project.unit_price
                ? Number(project.unit_price).toLocaleString()
                : "N/A"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Instrument Unit Type
            </span>
            <span className="font-bold text-gray-900 uppercase">
              {project.unit_type || "Sukuk Unit"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Expected Return / ROI
            </span>
            <span className="font-extrabold text-emerald-700 font-mono">
              {project.expected_roi_percent
                ? `${project.expected_roi_percent}% APR`
                : "N/A"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Yield Distribution Type
            </span>
            <span className="font-bold text-gray-900 capitalize">
              {project.yield_type || "N/A"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Platform Clearing Option
            </span>
            <span className="font-bold text-gray-800 uppercase">
              {project.clearing_option || "Platform Clearing"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              SPV Incorporation Structure
            </span>
            <span className="font-bold text-indigo-900">
              {project.is_spv ? "Yes (SPV Enabled)" : "No (Direct Issuer)"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
            <span className="text-gray-400 block font-medium">
              Campaign Deadline
            </span>
            <span className="font-bold text-gray-800" suppressHydrationWarning>
              {formatDate(project.campaign_end_date)}
            </span>
          </div>
        </div>

        {/* Full Project Description Content */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 block">
            Full Campaign Pitch Description
          </span>
          {project.full_description ? (
            <div
              className="text-xs text-gray-700 leading-relaxed bg-[#fcfbf7] p-5 rounded-2xl border border-gray-200/60 space-y-3 prose prose-xs max-w-none"
              dangerouslySetInnerHTML={{ __html: project.full_description }}
            />
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed bg-[#fcfbf7] p-4 rounded-2xl border border-gray-200/60">
              {project.description || "No full description submitted."}
            </p>
          )}
        </div>
      </div>

      {/* SECTION 2: SPV LEGAL STRUCTURE & CONVERSION DETAILS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" /> SPV Legal
              Structure & Conversion Terms
            </h2>
            <p className="text-xs text-gray-500">
              Special Purpose Vehicle incorporation data and share conversion
              clauses.
            </p>
          </div>

          {spvDetails && spvDetails.spv_detail_verification_status && (
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-extrabold uppercase">
              Status: {spvDetails.spv_detail_verification_status}
            </span>
          )}
        </div>

        {spvDetails ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
              <span className="text-gray-400 block font-medium">
                SPV Legal Entity Name
              </span>
              <span className="font-extrabold text-indigo-950 text-sm">
                {spvDetails.spv_legal_name ||
                  spvDetails.spv_name ||
                  spvDetails.legal_name ||
                  "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
              <span className="text-gray-400 block font-medium">
                Registration Authority
              </span>
              <span className="font-bold text-gray-900">
                {spvDetails.registration_authority || "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
              <span className="text-gray-400 block font-medium">
                Registration Number
              </span>
              <span className="font-mono font-extrabold text-indigo-900">
                {spvDetails.registration_number || "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
              <span className="text-gray-400 block font-medium">
                Total Shares Authorized
              </span>
              <span className="font-mono font-bold text-gray-900">
                {spvDetails.total_shares_authorized
                  ? Number(spvDetails.total_shares_authorized).toLocaleString()
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
              <span className="text-gray-400 block font-medium">
                Total Cost Authorized
              </span>
              <span className="font-mono font-bold text-gray-900">
                {spvDetails.total_cost_authorized
                  ? `${project.currency || "AED"} ${Number(spvDetails.total_cost_authorized).toLocaleString()}`
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
              <span className="text-gray-400 block font-medium">
                Conversion Clause Status
              </span>
              <span className="font-bold text-indigo-900">
                {spvDetails.conversion_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {spvDetails.conversion_enabled && (
              <>
                <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
                  <span className="text-gray-400 block font-medium">
                    Conversion Trigger Type
                  </span>
                  <span className="font-bold text-gray-900">
                    {spvDetails.conversion_trigger_type || "N/A"}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
                  <span className="text-gray-400 block font-medium">
                    Conversion Trigger Value
                  </span>
                  <span className="font-bold text-gray-900 font-mono">
                    {spvDetails.conversion_trigger_value
                      ? `${spvDetails.conversion_trigger_value} ${project.currency || "AED"}`
                      : "N/A"}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
                  <span className="text-gray-400 block font-medium">
                    Conversion Ratio Shares
                  </span>
                  <span className="font-bold text-gray-900 font-mono">
                    {spvDetails.conversion_ratio_shares || "N/A"} Shares / Unit
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
                  <span className="text-gray-400 block font-medium">
                    Conversion Deadline
                  </span>
                  <span
                    className="font-bold text-gray-800"
                    suppressHydrationWarning
                  >
                    {formatDate(spvDetails.conversion_deadline)}
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/60 text-xs text-gray-500 italic">
            No Special Purpose Vehicle (SPV) structure attached to this project
            proposal.
          </div>
        )}
      </div>

      {/* SECTION 3: PROJECT DOCUMENTS & LATEST AI REVIEWS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Project
              Documents & AI Verification ({documents.length})
            </h2>
            <p className="text-xs text-gray-500">
              Audit pitch decks, financial statements, valuation reports, and
              cap tables (showing latest AI review results).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pendingDocsCount > 0 ? (
              <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                {pendingDocsCount} Pending Document
                {pendingDocsCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All
                Documents Decided
              </span>
            )}
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 italic bg-gray-50 rounded-2xl">
            No project documents uploaded for this campaign proposal.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {documents.map((doc) => {
              const ai = doc.aiReview;
              const docStatus = doc.review_status || doc.status || "pending";
              const isApproveLoading = activeAction === `approve_doc_${doc.id}`;
              const isRejectLoading = activeAction === `reject_doc_${doc.id}`;

              return (
                <div
                  key={doc.id}
                  className={`rounded-2xl border p-5 transition-all space-y-4 ${
                    docStatus === "approved"
                      ? "bg-emerald-50/30 border-emerald-200"
                      : docStatus === "rejected"
                        ? "bg-red-50/30 border-red-200"
                        : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-extrabold uppercase">
                          {doc.doc_type || "Project Doc"}
                        </span>

                        {docStatus === "approved" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                            Approved
                          </span>
                        ) : docStatus === "rejected" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-600" />{" "}
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                            Review
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-gray-900 text-sm">
                        {doc.doc_name || doc.doc_type}
                      </h3>
                    </div>

                    {doc.signedUrl ? (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors self-start sm:self-auto"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-red-500 font-semibold italic">
                        File deleted / unavailable
                      </span>
                    )}
                  </div>

                  {/* AI Verification Card */}
                  {ai ? (
                    <div className="bg-linear-to-r from-purple-50/80 to-indigo-50/80 border border-purple-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-purple-900">
                          <Sparkles className="w-4 h-4 text-purple-600" /> AI
                          Document Verification (Latest Review)
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              ai.suggested_outcome === "approved"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                            }`}
                          >
                            AI Suggestion: {ai.suggested_outcome}
                          </span>

                          <span className="text-xs font-black text-purple-900">
                            {ai.confidence_score
                              ? `${Math.round(Number(ai.confidence_score) * 100)}% Confidence`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-purple-950 font-medium leading-relaxed">
                        {ai.reasoning_summary}
                      </p>

                      {ai.normalizedFlags && ai.normalizedFlags.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-extrabold text-purple-900 uppercase block">
                            Flagged AI Concerns:
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-xs text-red-900">
                            {ai.normalizedFlags.map((flag, idx) => (
                              <li key={idx} className="font-semibold">
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {ai.raw_model_output && (
                        <div className="pt-1">
                          <button
                            onClick={() =>
                              setRawOutputItem({
                                title: doc.doc_name || doc.doc_type,
                                aiReview: ai,
                              })
                            }
                            className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 underline"
                          >
                            <Code className="w-3 h-3" /> View Raw AI Output
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-200 text-xs text-gray-500 rounded-xl">
                      No AI automated review record found for this document.
                    </div>
                  )}

                  {doc.rejection_reason && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-xl space-y-1">
                      <span className="font-bold block">Rejection Reason:</span>
                      <p>{doc.rejection_reason}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() =>
                        setRejectingItem({
                          type: "doc",
                          id: doc.id,
                          title: doc.doc_name || doc.doc_type,
                        })
                      }
                      disabled={
                        !!activeAction || isApproveLoading || isRejectLoading
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isRejectLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Reject Document</span>
                    </button>

                    <button
                      onClick={() => handleApproveDoc(doc.id)}
                      disabled={
                        !!activeAction || isApproveLoading || isRejectLoading
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      {isApproveLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Approve Document</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4.A: PROJECT COVER IMAGE */}
      {project.cover_image_url && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" /> Project Cover
                Image
              </h2>
              <p className="text-xs text-gray-500">
                Audit main project hero/cover image displayed across the
                investor portal.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(project.cover_image_review_status || "pending") ===
              "approved" ? (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                  Cover Approved
                </span>
              ) : (project.cover_image_review_status || "pending") ===
                "rejected" ? (
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 text-xs font-bold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-red-600" /> Cover
                  Rejected
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
                  Review
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <img
                src={project.cover_image_url}
                alt="Project Cover Image"
                className="w-32 h-24 rounded-xl object-cover border border-gray-200 shadow-xs shrink-0"
              />
              <div className="space-y-1 text-xs">
                <p className="font-extrabold text-gray-900">
                  Campaign Hero Cover Image
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCoverImageDecision("rejected")}
                disabled={activeAction !== null}
                className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {activeAction === "cover_image_rejected" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                )}
                <span>Reject Cover</span>
              </button>

              <button
                onClick={() => handleCoverImageDecision("approved")}
                disabled={activeAction !== null}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {activeAction === "cover_image_approved" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Approve Cover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: PROJECT MEDIA FILES & LATEST AI REVIEWS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-600" /> Project Media &
              Pitch Visuals ({media.length})
            </h2>
            <p className="text-xs text-gray-500">
              Audit campaign gallery images and promotional media (showing
              latest AI reviews).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pendingMediaCount > 0 ? (
              <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                {pendingMediaCount} Pending Media File
                {pendingMediaCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All
                Media Decided
              </span>
            )}
          </div>
        </div>

        {media.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 italic bg-gray-50 rounded-2xl">
            No project media uploaded for this campaign proposal.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {media.map((m) => {
              const ai = m.aiReview;
              const mediaStatus = m.review_status || m.status || "pending";
              const isApproveLoading = activeAction === `approve_media_${m.id}`;
              const isRejectLoading = activeAction === `reject_media_${m.id}`;

              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-5 transition-all space-y-4 ${
                    mediaStatus === "approved"
                      ? "bg-emerald-50/30 border-emerald-200"
                      : mediaStatus === "rejected"
                        ? "bg-red-50/30 border-red-200"
                        : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3">
                      {m.signedUrl ? (
                        <img
                          src={m.signedUrl}
                          alt="Project Media Preview"
                          className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                          <Film className="w-6 h-6" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-extrabold uppercase">
                            {m.media_type || "image"}
                          </span>

                          {mediaStatus === "approved" ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                              Approved
                            </span>
                          ) : mediaStatus === "rejected" ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-600" />{" "}
                              Rejected
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />{" "}
                              Pending Review
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-gray-900 text-sm">
                          Media File #{m.id} (Display Order:{" "}
                          {m.display_order ?? 1})
                        </h3>
                      </div>
                    </div>

                    {m.signedUrl && (
                      <a
                        href={m.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors self-start sm:self-auto"
                      >
                        <span>Full View</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {ai ? (
                    <div className="bg-linear-to-r from-purple-50/80 to-indigo-50/80 border border-purple-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-purple-900">
                          <Sparkles className="w-4 h-4 text-purple-600" /> AI
                          Media Analysis (Latest Review)
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              ai.suggested_outcome === "approved"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                            }`}
                          >
                            AI Suggestion: {ai.suggested_outcome}
                          </span>

                          <span className="text-xs font-black text-purple-900">
                            {ai.confidence_score
                              ? `${Math.round(Number(ai.confidence_score) * 100)}% Confidence`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-purple-950 font-medium leading-relaxed">
                        {ai.reasoning_summary}
                      </p>

                      {ai.normalizedFlags && ai.normalizedFlags.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-extrabold text-purple-900 uppercase block">
                            Flagged AI Concerns:
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-xs text-red-900">
                            {ai.normalizedFlags.map((flag, idx) => (
                              <li key={idx} className="font-semibold">
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {ai.raw_model_output && (
                        <div className="pt-1">
                          <button
                            onClick={() =>
                              setRawOutputItem({
                                title: `Media File #${m.id}`,
                                aiReview: ai,
                              })
                            }
                            className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 underline"
                          >
                            <Code className="w-3 h-3" /> View Raw AI Output
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-200 text-xs text-gray-500 rounded-xl">
                      No AI automated review record found for this media file.
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() =>
                        setRejectingItem({
                          type: "media",
                          id: m.id,
                          title: `Media File #${m.id}`,
                        })
                      }
                      disabled={
                        !!activeAction || isApproveLoading || isRejectLoading
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isRejectLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Reject Media</span>
                    </button>

                    <button
                      onClick={() => handleApproveMedia(m.id)}
                      disabled={
                        !!activeAction || isApproveLoading || isRejectLoading
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      {isApproveLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Approve Media</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION: SHARIAH COMPLIANCE AUDIT & CERTIFICATION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Shariah
              Compliance Audit &amp; Certification
            </h2>
            <p className="text-xs text-gray-500">
              Audit Shariah contract structure submitted by issuer and upload
              compliance certificate.
            </p>
          </div>

          <div>
            {project?.shariah_compliance_status === "approved" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Shariah Approved
              </span>
            ) : project?.shariah_compliance_status === "rejected" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                Shariah Non-Compliant
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Pending Shariah Audit
              </span>
            )}
          </div>
        </div>

        {/* Contract Type Input Data Summary */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
              Issuer Declared Contract Structure
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-800 text-white text-xs font-extrabold uppercase tracking-wide">
              {project?.sharia_contract_type ||
                project?.shariah_contract_type ||
                "Standard Mudarabah"}
            </span>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed">
            The project creator has submitted this campaign under a{" "}
            <strong className="capitalize">
              {project?.sharia_contract_type ||
                project?.shariah_contract_type ||
                "Mudarabah"}
            </strong>{" "}
            structure. As an auditor, verify that campaign terms, revenue
            sharing models, and underlying assets comply with Islamic finance
            principles before issuing the compliance certificate.
          </p>
        </div>

        {/* Existing Certificate Document (If present) */}
        {(project?.signedShariahDocUrl ||
          project?.shariah_certificate_doc_url ||
          project?.shariah_compliance_doc_url) && (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-extrabold text-gray-900 block">
                  Shariah Compliance Certificate
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 block">
                  Uploaded &amp; attached to campaign record
                </span>
              </div>
            </div>

            <a
              href={
                project?.signedShariahDocUrl ||
                project?.shariah_certificate_doc_url ||
                project?.shariah_compliance_doc_url
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 hover:text-emerald-700 hover:border-emerald-300 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Certificate Document</span>
            </a>
          </div>
        )}

        {/* Upload & Approval Form */}
        <div className="space-y-4 pt-1">
          <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
            Upload Shariah Compliance Certificate Document *
          </label>

          <div
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              shariahFile
                ? "border-emerald-500 bg-emerald-50/30"
                : "border-gray-300 hover:border-emerald-400 bg-gray-50/50"
            }`}
          >
            <input
              type="file"
              id="shariahCertificateInput"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setShariahFile(e.target.files[0]);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {shariahFile ? (
              <div className="flex items-center justify-between max-w-md mx-auto p-3 rounded-xl bg-white border border-emerald-200 shadow-xs text-left">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-bold text-gray-900 block truncate">
                      {shariahFile.name}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      {(shariahFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShariahFile(null);
                  }}
                  className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 z-20 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-800 block">
                    Click or drag &amp; drop certificate file here
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Supports PDF, DOCX, PNG, JPG (Stored securely in
                    shariah_compliance_docs)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleUpdateShariahCompliance("rejected")}
              disabled={!!activeAction}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {activeAction === "shariah_rejected" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>Mark Shariah Non-Compliant</span>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateShariahCompliance("approved")}
              disabled={
                !!activeAction ||
                (!shariahFile &&
                  !project?.shariah_certificate_doc_url &&
                  !project?.shariah_compliance_doc_url)
              }
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {activeAction === "shariah_approved" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>
                {shariahFile
                  ? "Upload Certificate & Approve Shariah Compliance"
                  : "Approve Shariah Compliance"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: MINIMUM ELIGIBLE INVESTOR CLASS RESTRICTION PANEL WITH CALCULATED BASELINE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" /> Minimum Investor
              Class Restriction Assignment
            </h2>
            <p className="text-xs text-gray-500">
              Determine minimum eligible investor class required to view &
              invest in this campaign.
            </p>
          </div>

          {assignedClass ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Assigned: Class {assignedClass}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Not Assigned
            </span>
          )}
        </div>

        {/* System Calculated Baseline Recommendation Card (§1 & §9 of class-rules.md) */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-950">
              <Info className="w-4 h-4 text-emerald-700" /> System Calculated
              Baseline Class: Class {baselineInfo.calculatedMinClass}
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-700 text-white text-xs font-extrabold">
              Recommended Baseline: Class {baselineInfo.calculatedMinClass}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/60 space-y-1">
              <span className="text-gray-500 block font-medium">
                1. Min Floor Constraint (AED{" "}
                {baselineInfo.floor.toLocaleString()})
              </span>
              <span className="font-bold text-gray-900 block">
                Pledge Floor allows up to:{" "}
                <strong>Class {baselineInfo.highestClassByFloor}</strong>
              </span>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/60 space-y-1">
              <span className="text-gray-400 block font-medium">
                2. Target Goal Constraint (AED{" "}
                {baselineInfo.goal.toLocaleString()})
              </span>
              <span className="font-bold text-gray-900 block">
                Target Raise Size allows up to:{" "}
                <strong>Class {baselineInfo.highestClassByGoal}</strong>
              </span>
            </div>
          </div>

          <p className="text-[11px] text-emerald-800 italic">
            Taking the most restrictive overlap yields baseline{" "}
            <strong>Class {baselineInfo.calculatedMinClass}</strong>. Investors
            with class numbers higher than {baselineInfo.calculatedMinClass}{" "}
            cannot view or pledge to this campaign.
          </p>
        </div>

        {/* AI Model Output Recommendation if present */}
        {minVisClassAiReview && (
          <div className="bg-linear-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-950">
                <Sparkles className="w-4 h-4 text-indigo-600" /> AI Model
                Visibility Assessment
              </div>
              {minVisClassAiReview.confidence_score && (
                <span className="text-xs font-black text-indigo-900">
                  {Math.round(
                    Number(minVisClassAiReview.confidence_score) * 100,
                  )}
                  % Confidence
                </span>
              )}
            </div>

            <p className="text-xs text-indigo-950 font-medium leading-relaxed">
              {minVisClassAiReview.reasoning_summary}
            </p>
          </div>
        )}

        {/* Auditor Class Level Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
            Assign &amp; Lock Minimum Eligible Investor Class Level *
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => {
              const isCalculatedBaseline =
                Number(lvl) === baselineInfo.calculatedMinClass;
              const isSelected = String(minClass) === String(lvl);
              const isAssigned = assignedClass === String(lvl);

              let stateClasses =
                "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700";
              if (isSelected && isAssigned) {
                stateClasses =
                  "bg-emerald-950 text-white border-emerald-950 shadow-sm";
              } else if (isSelected) {
                stateClasses =
                  "bg-indigo-50 text-indigo-900 border-indigo-500 ring-2 ring-indigo-200 shadow-sm";
              } else if (isAssigned) {
                stateClasses =
                  "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 border-dashed";
              }

              let subLabel = null;
              if (isAssigned) subLabel = "Assigned";
              else if (isSelected) subLabel = "Selected";
              else if (isCalculatedBaseline) subLabel = "Baseline";

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLocalMinClass(String(lvl))}
                  aria-pressed={isSelected}
                  disabled={activeAction === "assign_min_class"}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center relative cursor-pointer disabled:cursor-not-allowed ${stateClasses}`}
                >
                  {isAssigned && (
                    <Check
                      className={`w-3.5 h-3.5 absolute top-2 right-2 ${
                        isSelected ? "text-emerald-300" : "text-emerald-600"
                      }`}
                    />
                  )}
                  <span>Class {lvl}</span>
                  {subLabel && (
                    <span
                      className={`block text-[9px] font-semibold uppercase tracking-wide mt-0.5 ${
                        isSelected && isAssigned
                          ? "text-emerald-300"
                          : isSelected
                            ? "text-indigo-600"
                            : isAssigned
                              ? "text-emerald-700"
                              : "text-emerald-600"
                      }`}
                    >
                      {subLabel}
                      {isCalculatedBaseline && subLabel !== "Baseline"
                        ? " · Baseline"
                        : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2">
            {isClassSelectionDirty && (
              <span className="text-[11px] font-semibold text-indigo-700">
                {assignedClass
                  ? `Unsaved change: Class ${assignedClass} → Class ${minClass}`
                  : `Class ${minClass} selected — not yet assigned`}
              </span>
            )}
            {isClassSelectionDirty ? (
              <button
                type="button"
                onClick={() => handleAssignMinClass(minClass)}
                disabled={isPending || activeAction === "assign_min_class"}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {activeAction === "assign_min_class" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Award className="w-4 h-4" />
                )}
                <span>Confirm Class {minClass} Assignment</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Class {assignedClass} Assigned
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 6: PROJECT MILESTONES & AI REVIEW (DIRECT REJECTION WITHOUT MODAL) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" /> Project Milestones &
              Tranche Deliverables ({milestones.length})
            </h2>
            <p className="text-xs text-gray-500">
              Audit milestone deliverables and tranche completion (direct status
              updates).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pendingMilestonesCount > 0 ? (
              <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                {pendingMilestonesCount} Pending Milestone
                {pendingMilestonesCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All
                Milestones Decided
              </span>
            )}
          </div>
        </div>

        {milestones.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 italic bg-gray-50 rounded-2xl">
            No milestones configured for this project proposal.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {milestones.map((m) => {
              const ai = m.aiReview;
              const vStatus = m.verification_status || m.status || "pending";
              const isApproveLoading = activeAction === `approve_ms_${m.id}`;
              const isRejectLoading = activeAction === `reject_ms_${m.id}`;

              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-5 transition-all space-y-4 ${
                    vStatus === "approved" || vStatus === "completed"
                      ? "bg-emerald-50/30 border-emerald-200"
                      : vStatus === "rejected"
                        ? "bg-red-50/30 border-red-200"
                        : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase">
                          Milestone #{m.id}
                        </span>

                        {vStatus === "approved" || vStatus === "completed" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                            Approved
                          </span>
                        ) : vStatus === "rejected" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-600" />{" "}
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                            Review
                          </span>
                        )}

                        {m.target_amount && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold">
                            Tranche: {project.currency || "AED"}{" "}
                            {Number(m.target_amount).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-gray-900 text-sm">
                        {m.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {m.description || "No milestone description."}
                      </p>
                    </div>

                    {m.signedProofUrl && (
                      <a
                        href={m.signedProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors self-start sm:self-auto"
                      >
                        <span>View Proof Doc</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {ai ? (
                    <div className="bg-linear-to-r from-purple-50/80 to-indigo-50/80 border border-purple-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-purple-900">
                          <Sparkles className="w-4 h-4 text-purple-600" /> AI
                          Milestone Audit (Latest Review)
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              ai.suggested_outcome === "approved"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                            }`}
                          >
                            AI Suggestion: {ai.suggested_outcome}
                          </span>

                          <span className="text-xs font-black text-purple-900">
                            {ai.confidence_score
                              ? `${Math.round(Number(ai.confidence_score) * 100)}% Confidence`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-purple-950 font-medium leading-relaxed">
                        {ai.reasoning_summary}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-200 text-xs text-gray-500 rounded-xl">
                      No AI automated review record found for this milestone.
                    </div>
                  )}

                  {/* Direct Milestone Decision Controls (NO MODAL FOR REJECTION!) */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleDirectRejectMilestone(m.id)}
                      disabled={
                        !!activeAction || isApproveLoading || isRejectLoading
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isRejectLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Reject Milestone</span>
                    </button>

                    <button
                      onClick={() => handleApproveMilestone(m.id)}
                      disabled={
                        !!activeAction || isApproveLoading || isRejectLoading
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      {isApproveLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Approve Milestone</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 7: FINAL AUDITOR DISPOSITION CONTROLS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Final Auditor
              Project Disposition
            </h2>
            <p className="text-xs text-gray-500">
              Authorize campaign publication or return proposal to issuer.
            </p>
          </div>
        </div>

        {isFinalDecisionDisabled && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              {!isPendingReviewStatus
                ? "This project proposal has already been finalized."
                : "All project documents, media files, and milestones must be decided before completing final review."}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            onClick={() => setFinalDecisionModal("send_back")}
            disabled={isFinalDecisionDisabled || isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Send Back for Revision</span>
          </button>

          <button
            onClick={() => setFinalDecisionModal("reject")}
            disabled={isFinalDecisionDisabled || isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition-all disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-red-600" />
            <span>Reject Project</span>
          </button>

          <button
            onClick={handleApproveFinalProject}
            disabled={
              isFinalDecisionDisabled ||
              isPending ||
              activeAction === "final_approve"
            }
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-900/10 disabled:opacity-50"
          >
            {activeAction === "final_approve" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Approve &amp; Publish Project</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: REJECTION REASON PROMPT (DOCUMENTS AND MEDIA ONLY) */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-red-900">
                Reject{" "}
                {rejectingItem.type === "doc" ? "Document" : "Media File"}
              </h3>
              <button
                onClick={() => setRejectingItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Please specify the rejection reason for{" "}
              <strong>{rejectingItem.title}</strong>:
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Unrelated stock image or incorrect valuation figures."
              rows={3}
              className="w-full p-3 border border-red-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingItem(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectingItem.type === "doc") handleConfirmRejectDoc();
                  else if (rejectingItem.type === "media")
                    handleConfirmRejectMedia();
                }}
                disabled={!!activeAction || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {activeAction ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                  </span>
                ) : (
                  "Confirm Rejection"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RAW AI JSON MODEL OUTPUT */}
      {rawOutputItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#041d16] border border-[#059669]/40 rounded-3xl max-w-3xl w-full p-6 text-white space-y-4 shadow-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/40 pb-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-300">
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Raw Model Inspection Output ({rawOutputItem.title})</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setRawViewMode("rows")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
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
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    rawViewMode === "raw"
                      ? "bg-emerald-500/30 text-emerald-200 border-emerald-400"
                      : "bg-emerald-950/60 text-emerald-300/60 border-emerald-800/40"
                  }`}
                >
                  Raw String
                </button>
                <button
                  type="button"
                  onClick={() => setRawOutputItem(null)}
                  className="text-gray-400 hover:text-white transition-colors ml-2 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {(() => {
              const rawData =
                rawOutputItem.aiReview?.raw_model_output ||
                rawOutputItem.aiReview;
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

              if (
                rawViewMode === "raw" ||
                !parsedObj ||
                typeof parsedObj !== "object"
              ) {
                return (
                  <pre className="bg-[#02130e] p-4 rounded-2xl border border-emerald-900/60 font-mono text-[11px] text-emerald-300/90 overflow-x-auto max-h-96 leading-relaxed whitespace-pre-wrap">
                    {typeof rawData === "string"
                      ? rawData
                      : JSON.stringify(rawData, null, 2) ||
                        "No raw model output recorded."}
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
                              <span className="text-cyan-300 font-bold">
                                {value}
                              </span>
                            ) : Array.isArray(value) ? (
                              <div className="space-y-1 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/40">
                                <span className="text-emerald-400 font-bold">
                                  [
                                </span>
                                <div className="pl-3 space-y-1">
                                  {value.map((item, i) => (
                                    <div
                                      key={i}
                                      className="text-amber-200 text-[11px] leading-relaxed"
                                    >
                                      "{String(item)}"
                                      {i < value.length - 1 ? "," : ""}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-emerald-400 font-bold">
                                  ]
                                </span>
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
                            {!isLast && (
                              <span className="text-emerald-500 font-bold">
                                ,
                              </span>
                            )}
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
                onClick={() => setRawOutputItem(null)}
                className="px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-200 text-xs font-bold border border-emerald-800/50 cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FINAL DECISION NOTES PROMPT (SEND BACK / REJECT) */}
      {finalDecisionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900">
                {finalDecisionModal === "send_back"
                  ? "Send Back Project Proposal"
                  : "Reject Project Proposal"}
              </h3>
              <button
                onClick={() => setFinalDecisionModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Provide review notes explaining why the project proposal is being{" "}
              {finalDecisionModal === "send_back"
                ? "sent back for revision"
                : "rejected"}
              :
            </p>

            <textarea
              value={finalReviewNotes}
              onChange={(e) => setFinalReviewNotes(e.target.value)}
              placeholder="Enter review feedback and required corrections..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFinalDecisionModal(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinalActionModal}
                disabled={isPending || !finalReviewNotes.trim()}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-50 ${
                  finalDecisionModal === "send_back"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Confirm Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: NON-CLOSABLE CONFIRMATION MODAL */}
      {confirmationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 text-center shadow-2xl relative animate-in zoom-in-95">
            <div
              className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                confirmationModal.decision === "approve"
                  ? "bg-emerald-100 text-emerald-600"
                  : confirmationModal.decision === "send_back"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-red-100 text-red-600"
              }`}
            >
              {confirmationModal.decision === "approve" ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : confirmationModal.decision === "send_back" ? (
                <RotateCcw className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-[#064e3b]">
                Decision Confirmed!
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {confirmationModal.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push("/auditor-portal/project-creation")}
                className="w-full py-3 rounded-2xl bg-[#041d16] hover:bg-[#062c22] text-white text-xs font-extrabold transition-all shadow-md"
              >
                Return to Project Queue Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
