"use client";

import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  TrendingUp,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  CheckCircle2,
  Lock,
  ArrowLeft,
  DollarSign,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Wallet,
  Bell,
  Info,
  Loader2,
  ArrowRightLeft,
  Coins,
} from "lucide-react";
import {
  getRoiLabelForContract,
  getRoiHelperForContract,
} from "@/lib/validation/repaymentTermsSchema";
import { createPledge } from "@/app/actions/pledge";
import { checkInvestEligibility } from "@/app/actions/marketplace";
import { CLASS_CONFIG } from "@/app/constants/classConfig";
import {
  PLEDGE_DISCLOSURES,
  PLEDGE_TERMS_CHECKBOX_LABEL,
  MAX_OVERSUBSCRIPTION_PERCENT,
} from "@/app/constants/pledgeConfig";
import NotificationSettingsModal from "@/app/investor-portal/components/NotificationSettingsModal";

function formatUtcDate(dateString) {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
  } catch (e) {
    return null;
  }
}

function getBandColor(label) {
  if (label.includes("Class 1–2") || label.includes("Class 1-2")) return "bg-[#022c22]";
  if (label.includes("Class 3–4") || label.includes("Class 3-4")) return "bg-[#047857]";
  if (label.includes("Class 1") && !label.includes("–") && !label.includes("-")) return "bg-[#022c22]";
  if (label.includes("Class 1–") || label.includes("Class 1-") || label.includes("Class 2")) return "bg-[#064e3b]";
  if (label.includes("Class 5")) return "bg-[#0d9488]";
  return "bg-[#34d399]";
}

export default function ProjectDetailView({
  project,
  investor = null,
  investorClass = 10,
  eligibility = { allowed: false, eligible: false, code: null, message: null },
  viewerRole = "investor",
  classBandSubscription = null,
  conversionDemand = null,
}) {
  const [activeMediaOverride, setActiveMedia] = useState(null);
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState(() => (Number(project?.min_investment_floor) || 0).toString());
  const [customConversionUnits, setCustomConversionUnits] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmittingPledge, setIsSubmittingPledge] = useState(false);
  const [pledgeError, setPledgeError] = useState("");
  const [pledgeSuccess, setPledgeSuccess] = useState(false);
  const [pledgeResultData, setPledgeResultData] = useState(null);
  const [liveEligibility, setLiveEligibility] = useState(null);

  if (!project) return null;

  const effectiveEligibility = liveEligibility || eligibility || { allowed: false, eligible: false };
  const isEligible = Boolean(
    effectiveEligibility.allowed ?? effectiveEligibility.eligible
  );
  const eligibilityMessage =
    effectiveEligibility.message || effectiveEligibility.reason || null;

  const isIssuerPreview = viewerRole === "issuer_preview";
  const currency = project.currency || "USD";
  const targetGoal = Number(project.target_goal) || 0;
  const liveRaised = Number(project.live_raised_amount) || 0;
  const rawPercent = targetGoal > 0 ? (liveRaised / targetGoal) * 100 : 0;
  const progressPercent = rawPercent.toFixed(1);
  const clampedBarPercent = Math.min(rawPercent, 100).toFixed(1);
  const minFloor = Number(project.min_investment_floor) || 0;
  const contractType = String(
    project.sharia_contract_type || project.shariah_contract_type || "",
  ).toLowerCase().trim();
  const isSpvEquity = contractType === "spv_equity";
  const unitType = String(project.unit_type || "").toLowerCase().trim();
  const isShares = unitType === "shares" || (isSpvEquity && unitType !== "sukuk");
  const roiLabel = getRoiLabelForContract(contractType);
  const roiHelper = getRoiHelperForContract(contractType);
  const contractTerms = (() => {
    if (!project?.contract_terms) return null;
    if (typeof project.contract_terms === "object") return project.contract_terms;
    try {
      return JSON.parse(project.contract_terms);
    } catch {
      return null;
    }
  })();

  const isPendingReview = project.status === "pending_review";
  const isClosing = project.status === "closing";
  const isFunded = project.status === "funded";
  const isFailed = project.status === "failed";
  const isCompleted = project.status === "completed";
  const isCampaignClosed = isClosing || isFunded || isFailed || isCompleted;

  const allocatedTotal =
    project.allocated_total != null ? Number(project.allocated_total) : liveRaised;
  const subscribedAtClose =
    project.subscribed_total_at_close != null
      ? Number(project.subscribed_total_at_close)
      : liveRaised;
  const subscribedAtClosePct =
    targetGoal > 0
      ? Number(((subscribedAtClose / targetGoal) * 100).toFixed(1))
      : 0;

  const rawSpv = project.spv_details;
  const spvDetails = Array.isArray(rawSpv) ? rawSpv[0] : rawSpv;

  const hasConversionClause =
    !isSpvEquity && Boolean(spvDetails?.conversion_enabled);
  const isClass1To4 = investorClass >= 1 && investorClass <= 4;
  const totalSharesAuthorized =
    Number(spvDetails?.total_shares_authorized) || 0;
  const conversionRatioShares =
    Number(spvDetails?.conversion_ratio_shares) || 1;
  const totalConvertibleUnits =
    conversionRatioShares > 0
      ? Math.floor(totalSharesAuthorized / conversionRatioShares)
      : 0;
  const pledgedConvertedUnits = Number(project.live_conversion_units) || 0;
  const conversionPercent =
    totalConvertibleUnits > 0
      ? Math.min(
          (pledgedConvertedUnits / totalConvertibleUnits) * 100,
          100
        ).toFixed(1)
      : 0;

  const classCapMap = { 1: Infinity, 2: 1000000, 3: 500000, 4: 250000 };
  const classConversionCap = classCapMap[investorClass] || 0;

  // Filter approved milestones
  const approvedMilestonesOnly = (project.project_milestones || []).filter(
    (m) => {
      if (!m) return false;
      if (m.milestone_source === "system") return true;
      const rawStatus =
        m.mileston_verification_status ??
        m.milestone_verification_status ??
        m.verification_status;
      if (rawStatus === null || rawStatus === undefined) return true;
      const vStatus = String(rawStatus).trim().toLowerCase();
      if (vStatus === "pending" || vStatus === "rejected") return false;
      return true;
    }
  );

  const sortedMilestones = [...approvedMilestonesOnly].sort((a, b) => {
    if (!a.target_date && !b.target_date) return 0;
    if (!a.target_date) return -1;
    if (!b.target_date) return 1;
    return new Date(a.target_date) - new Date(b.target_date);
  });

  // Media Gallery setup
  const allMedia = [];
  if (project.cover_image_url) {
    allMedia.push({
      id: "cover",
      media_url: project.cover_image_url,
      url: project.cover_image_url,
      caption: "Cover Image",
    });
  }
  if (project.project_media && Array.isArray(project.project_media)) {
    project.project_media.forEach((m, idx) => {
      const srcUrl = m.media_url || m.url;
      if (srcUrl && srcUrl !== project.cover_image_url) {
        allMedia.push({
          ...m,
          media_url: srcUrl,
          url: srcUrl,
          caption: m.caption || `Media ${idx + 1}`,
        });
      }
    });
  }

  const activeMedia = activeMediaOverride || allMedia[0] || null;

  // Class config & Fee calculations
  const classCfg = CLASS_CONFIG[investorClass] || CLASS_CONFIG[10];
  const feePercent = classCfg.feePercent || 2.5;
  const maxPledge = classCfg.maxPledge;

  const parsedPledgeAmount = parseFloat(pledgeAmount) || 0;
  const computedFeeAmount = (parsedPledgeAmount * feePercent) / 100;
  const totalWalletDeduction = parsedPledgeAmount + computedFeeAmount;
  const currentWalletBalance = Number(investor?.wallet_balance || 0);
  const hasEnoughBalance = currentWalletBalance >= totalWalletDeduction;
  const unitPrice = Number(project.unit_price) || 0;
  const estimatedUnits =
    unitPrice > 0 ? Math.floor(parsedPledgeAmount / unitPrice) : 0;
  const maxEligibleConversionUnits =
    hasConversionClause && isClass1To4 && unitPrice > 0
      ? Math.floor(Math.min(parsedPledgeAmount, classConversionCap) / unitPrice)
      : 0;
  const effectiveConversionUnits =
    hasConversionClause && isClass1To4
      ? customConversionUnits !== null && customConversionUnits !== ""
        ? Math.max(
            0,
            Math.min(Number(customConversionUnits), maxEligibleConversionUnits)
          )
        : maxEligibleConversionUnits
      : 0;
  const isExceedingMaxPledge =
    maxPledge !== Infinity && parsedPledgeAmount > maxPledge;
  const isBelowMinFloor = parsedPledgeAmount < minFloor;

  // 150% Oversubscription Ceiling calculation
  const projectCapacity =
    Number(project.hard_cap) || Number(project.target_goal) || 0;
  const maxOversubscriptionCeiling =
    projectCapacity * ((MAX_OVERSUBSCRIPTION_PERCENT || 150) / 100);
  const remainingIntakeCapacity = Math.max(
    0,
    maxOversubscriptionCeiling - liveRaised
  );
  const isExceedingCeiling =
    maxOversubscriptionCeiling > 0 &&
    parsedPledgeAmount > 0 &&
    liveRaised + parsedPledgeAmount > maxOversubscriptionCeiling;

  // Sanitized description
  const rawDescription =
    project.full_description || project.description || project.summary || "";
  const sanitizedDescription = DOMPurify.sanitize(rawDescription);

  const docTypeLabels = {
    pitch_deck: "Pitch Deck Presentation",
    balance_sheet: "Balance Sheet & Financials",
    valuation_report: "Independent Valuation Report",
    cap_table: "Capitalization Table",
  };

  const handleOpenPledgeModal = async () => {
    setPledgeError("");
    setIsPledgeModalOpen(true);
    try {
      const fresh = await checkInvestEligibility(
        project,
        investorClass,
        investor?.id
      );
      if (fresh) {
        setLiveEligibility(fresh);
        const allowed = Boolean(fresh.allowed ?? fresh.eligible);
        if (!allowed) {
          setPledgeError(
            fresh.message ||
              fresh.reason ||
              "You are not eligible to invest in this project."
          );
        }
      }
    } catch {
      // Fall back to server-rendered eligibility prop and submit-time check
    }
  };

  const handlePledgeSubmit = async (e) => {
    e.preventDefault();
    setPledgeError("");

    if (!acceptedTerms) {
      setPledgeError("You must read and accept the subscription terms to submit a pledge.");
      return;
    }

    if (!hasEnoughBalance) {
      setPledgeError(
        `Insufficient wallet balance. You need ${currency} ${totalWalletDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} but have ${currency} ${currentWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
      );
      return;
    }

    if (isExceedingMaxPledge) {
      setPledgeError(
        `Amount exceeds your Class ${investorClass} limit of ${currency} ${maxPledge.toLocaleString()}.`
      );
      return;
    }

    if (isExceedingCeiling) {
      setPledgeError(
        `This pledge exceeds the 150% maximum subscription ceiling (${currency} ${maxOversubscriptionCeiling.toLocaleString()}). Maximum remaining intake is ${currency} ${remainingIntakeCapacity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
      );
      return;
    }

    setIsSubmittingPledge(true);

    try {
      const res = await createPledge({
        projectId: project.id,
        slug: project.slug,
        amount: pledgeAmount,
        acceptedTerms,
        requestedConversionUnits:
          hasConversionClause && isClass1To4 ? effectiveConversionUnits : undefined,
      });

      if (!res.success) {
        setPledgeError(res.message || res.error || "Failed to process pledge.");
      } else {
        setPledgeSuccess(true);
        setPledgeResultData(res);
      }
    } catch (err) {
      setPledgeError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmittingPledge(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf7] pb-24 text-[#064e3b]">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          {isIssuerPreview ? (
            <Link
              href={`/issuer-portal/projects/${project.slug || project.id}/manage`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#064e3b] hover:text-[#059669] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Project Management
            </Link>
          ) : (
            <Link
              href="/investor-portal/marketplace"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#064e3b] hover:text-[#059669] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Marketplace
            </Link>
          )}

          <div className="flex items-center gap-3">
            {isIssuerPreview ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs shadow-2xs">
                <Eye className="w-3.5 h-3.5 text-amber-700" /> Issuer Preview Mode
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] font-semibold text-xs transition-colors border border-emerald-300/80 shadow-2xs cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-[#059669]" /> Enable Notifications
                </button>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 font-bold text-xs">
                  Class {investorClass} Access
                </span>
              </>
            )}
            {isPendingReview && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white font-bold text-xs shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5" /> Pre-Audit Draft
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* CAMPAIGN CLOSING / FUNDED / FAILED BANNER */}
        {isClosing && (
          <div className="rounded-2xl p-4 sm:p-5 bg-amber-50 border border-amber-300 text-amber-900 font-bold text-sm flex items-center gap-3 shadow-xs">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Campaign closed. Allocation in progress.</span>
          </div>
        )}
        {isFunded && (
          <div className="rounded-2xl p-4 sm:p-5 bg-emerald-50 border border-emerald-300 text-[#064e3b] font-bold text-sm flex items-center gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
            <span>
              Funded: {currency} {allocatedTotal.toLocaleString()} of {targetGoal.toLocaleString()} target ({subscribedAtClosePct}% subscribed at close).
            </span>
          </div>
        )}
        {isFailed && (
          <div className="rounded-2xl p-4 sm:p-5 bg-rose-50 border border-rose-300 text-rose-900 font-bold text-sm flex items-center gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>This campaign did not reach its minimum and closed without funding.</span>
          </div>
        )}

        {/* SECTION 1: HERO & STATS BANNER */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-gray-100 pb-8">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {project.sharia_contract_type && (
                  <span className="px-3 py-1 rounded-full bg-slate-900 text-emerald-400 font-mono text-xs uppercase tracking-wider font-semibold">
                    {project.sharia_contract_type.replace("_", " ")}
                  </span>
                )}
                {isPendingReview ? (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />{" "}
                    Pre-Audit / Unreviewed
                  </span>
                ) : isClosing ? (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />{" "}
                    Closing — Allocation in Progress
                  </span>
                ) : isFunded ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                    Funded
                  </span>
                ) : isFailed ? (
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-xs border border-rose-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />{" "}
                    Campaign Failed
                  </span>
                ) : isCompleted ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                    Completed
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                    Campaign Live
                  </span>
                )}
                {hasConversionClause && (
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Conversion Available
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-[#064e3b] leading-tight">
                {project.title}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {project.summary}
              </p>
            </div>

            {/* Quick Action Badge */}
            <div className="bg-[#fcfaf7] p-4 rounded-2xl border border-emerald-900/10 min-w-[240px] text-right space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Target Allocation Goal
              </span>
              <div className="text-2xl font-black text-[#064e3b]">
                {currency} {targetGoal.toLocaleString()}
              </div>
              <div className="text-xs text-[#059669] font-bold">
                {isFunded ? (
                  <>
                    Funded ({currency} {allocatedTotal.toLocaleString()}) • {subscribedAtClosePct}% Subscribed
                  </>
                ) : (
                  <>
                    {progressPercent}% Subscribed ({currency}{" "}
                    {liveRaised.toLocaleString()})
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-gray-100">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                {isFunded ? "Allocated Total" : "Subscribed so far"}
              </span>
              <div className="text-lg sm:text-xl font-bold text-[#064e3b] mt-1">
                {currency} {(isFunded ? allocatedTotal : liveRaised).toLocaleString()}
              </div>
              <span className="text-[11px] text-gray-500">
                {isFunded
                  ? `Subscribed at close: ${currency} ${subscribedAtClose.toLocaleString()}`
                  : "From active pledge requests"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-gray-100">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Minimum Ticket Floor
              </span>
              <div className="text-lg sm:text-xl font-bold text-[#064e3b] mt-1">
                {currency} {minFloor.toLocaleString()}
              </div>
              <span className="text-[11px] text-gray-500">
                Per investor pledge
              </span>
            </div>

            {/* ROI BADGE - HIDDEN FOR SPV EQUITY */}
            {!isSpvEquity && project.expected_roi_percent != null && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#059669]" /> {roiLabel}
                </span>
                <div className="text-lg sm:text-xl font-black text-[#059669] mt-1 flex items-baseline gap-1.5 flex-wrap">
                  <span>{project.expected_roi_percent}%</span>
                  {contractType === "mudarabah" && (
                    <span className="text-xs font-semibold text-emerald-700/90">(Not guaranteed)</span>
                  )}
                </div>
                <span className="text-[11px] text-emerald-700/80">
                  {roiHelper || "Annualized yield"}
                </span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-gray-100">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" /> Campaign Deadline (UTC)
              </span>
              <div className="text-sm sm:text-base font-bold text-[#064e3b] mt-1">
                {project.campaign_end_date
                  ? formatUtcDate(project.campaign_end_date) || "N/A"
                  : "N/A"}
              </div>
              <span className="text-[11px] text-gray-500">
                {project.tenor_months || project.tenure_months
                  ? `${project.tenor_months || project.tenure_months}m tenor`
                  : "Target close date"}
              </span>
            </div>
          </div>

          {/* CLASS BAND SUBSCRIPTION BAR */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between text-xs font-semibold gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-bold">
                    {/* NOTE: switches to 'Funded' post-allocation */}
                    Subscribed so far
                  </span>
                  {rawPercent > 100 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider border border-amber-300">
                      Oversubscribed
                    </span>
                  )}
                </div>
                <span className="text-[#064e3b] font-extrabold">
                  {progressPercent}% Subscribed ({currency} {liveRaised.toLocaleString()} / {targetGoal.toLocaleString()})
                </span>
              </div>

              {classBandSubscription?.bands && classBandSubscription.bands.length > 0 ? (
                <div className="space-y-3">
                  {/* Segmented Bar */}
                  {(() => {
                    const totalPct = classBandSubscription.totalPercent || rawPercent;
                    const isFullyFundedOrMore = totalPct >= 100;
                    const softCapPct = classBandSubscription.softCapPercent;

                    return (
                      <div className="relative w-full bg-gray-100 h-5 rounded-full overflow-visible my-5 flex border border-gray-200">
                        {classBandSubscription.bands.map((band, idx) => {
                          const segWidth = isFullyFundedOrMore
                            ? (band.amount != null && classBandSubscription.totalSubscribed > 0
                                ? (band.amount / classBandSubscription.totalSubscribed) * 100
                                : (band.percent / totalPct) * 100)
                            : (band.percent / 100) * 100;

                          if (segWidth <= 0) return null;
                          return (
                            <div
                              key={idx}
                              className={`${getBandColor(band.label)} h-full transition-all duration-500 relative ${
                                band.isViewerBand ? "ring-2 ring-amber-400 ring-offset-1 z-10" : ""
                              } ${idx === 0 ? "rounded-l-full" : ""} ${
                                idx === classBandSubscription.bands.length - 1 ? "rounded-r-full" : ""
                              }`}
                              style={{ width: `${segWidth}%` }}
                              title={`${band.label}: ${band.percent}%`}
                            />
                          );
                        })}

                        {/* 100% Target / Capacity Marker (only when oversubscribed > 100%) */}
                        {totalPct > 100 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-20 pointer-events-none"
                            style={{ left: `${(100 / totalPct) * 100}%` }}
                            title="100% Target Goal"
                          >
                            <div className="absolute -top-5 -translate-x-1/2 bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-extrabold whitespace-nowrap shadow-xs">
                              100% Target
                            </div>
                          </div>
                        )}

                        {/* Soft Cap Dashed Tick */}
                        {softCapPct > 0 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 border-r border-dashed border-amber-600 z-20 pointer-events-none"
                            style={{
                              left: `${isFullyFundedOrMore ? (softCapPct / totalPct) * 100 : softCapPct}%`,
                            }}
                            title={`Soft Cap: ${currency} ${Number(project.soft_cap || 0).toLocaleString()}`}
                          >
                            <div className="absolute -bottom-5 -translate-x-1/2 bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.5 rounded text-[8px] font-extrabold whitespace-nowrap">
                              Soft Cap
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Priority Color Legend */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1">
                    {classBandSubscription.bands.map((band, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span
                          className={`w-3 h-3 rounded-full ${getBandColor(band.label)} ${
                            band.isViewerBand ? "ring-2 ring-amber-400" : ""
                          }`}
                        />
                        <span
                          className={`text-gray-700 font-medium ${
                            band.isViewerBand ? "font-bold text-[#064e3b]" : ""
                          }`}
                        >
                          {band.label} ({band.percent}%){band.isViewerBand ? " • Your class" : ""}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Viewer Callout Box */}
                  {(() => {
                    const viewerBand = classBandSubscription.bands.find((b) => b.isViewerBand);
                    const viewerCumulative = classBandSubscription.viewerCumulativePercent;
                    const viewerBandPercent = viewerBand ? viewerBand.percent : 0;
                    const viewerBandStart = viewerCumulative - viewerBandPercent;

                    let callout = "";
                    if (viewerCumulative <= 100) {
                      callout =
                        "At current subscription levels, your class band is projected to be fully allocated at campaign close.";
                    } else if (viewerBandStart < 100 && viewerCumulative > 100) {
                      callout =
                        "At current subscription levels, your class band may be partially allocated. Allocation prioritises larger pledges, then earlier pledges.";
                    } else {
                      callout =
                        "At current subscription levels, pledges in your class are not projected to be allocated unless higher-priority pledges are cancelled before close.";
                    }

                    return (
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-[#064e3b] flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{callout}</span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Fallback simple bar if band data not available */
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#059669] to-[#047857] rounded-full transition-all duration-700"
                    style={{ width: `${clampedBarPercent}%` }}
                  />
                </div>
              )}
            </div>

            {/* CONVERSION DEMAND BAR (CLASSES 1-4 ONLY) */}
            {hasConversionClause &&
              isClass1To4 &&
              totalConvertibleUnits > 0 && (
                <div className="space-y-2.5 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap items-center justify-between text-xs font-semibold gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
                      <span className="text-[#064e3b] font-bold">Equity Conversion Pool Demand</span>
                      <span className="text-[11px] text-gray-400 font-normal">(Class 1–4 Option)</span>
                      {conversionDemand?.isOversubscribed ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider border border-amber-300">
                          Oversubscribed
                        </span>
                      ) : (
                        <span className="text-gray-500 font-normal">
                          ({conversionDemand?.totalDemandPercent ?? conversionPercent}%)
                        </span>
                      )}
                    </div>
                    <span className="text-[#064e3b] font-bold">
                      {(conversionDemand?.totalDemand ?? pledgedConvertedUnits).toLocaleString()} / {totalConvertibleUnits.toLocaleString()} convertible units requested
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-normal">
                    Tracks investor requests to convert debt Sukuk into company equity shares. Allocation of conversion units is finalized at campaign close by investor class priority.
                  </p>

                  <div className="relative w-full h-3 bg-emerald-50 rounded-full overflow-hidden border border-emerald-100">
                    <div
                      className="h-full bg-gradient-to-r from-[#059669] to-[#047857] rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(conversionDemand?.totalDemandPercent ?? conversionPercent, 100)}%`,
                      }}
                    />
                    {conversionDemand?.viewerPriorityPercent != null && conversionDemand.viewerPriorityPercent > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                        style={{
                          left: `${Math.min(conversionDemand.viewerPriorityPercent, 100)}%`,
                        }}
                        title={`Pledges at or above your class: ${conversionDemand.viewerPriorityPercent}% of conversion pool`}
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap justify-between items-center text-[11px] text-gray-500 pt-0.5 gap-2">
                    <span>
                      {conversionDemand?.viewerPriorityPercent != null && conversionDemand.viewerPriorityPercent > 0 ? (
                        <>
                          Pledges at or above your class:{" "}
                          <strong className="text-[#064e3b]">
                            {conversionDemand.viewerPriorityPercent}%
                          </strong>{" "}
                          of conversion pool
                        </>
                      ) : (
                        <span>Conversion pool capacity: {totalConvertibleUnits.toLocaleString()} units</span>
                      )}
                    </span>
                    {conversionDemand?.isOversubscribed ? (
                      <span className="text-amber-800 font-bold">
                        Conversion pool oversubscribed — allocated by class priority at close
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        Final conversion units allocated at campaign close
                      </span>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* SECTION 2: INTERACTIVE MEDIA GALLERY */}
        {allMedia.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-xl font-extrabold text-[#064e3b] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#059669]" /> Project Media & Highlights
            </h2>

            {/* Main Stage */}
            <div className="relative aspect-video w-full rounded-2xl bg-gray-900 overflow-hidden border border-gray-200">
              {activeMedia ? (
                <img
                  src={activeMedia.media_url}
                  alt={activeMedia.caption || project.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No media available
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {allMedia.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                {allMedia.map((m, idx) => (
                  <button
                    key={m.id || idx}
                    onClick={() => setActiveMedia(m)}
                    className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      activeMedia?.media_url === m.media_url
                        ? "border-[#059669] ring-2 ring-[#059669]/30 scale-105"
                        : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={m.media_url}
                      alt={m.caption || `Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: SANITIZED DESCRIPTION */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-extrabold text-[#064e3b] border-b border-gray-100 pb-4">
            Project Overview & Investment Case
          </h2>
          <div
            className="prose max-w-none text-gray-700 text-sm sm:text-base leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{
              __html:
                sanitizedDescription ||
                "<p>No detailed description provided.</p>",
            }}
          />
        </div>

        {/* SECTION 4: FINANCIAL TERMS PANEL */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-extrabold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-4">
            <DollarSign className="w-5 h-5 text-[#059669]" /> Financial & Offer Terms
          </h2>

          <div
            className={`grid grid-cols-1 ${
              isSpvEquity ? "md:grid-cols-2" : "md:grid-cols-3"
            } gap-6 text-xs`}
          >
            <div className="space-y-4 bg-[#fcfaf7] p-5 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-sm text-[#064e3b]">Funding Targets</h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Target Goal:</span>
                  <span className="font-bold text-[#064e3b]">
                    {currency} {targetGoal.toLocaleString()}
                  </span>
                </div>
                {project.soft_cap != null && (
                  <div className="flex justify-between">
                    <span>Soft Cap:</span>
                    <span className="font-semibold text-gray-800">
                      {currency} {Number(project.soft_cap).toLocaleString()}
                    </span>
                  </div>
                )}
                {project.hard_cap != null && (
                  <div className="flex justify-between">
                    <span>Hard Cap:</span>
                    <span className="font-semibold text-gray-800">
                      {currency} {Number(project.hard_cap).toLocaleString()}
                    </span>
                  </div>
                )}
                {project.campaign_end_date &&
                  formatUtcDate(project.campaign_end_date) && (
                    <div className="flex justify-between border-t pt-2 border-gray-200">
                      <span>Campaign Deadline (UTC):</span>
                      <span className="font-bold text-[#064e3b]">
                        {formatUtcDate(project.campaign_end_date)}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <div className="space-y-4 bg-[#fcfaf7] p-5 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-sm text-[#064e3b]">Unit Terms</h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>{isShares ? "Share Price:" : "Unit / Sukuk Price:"}</span>
                  <span className="font-bold text-[#064e3b]">
                    {currency}{" "}
                    {Number(project.unit_price || 0).toLocaleString()}
                  </span>
                </div>
                {project.unit_type && (
                  <div className="flex justify-between">
                    <span>Unit Type:</span>
                    <span className="font-semibold text-gray-800 capitalize">
                      {project.unit_type}
                    </span>
                  </div>
                )}
                {project.total_authorized_units != null && (
                  <div className="flex justify-between">
                    <span>Total Authorized Units:</span>
                    <span className="font-semibold text-gray-800">
                      {Number(project.total_authorized_units).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {!isSpvEquity && (
              <div className="space-y-4 bg-[#fcfaf7] p-5 rounded-2xl border border-gray-100">
                <h3 className="font-bold text-sm text-[#064e3b]">Returns & Frequency</h3>
                <div className="space-y-2 text-gray-600">
                  {project.expected_roi_percent != null && (
                    <div className="flex justify-between">
                      <span>{roiLabel}:</span>
                      <span className="font-bold text-[#059669]">
                        {project.expected_roi_percent}%
                        {contractType === "mudarabah" && (
                          <span className="ml-1 text-[11px] font-normal text-emerald-700/80">
                            (Not guaranteed)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {project.profit_distribution_frequency && (
                    <div className="flex justify-between">
                      <span>Distribution Frequency:</span>
                      <span className="font-semibold text-gray-800 capitalize">
                        {project.profit_distribution_frequency}
                      </span>
                    </div>
                  )}
                  {project.spv_details?.total_cost_authorized != null && (
                    <div className="flex justify-between border-t pt-2 border-gray-200">
                      <span>Total Cost Authorized:</span>
                      <span className="font-bold text-[#064e3b]">
                        {currency}{" "}
                        {Number(
                          project.spv_details.total_cost_authorized,
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* REPAYMENT TERMS CARD */}
          <div className="bg-[#fcfaf7] p-6 rounded-2xl border border-gray-100 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-gray-200">
              <h3 className="font-bold text-sm text-[#064e3b]">
                {isSpvEquity ? "Equity Structure & Exit Terms" : "Contract Repayment Terms"}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#064e3b] font-bold text-[10px] uppercase tracking-wider">
                {contractType ? contractType.replace("_", " ") : "Terms"}
              </span>
            </div>

            {contractType === "murabaha" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Investment Term
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {project.tenor_months ? `${project.tenor_months} months` : "—"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Payment Frequency
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900 capitalize">
                    {contractTerms?.payment_frequency ? contractTerms.payment_frequency.replace("_", " ") : "—"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Principal Repayment
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {contractTerms?.principal_repayment === "with_instalments"
                      ? "With instalments"
                      : contractTerms?.principal_repayment === "at_maturity"
                        ? "At maturity"
                        : "—"}
                  </div>
                </div>
                {contractTerms?.asset_description && (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1.5">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                      Financed Asset Description
                    </span>
                    <p className="font-medium text-gray-900 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {contractTerms.asset_description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {contractType === "ijara" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Lease Term
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {project.tenor_months ? `${project.tenor_months} months` : "—"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Rental Payment Frequency
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900 capitalize">
                    {contractTerms?.payment_frequency ? contractTerms.payment_frequency.replace("_", " ") : "—"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Asset Value
                  </span>
                  <div className="text-base sm:text-lg font-bold text-[#064e3b]">
                    {contractTerms?.asset_value != null
                      ? `${currency} ${Number(contractTerms.asset_value).toLocaleString()}`
                      : "—"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    End of Term Outcome
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {contractTerms?.end_of_term === "sale_to_issuer"
                      ? "Sale to issuer"
                      : contractTerms?.end_of_term === "sale_to_third_party"
                        ? "Sale to third party"
                        : contractTerms?.end_of_term === "return_asset"
                          ? "Return asset"
                          : "—"}
                  </div>
                </div>
                {contractTerms?.end_of_term === "sale_to_issuer" && contractTerms?.end_of_term_price != null && (
                  <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                      End of Term Purchase Price
                    </span>
                    <div className="text-base sm:text-lg font-bold text-[#064e3b]">
                      {currency} {Number(contractTerms.end_of_term_price).toLocaleString()}
                    </div>
                  </div>
                )}
                {contractTerms?.asset_description && (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-4 p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1.5">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                      Leased Asset Description
                    </span>
                    <p className="font-medium text-gray-900 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {contractTerms.asset_description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {contractType === "mudarabah" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Investment Term
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {project.tenor_months ? `${project.tenor_months} months` : "—"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Profit Reporting Frequency
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900 capitalize">
                    {contractTerms?.profit_reporting_frequency
                      ? contractTerms.profit_reporting_frequency.replace("_", " ")
                      : "—"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Investor Profit Share
                  </span>
                  <div className="text-base sm:text-lg font-bold text-[#059669]">
                    {contractTerms?.investor_profit_share_percent != null
                      ? `${contractTerms.investor_profit_share_percent}%`
                      : "—"}
                    <span className="ml-1.5 text-[11px] font-normal text-emerald-700/80">
                      (Not guaranteed)
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Issuer Profit Share
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-700">
                    {contractTerms?.investor_profit_share_percent != null
                      ? `${100 - Number(contractTerms.investor_profit_share_percent)}%`
                      : "—"}
                  </div>
                </div>
              </div>
            )}

            {contractType === "spv_equity" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Existing Shares Outstanding
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {contractTerms?.existing_shares_outstanding != null
                      ? Number(contractTerms.existing_shares_outstanding).toLocaleString()
                      : "0"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Voting Rights
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {contractTerms?.voting_rights ? "Voting shares included" : "Non-voting shares"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Dividend Policy
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {contractTerms?.dividend_policy === "none_planned"
                      ? "None planned"
                      : contractTerms?.dividend_policy === "discretionary"
                        ? "Discretionary"
                        : contractTerms?.dividend_policy === "target_payout"
                          ? "Target payout"
                          : "None specified"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Target Exit Horizon
                  </span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {contractTerms?.target_exit_horizon_years
                      ? `${contractTerms.target_exit_horizon_years} years`
                      : "Not specified"}
                    {contractTerms?.target_exit_horizon_years && (
                      <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                        (Not guaranteed)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!["murabaha", "ijara", "mudarabah", "spv_equity"].includes(contractType) && (
              <p className="text-gray-500 italic">No specific repayment terms configured for this project structure.</p>
            )}
          </div>
        </div>

        {/* SECTION 5: STRUCTURE & COMPLIANCE PANEL */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-extrabold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-4">
            <ShieldCheck className="w-5 h-5 text-[#059669]" /> SPV Structure & Sharia Compliance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {spvDetails ? (
              <div className="bg-[#fcfaf7] p-6 rounded-2xl border border-gray-100 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b pb-3 border-gray-200">
                  <span className="font-bold text-sm text-[#064e3b]">Verified SPV Entity</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Active Entity
                  </span>
                </div>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>SPV Legal Name:</span>
                    <span className="font-bold text-gray-900">
                      {spvDetails.spv_legal_name || spvDetails.spv_name || "N/A"}
                    </span>
                  </div>
                  {spvDetails.registration_authority && (
                    <div className="flex justify-between">
                      <span>Registration Authority:</span>
                      <span className="font-semibold text-gray-800">
                        {spvDetails.registration_authority}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#fcfaf7] p-6 rounded-2xl border border-gray-100 flex items-center justify-center text-xs text-gray-500">
                SPV details structure pending confirmation.
              </div>
            )}

            <div className="bg-[#fcfaf7] p-6 rounded-2xl border border-gray-100 space-y-4 text-xs flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#059669] font-bold text-sm">
                  <Sparkles className="w-4 h-4" /> Sharia Compliance Audit
                </div>
                <p className="text-gray-600 leading-relaxed">
                  This campaign is structured in adherence to Islamic financial principles under the{" "}
                  <strong className="text-[#064e3b] font-semibold">
                    {project.sharia_contract_type || "Sharia"}
                  </strong>{" "}
                  framework.
                </p>

                <div className="pt-2">
                  {project.shariah_compliance_status === "verified" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Audit Status: Verified
                    </span>
                  )}
                  {project.shariah_compliance_status === "pending" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Audit Status: Pending Verification
                    </span>
                  )}
                  {project.shariah_compliance_status === "rejected" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 text-red-800 font-bold text-xs border border-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-600" /> Audit Status: Rejected
                    </span>
                  )}
                  {!project.shariah_compliance_status && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs">
                      Audit Status: Pending
                    </span>
                  )}
                </div>
              </div>

              {project.shariah_compliance_status === "verified" &&
                project.shariah_certificate_doc?.signedUrl && (
                  <a
                    href={project.shariah_certificate_doc.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all shadow-sm mt-3"
                  >
                    <Eye className="w-4 h-4 text-emerald-400" /> View Sharia Certificate
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                )}
            </div>
          </div>
        </div>

        {/* SECTION 5B: EQUITY CONVERSION DETAILS CARD (CLASSES 1-4 ONLY) */}
        {hasConversionClause && isClass1To4 && (
          <div className="bg-gradient-to-br from-[#064e3b]/5 via-emerald-950/5 to-emerald-900/10 rounded-3xl p-6 sm:p-8 border border-emerald-900/15 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/10 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#064e3b] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#059669]" /> Equity Conversion Privileges & Terms
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Exclusive conversion parameters and legal clauses for Class {investorClass} investors.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#064e3b] text-white font-bold text-xs shadow-xs shrink-0 self-start sm:self-auto">
                Class {investorClass} Privilege Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Conversion Trigger Price
                </span>
                <div className="text-lg font-bold text-[#064e3b]">
                  {spvDetails?.conversion_trigger_value != null
                    ? `${currency} ${Number(spvDetails.conversion_trigger_value).toLocaleString()}`
                    : spvDetails?.conversion_trigger_price != null
                      ? `${currency} ${Number(spvDetails.conversion_trigger_price).toLocaleString()}`
                      : "N/A"}
                </div>
                <span className="text-[10px] text-gray-400">Target price per equity share</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Conversion Ratio
                </span>
                <div className="text-lg font-bold text-[#064e3b]">
                  1 Unit = {spvDetails?.conversion_ratio_shares || 1} Shares
                </div>
                <span className="text-[10px] text-gray-400">Multiplier per Sukuk unit</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Conversion Cutoff (UTC)
                </span>
                <div className="text-sm font-bold text-[#064e3b]">
                  {spvDetails?.conversion_deadline
                    ? formatUtcDate(spvDetails.conversion_deadline) || "N/A"
                    : "N/A"}
                </div>
                <span className="text-[10px] text-gray-400">Strict execution deadline</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Class {investorClass} Value Cap
                </span>
                <div className="text-lg font-bold text-[#059669]">
                  {investorClass === 1
                    ? "Unlimited"
                    : `AED ${classConversionCap.toLocaleString()}`}
                </div>
                <span className="text-[10px] text-gray-400">Max convertible pledge limit</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-100/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#064e3b]">
                <span>Equity Conversion Pool Demand</span>
                <span>
                  {(conversionDemand?.totalDemand ?? pledgedConvertedUnits).toLocaleString()} /{" "}
                  {totalConvertibleUnits.toLocaleString()} convertible units ({conversionDemand?.totalDemandPercent ?? conversionPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#059669] to-[#047857] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(conversionDemand?.totalDemandPercent ?? conversionPercent, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Conversion pool units are requested at pledge time and allocated by investor class priority when the campaign closes. Units that convert to shares stop receiving scheduled payments from the conversion date.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 6: PRIVATE DOCUMENTS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#064e3b] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#059669]" /> Private Investor Documents
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Restricted access documents available to verified investors.
              </p>
            </div>
          </div>

          {project.project_docs && project.project_docs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.project_docs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-[#fcfaf7] border border-gray-200/60 flex items-center justify-between gap-4 hover:border-[#059669]/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100/60 text-[#059669] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#064e3b]">
                        {docTypeLabels[doc.doc_type] || doc.file_name || "Investment Document"}
                      </h4>
                      <span className="text-[10px] text-gray-400 block mt-0.5 capitalize">
                        {doc.doc_type?.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {doc.signedUrl && (
                    <a
                      href={doc.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-[#064e3b] font-semibold text-xs hover:bg-[#064e3b] hover:text-white transition-all shadow-2xs shrink-0"
                    >
                      <Eye className="w-4 h-4" /> View Document
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#fcfaf7] border border-dashed border-gray-200 text-center text-xs text-gray-500 space-y-1">
              <FileText className="w-8 h-8 text-gray-300 mx-auto" />
              <p>No supplementary private documents uploaded for this campaign yet.</p>
            </div>
          )}
        </div>

        {/* SECTION 7: MILESTONES & ROADMAP TIMELINE */}
        {sortedMilestones.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#064e3b] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#059669]" /> Milestones & Execution Roadmap
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Unified platform and project execution milestones tracking campaign lifecycle.
                </p>
              </div>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-100">
              {sortedMilestones.map((milestone, idx) => {
                const isSystem = milestone.milestone_source === "system";
                const isComplete = milestone.status === "complete" || milestone.status === "completed";
                const isPendingConfirmation = milestone.status === "pending_confirmation";

                return (
                  <div key={milestone.id || idx} className="relative group">
                    <div
                      className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${
                        isComplete
                          ? "border-[#059669] bg-[#059669] text-white"
                          : isPendingConfirmation
                            ? "border-amber-500 bg-amber-50 text-amber-600"
                            : "border-gray-300 bg-white"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : isPendingConfirmation ? (
                        <Clock className="w-3 h-3 text-amber-600" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                      )}
                    </div>

                    <div className="bg-[#fcfaf7] p-5 rounded-2xl border border-gray-100 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#064e3b]">
                            {milestone.title}
                          </h4>

                          {isSystem ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-emerald-300 font-mono text-[10px] font-semibold uppercase tracking-wider">
                              Platform milestone
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                              Project milestone
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isComplete && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Complete
                            </span>
                          )}
                          {isPendingConfirmation && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Under Review
                            </span>
                          )}
                          {!isComplete && !isPendingConfirmation && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold text-[11px]">
                              <Clock className="w-3 h-3 text-gray-400" /> Upcoming
                            </span>
                          )}

                          <span className="text-[11px] font-semibold text-gray-500">
                            {milestone.target_date
                              ? formatUtcDate(milestone.target_date) || "Target Date TBD"
                              : "Target Date TBD"}
                          </span>
                        </div>
                      </div>

                      {milestone.description && (
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 8: CONTEXTUAL INVEST CTA PANEL / ISSUER PREVIEW BANNER */}
        {isIssuerPreview ? (
          <div className="bg-[#064e3b] text-white rounded-3xl p-8 sm:p-10 shadow-xl space-y-4 text-center border border-emerald-800">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs uppercase tracking-wider border border-emerald-400/30">
              <Eye className="w-4 h-4" /> Live Investor Preview
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">This is how investors see your project.</h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-xl mx-auto leading-relaxed">
              This preview renders your campaign using the exact investor-facing layout, including cleared milestones, private document access, and Sharia compliance badges.
            </p>
            <div className="pt-2">
              <Link
                href={`/issuer-portal/projects/${project.slug || project.id}/manage`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-[#064e3b] font-extrabold text-xs hover:bg-gray-100 transition-all shadow-md"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Project Management
              </Link>
            </div>
          </div>
        ) : isCampaignClosed ? (
          <div className="bg-gradient-to-br from-[#064e3b] to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-4 relative overflow-hidden">
            {isClosing && (
              <div className="flex items-center gap-3 text-amber-200 font-bold text-base sm:text-lg">
                <Clock className="w-6 h-6 text-amber-400 shrink-0" />
                <span>Campaign closed. Allocation in progress.</span>
              </div>
            )}
            {isFunded && (
              <div className="flex items-center gap-3 text-emerald-100 font-bold text-base sm:text-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span>
                  Funded: {currency} {allocatedTotal.toLocaleString()} of {targetGoal.toLocaleString()} target ({subscribedAtClosePct}% subscribed at close).
                </span>
              </div>
            )}
            {isFailed && (
              <div className="flex items-center gap-3 text-rose-200 font-bold text-base sm:text-lg">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                <span>This campaign did not reach its minimum and closed without funding.</span>
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center gap-3 text-emerald-100 font-bold text-base sm:text-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span>This campaign has completed its lifecycle.</span>
              </div>
            )}
            <div className="pt-2">
              <Link
                href="/investor-portal/investments"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-all border border-white/20"
              >
                View My Investments <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#064e3b] to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                  Direct Investment Action
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-1">
                  Participate in {project.title}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-200/80 mt-1 max-w-xl">
                  Minimum ticket starts at {currency} {minFloor.toLocaleString()}. Secure your allocation under official Sharia-compliant SPV contracts.
                </p>
              </div>

              {isEligible ? (
                <button
                  onClick={handleOpenPledgeModal}
                  className="px-8 py-4 rounded-2xl bg-emerald-500 text-white font-extrabold text-sm hover:bg-emerald-400 transition-all shadow-lg hover:shadow-emerald-500/25 shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Invest Now <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  disabled
                  title={eligibilityMessage || "Ineligible to Invest"}
                  className="px-6 py-3.5 rounded-2xl bg-slate-800 text-slate-400 font-bold text-xs shrink-0 flex items-center gap-2 cursor-not-allowed border border-slate-700"
                >
                  <Lock className="w-4 h-4 text-amber-400" /> Ineligible to Invest
                </button>
              )}
            </div>

            {!isEligible && eligibilityMessage && (
              <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 text-amber-200 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-bold block mb-0.5">
                    Investment Restriction Notice
                  </strong>
                  {eligibilityMessage}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PLEDGE INVESTMENT MODAL (ONLY FOR INVESTOR ROLE) */}
      {!isIssuerPreview && isPledgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl relative border border-gray-100 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden">
            {/* Background processing loader overlay */}
            {isSubmittingPledge && (
              <div className="absolute inset-0 bg-white/85 backdrop-blur-xs rounded-3xl z-30 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in duration-150">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 flex items-center justify-center text-[#059669] shadow-inner">
                    <Loader2 className="w-7 h-7 animate-spin text-[#059669]" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <h4 className="font-extrabold text-[#064e3b] text-base">Processing Pledge Request</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Recording your commitment and securing your allocation priority in the registry...
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-b px-6 py-5 sm:px-8 sm:py-5 border-gray-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-[#059669] flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#064e3b]">Pledge request</h3>
                  <p className="text-[11px] text-gray-500">
                    Class {investorClass} ({classCfg.name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPledgeModalOpen(false);
                  setAcceptedTerms(false);
                  setPledgeError("");
                  setCustomConversionUnits(null);
                }}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {pledgeSuccess ? (
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black text-[#064e3b]">Pledge Submitted!</h4>
                  <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                    Pledge submitted. Allocation happens when the campaign closes. Your subscription agreement will be emailed to you shortly.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-emerald-900/10 space-y-2.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Pledged Principal:</span>
                    <span className="font-bold text-[#064e3b]">
                      {currency} {parsedPledgeAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Investor Fee ({feePercent}%):</span>
                    <span className="font-bold text-gray-700">
                      {currency}{" "}
                      {(pledgeResultData?.feeAmount || computedFeeAmount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-800 font-bold pt-2 border-t border-gray-200">
                    <span>Total Debited from Wallet:</span>
                    <span className="text-[#059669]">
                      {currency}{" "}
                      {(pledgeResultData?.totalDeducted || totalWalletDeduction).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {hasConversionClause && isClass1To4 && (
                    <div className="flex justify-between text-gray-800 font-bold pt-2 border-t border-gray-200">
                      <span>Requested Conversion Units:</span>
                      <span className="text-emerald-700">
                        {(pledgeResultData?.requestedConversionUnits ?? effectiveConversionUnits).toLocaleString()} units
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    href="/investor-portal/portfolio"
                    className="flex-1 py-3 px-4 text-center rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-sm"
                  >
                    View In Portfolio
                  </Link>
                  <button
                    onClick={() => {
                      setIsPledgeModalOpen(false);
                      setAcceptedTerms(false);
                      setCustomConversionUnits(null);
                    }}
                    className="py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    Close Modal
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePledgeSubmit} className="p-6 sm:p-8 overflow-y-auto space-y-5 flex-1">
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-1.5 ${hasEnoughBalance ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-xs">
                      <Wallet className="w-4 h-4 text-[#059669]" /> Investor Wallet Balance
                    </span>
                    <span className="font-extrabold text-sm">
                      {currency}{" "}
                      {currentWalletBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {!hasEnoughBalance && (
                    <div className="pt-2 flex items-center justify-between border-t border-amber-200/80">
                      <span className="text-[11px] text-amber-800 font-medium">
                        Insufficient funds for total deduction ({currency}{" "}
                        {totalWalletDeduction.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        )
                      </span>
                      <Link
                        href="/investor-portal/wallet"
                        className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-all shrink-0"
                      >
                        Top Up Wallet
                      </Link>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-[#064e3b]">
                      Pledge Amount ({currency})
                    </label>
                    <span className="text-[11px] text-gray-500">
                      Class Cap:{" "}
                      {maxPledge === Infinity
                        ? "Unlimited"
                        : `${currency} ${maxPledge.toLocaleString()}`}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={minFloor}
                    max={maxPledge !== Infinity ? maxPledge : undefined}
                    step="any"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-lg text-[#064e3b] focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                  />
                </div>

                {/* Total Amount Breakdown including Pledge Charge */}
                {parsedPledgeAmount > 0 && (
                  <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-emerald-900/10 space-y-2 text-xs">
                    <div className="font-bold text-[#064e3b] flex items-center justify-between pb-1.5 border-b border-gray-100">
                      <span>Total Pledge Breakdown</span>
                      <span className="text-[11px] text-gray-500 font-semibold">
                        Class {investorClass} ({feePercent}% charge)
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Pledge Principal:</span>
                      <span className="font-bold text-[#064e3b]">
                        {currency}{" "}
                        {parsedPledgeAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Pledge Charge ({feePercent}%):</span>
                      <span className="font-bold text-gray-700">
                        {currency}{" "}
                        {computedFeeAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-900 font-extrabold pt-2 border-t border-gray-200 text-sm">
                      <span>Total Amount (Wallet Deduction):</span>
                      <span className="text-[#059669]">
                        {currency}{" "}
                        {totalWalletDeduction.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Unit Estimates */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Estimated Units:</span>
                    <span className="font-bold text-[#064e3b]">
                      {estimatedUnits.toLocaleString()} {project.unit_type || "units"} (est.)
                    </span>
                  </div>
                  {hasConversionClause && isClass1To4 && (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>Eligible Conversion Units (Max):</span>
                        <span className="font-semibold text-gray-700">
                          {maxEligibleConversionUnits.toLocaleString()} units
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Requested Conversion Units:</span>
                        <span className="font-bold text-emerald-700">
                          {effectiveConversionUnits.toLocaleString()} units
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Sukuk-to-Equity Conversion Option (Classes 1–4 only) */}
                {hasConversionClause && isClass1To4 && (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-[#064e3b]">
                        <ArrowRightLeft className="w-4 h-4 text-[#059669] shrink-0" />
                        <span>Sukuk-to-Equity Conversion Option</span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100/90 text-[#064e3b] border border-emerald-200 shrink-0">
                        Class {investorClass} Privilege
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      You are eligible to convert up to{" "}
                      <strong className="text-[#064e3b] font-bold">
                        {maxEligibleConversionUnits.toLocaleString()} units
                      </strong>{" "}
                      into equity shares upon trigger. You can reduce this amount (down to 0) if you do not want all of your units to convert to shares.
                    </p>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="font-bold text-[#064e3b] text-xs">
                          Requested Conversion Units
                        </label>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setCustomConversionUnits(0)}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                              effectiveConversionUnits === 0
                                ? "bg-slate-300 text-slate-800"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            0 (Opt Out)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomConversionUnits(null)}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                              effectiveConversionUnits === maxEligibleConversionUnits &&
                              (customConversionUnits === null || customConversionUnits === maxEligibleConversionUnits)
                                ? "bg-emerald-600 text-white"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            Max ({maxEligibleConversionUnits.toLocaleString()})
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={maxEligibleConversionUnits}
                          step={1}
                          value={
                            customConversionUnits !== null
                              ? customConversionUnits === ""
                                ? ""
                                : Math.min(Number(customConversionUnits), maxEligibleConversionUnits)
                              : maxEligibleConversionUnits
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setCustomConversionUnits("");
                            } else {
                              const num = parseInt(val, 10);
                              if (!isNaN(num)) {
                                setCustomConversionUnits(
                                  Math.max(0, Math.min(num, maxEligibleConversionUnits))
                                );
                              }
                            }
                          }}
                          onBlur={() => {
                            if (customConversionUnits === "") {
                              setCustomConversionUnits(0);
                            }
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-base text-[#064e3b] focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                          units
                        </span>
                      </div>
                    </div>

                    {/* Explanatory helper state */}
                    <div className="pt-0.5 text-[11px] leading-relaxed">
                      {effectiveConversionUnits === 0 ? (
                        <div className="text-amber-800 font-medium flex items-center gap-1.5 bg-amber-50/80 p-2 rounded-lg border border-amber-200/80">
                          <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          <span>Conversion opted out: All {estimatedUnits.toLocaleString()} units remain standard Sukuk.</span>
                        </div>
                      ) : effectiveConversionUnits < maxEligibleConversionUnits ? (
                        <div className="text-emerald-800 font-medium flex items-center gap-1.5 bg-emerald-100/60 p-2 rounded-lg border border-emerald-200/80">
                          <Info className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          <span>
                            {effectiveConversionUnits.toLocaleString()} units requested for conversion; {(estimatedUnits - effectiveConversionUnits).toLocaleString()} units remain standard Sukuk.
                          </span>
                        </div>
                      ) : (
                        <div className="text-emerald-800 font-medium flex items-center gap-1.5 bg-emerald-100/60 p-2 rounded-lg border border-emerald-200/80">
                          <Info className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          <span>
                            Maximum conversion: All {maxEligibleConversionUnits.toLocaleString()} eligible units requested for equity shares.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* How your pledge works disclosures */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                  <div className="font-bold text-[#064e3b] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#059669]" />
                    {PLEDGE_DISCLOSURES?.title || "How your pledge works"}
                  </div>
                  <ul className="space-y-1.5 text-gray-600 text-[11px] leading-relaxed list-disc list-inside">
                    {(PLEDGE_DISCLOSURES?.items || []).map((itemText, idx) => (
                      <li key={idx} className="pl-0.5">
                        {itemText}
                      </li>
                    ))}
                    {hasConversionClause && isClass1To4 && PLEDGE_DISCLOSURES?.conversionItem && (
                      <li key="conversion-item" className="pl-0.5 text-emerald-800 font-medium">
                        {PLEDGE_DISCLOSURES.conversionItem}
                      </li>
                    )}
                  </ul>
                </div>

                {/* Subscription Terms Acceptance Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50/50 cursor-pointer text-xs transition-colors">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#064e3b] focus:ring-[#059669] cursor-pointer"
                    required
                  />
                  <span className="text-gray-700 font-medium">
                    {PLEDGE_TERMS_CHECKBOX_LABEL}
                  </span>
                </label>

                {/* Error Alert Display - placed directly adjacent to the submit action */}
                {(pledgeError || isExceedingCeiling) && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-150">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      {pledgeError ||
                        `This pledge exceeds the 150% maximum subscription ceiling (${currency} ${maxOversubscriptionCeiling.toLocaleString()}). Maximum remaining intake is ${currency} ${remainingIntakeCapacity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPledgeModalOpen(false);
                      setAcceptedTerms(false);
                      setPledgeError("");
                      setCustomConversionUnits(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmittingPledge ||
                      !acceptedTerms ||
                      !hasEnoughBalance ||
                      isBelowMinFloor ||
                      isExceedingMaxPledge ||
                      isExceedingCeiling
                    }
                    className="px-6 py-2.5 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSubmittingPledge ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Submitting pledge...</span>
                      </>
                    ) : (
                      <span>Submit pledge</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Notification Preferences Modal */}
      {!isIssuerPreview && (
        <NotificationSettingsModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          projectId={project.id}
          investorClass={investorClass}
        />
      )}
    </div>
  );
}
