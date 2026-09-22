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
  Layers,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Lock,
  ArrowLeft,
  DollarSign,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Wallet,
  CreditCard,
} from "lucide-react";
import { createPledge } from "@/app/actions/pledge";
import { CLASS_CONFIG } from "@/app/constants/classConfig";

function formatUtcDate(dateString) {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
  } catch (e) {
    return null;
  }
}

export default function ProjectDetailClient({ project, investor, investorClass, eligibility }) {

  const currency = project.currency || "USD";
  const targetGoal = Number(project.target_goal) || 0;
  const liveRaised = Number(project.live_raised_amount) || 0;
  const rawPercent = targetGoal > 0 ? (liveRaised / targetGoal) * 100 : 0;
  const progressPercent = Math.min(rawPercent, 100).toFixed(1);
  const minFloor = Number(project.min_investment_floor) || 0;
  const isSpvEquity = project.sharia_contract_type === "spv_equity";

  const isPendingReview = project.status === "pending_review";

  const rawSpv = project.spv_details;
  const spvDetails = Array.isArray(rawSpv) ? rawSpv[0] : rawSpv;

  const sortedMilestones = [...(project.project_milestones || [])].sort((a, b) => {
    if (!a.target_date && !b.target_date) return 0;
    if (!a.target_date) return -1;
    if (!b.target_date) return 1;
    return new Date(a.target_date) - new Date(b.target_date);
  });

  // Media Gallery state
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

  const [activeMedia, setActiveMedia] = useState(allMedia[0] || null);

  // Class config & Fee calculations
  const classCfg = CLASS_CONFIG[investorClass] || CLASS_CONFIG[10];
  const feePercent = classCfg.feePercent || 2.5;
  const maxPledge = classCfg.maxPledge;

  // Pledge Modal State
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState(minFloor.toString());
  const [isSubmittingPledge, setIsSubmittingPledge] = useState(false);
  const [pledgeError, setPledgeError] = useState("");
  const [pledgeSuccess, setPledgeSuccess] = useState(false);
  const [pledgeResultData, setPledgeResultData] = useState(null);

  // Live modal computations
  const parsedPledgeAmount = parseFloat(pledgeAmount) || 0;
  const computedFeeAmount = (parsedPledgeAmount * feePercent) / 100;
  const totalWalletDeduction = parsedPledgeAmount + computedFeeAmount;
  const currentWalletBalance = Number(investor?.wallet_balance || 0);
  const hasEnoughBalance = currentWalletBalance >= totalWalletDeduction;
  const unitPrice = Number(project.unit_price) || 0;
  const estimatedUnits = unitPrice > 0 ? Math.floor(parsedPledgeAmount / unitPrice) : 0;
  const isExceedingMaxPledge = maxPledge !== Infinity && parsedPledgeAmount > maxPledge;
  const isBelowMinFloor = parsedPledgeAmount < minFloor;

  // Sanitized full description HTML (from project.full_description)
  const rawDescription = project.full_description || project.description || project.summary || "";
  const sanitizedDescription = DOMPurify.sanitize(rawDescription);

  const docTypeLabels = {
    pitch_deck: "Pitch Deck Presentation",
    balance_sheet: "Balance Sheet & Financials",
    valuation_report: "Independent Valuation Report",
    cap_table: "Capitalization Table",
  };

  const handlePledgeSubmit = async (e) => {
    e.preventDefault();
    setPledgeError("");

    if (!hasEnoughBalance) {
      setPledgeError(`Insufficient wallet balance. You need ${currency} ${totalWalletDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} but have ${currency} ${currentWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      return;
    }

    if (isExceedingMaxPledge) {
      setPledgeError(`Amount exceeds your Class ${investorClass} limit of ${currency} ${maxPledge.toLocaleString()}.`);
      return;
    }

    setIsSubmittingPledge(true);

    try {
      const res = await createPledge({
        projectId: project.id,
        slug: project.slug,
        amount: pledgeAmount,
      });

      if (!res.success) {
        setPledgeError(res.error || "Failed to process pledge.");
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
          <Link
            href="/investor-portal/marketplace"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#064e3b] hover:text-[#059669] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 font-bold text-xs">
              Class {investorClass} Access
            </span>
            {isPendingReview && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white font-bold text-xs shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5" /> Pre-Audit Draft
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
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
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Pre-Audit / Unreviewed
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Campaign Live
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
                {progressPercent}% Funded ({currency} {liveRaised.toLocaleString()})
              </div>
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-gray-100">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Live Raised
              </span>
              <div className="text-lg sm:text-xl font-bold text-[#064e3b] mt-1">
                {currency} {liveRaised.toLocaleString()}
              </div>
              <span className="text-[11px] text-gray-500">From verified holdings</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-gray-100">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Minimum Ticket Floor
              </span>
              <div className="text-lg sm:text-xl font-bold text-[#064e3b] mt-1">
                {currency} {minFloor.toLocaleString()}
              </div>
              <span className="text-[11px] text-gray-500">Per investor pledge</span>
            </div>

            {/* ROI BADGE - HIDDEN FOR SPV EQUITY */}
            {!isSpvEquity && project.expected_roi_percent != null && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#059669]" /> Target Return (ROI)
                </span>
                <div className="text-lg sm:text-xl font-black text-[#059669] mt-1">
                  {project.expected_roi_percent}% Expected
                </div>
                <span className="text-[11px] text-emerald-700/80">Annualized yield</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-gray-100">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" /> Campaign Deadline (UTC)
              </span>
              <div className="text-sm sm:text-base font-bold text-[#064e3b] mt-1">
                {project.campaign_end_date ? formatUtcDate(project.campaign_end_date) || "N/A" : "N/A"}
              </div>
              <span className="text-[11px] text-gray-500">
                {project.tenure_months ? `${project.tenure_months}m tenure target` : "Target close date"}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-500">Campaign Capitalization Progress</span>
              <span className="text-[#064e3b] font-bold">{progressPercent}% Achieved</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#059669] to-[#047857] rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
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
                    className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
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

        {/* SECTION 3: SANITIZED DESCRIPTION (PROJECT OVERVIEW & INVESTMENT CASE) */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-extrabold text-[#064e3b] border-b border-gray-100 pb-4">
            Project Overview & Investment Case
          </h2>
          <div
            className="prose max-w-none text-gray-700 text-sm sm:text-base leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription || "<p>No detailed description provided.</p>" }}
          />
        </div>

        {/* SECTION 4: FINANCIAL TERMS PANEL */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-extrabold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-4">
            <DollarSign className="w-5 h-5 text-[#059669]" /> Financial & Offer Terms
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-4 bg-[#fcfaf7] p-5 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-sm text-[#064e3b]">Funding Targets</h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Target Goal:</span>
                  <span className="font-bold text-[#064e3b]">{currency} {targetGoal.toLocaleString()}</span>
                </div>
                {project.soft_cap != null && (
                  <div className="flex justify-between">
                    <span>Soft Cap:</span>
                    <span className="font-semibold text-gray-800">{currency} {Number(project.soft_cap).toLocaleString()}</span>
                  </div>
                )}
                {project.hard_cap != null && (
                  <div className="flex justify-between">
                    <span>Hard Cap:</span>
                    <span className="font-semibold text-gray-800">{currency} {Number(project.hard_cap).toLocaleString()}</span>
                  </div>
                )}
                {project.campaign_end_date && formatUtcDate(project.campaign_end_date) && (
                  <div className="flex justify-between border-t pt-2 border-gray-200">
                    <span>Campaign Deadline (UTC):</span>
                    <span className="font-bold text-[#064e3b]">{formatUtcDate(project.campaign_end_date)}</span>
                  </div>
                )}
              </div>
            </div>


            <div className="space-y-4 bg-[#fcfaf7] p-5 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-sm text-[#064e3b]">Unit Terms</h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Unit / Sukuk Price:</span>
                  <span className="font-bold text-[#064e3b]">{currency} {Number(project.unit_price || 0).toLocaleString()}</span>
                </div>
                {project.unit_type && (
                  <div className="flex justify-between">
                    <span>Unit Type:</span>
                    <span className="font-semibold text-gray-800 capitalize">{project.unit_type}</span>
                  </div>
                )}
                {project.total_authorized_units != null && (
                  <div className="flex justify-between">
                    <span>Total Authorized Units:</span>
                    <span className="font-semibold text-gray-800">{Number(project.total_authorized_units).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 bg-[#fcfaf7] p-5 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-sm text-[#064e3b]">Returns & Frequency</h3>
              <div className="space-y-2 text-gray-600">
                {!isSpvEquity && (
                  <div className="flex justify-between">
                    <span>Expected ROI:</span>
                    <span className="font-bold text-[#059669]">{project.expected_roi_percent}%</span>
                  </div>
                )}
                {project.profit_distribution_frequency && (
                  <div className="flex justify-between">
                    <span>Distribution Frequency:</span>
                    <span className="font-semibold text-gray-800 capitalize">{project.profit_distribution_frequency}</span>
                  </div>
                )}
                {project.spv_details?.total_cost_authorized != null && !isSpvEquity && (
                  <div className="flex justify-between border-t pt-2 border-gray-200">
                    <span>Total Cost Authorized:</span>
                    <span className="font-bold text-[#064e3b]">{currency} {Number(project.spv_details.total_cost_authorized).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: STRUCTURE & COMPLIANCE PANEL */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-extrabold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-4">
            <ShieldCheck className="w-5 h-5 text-[#059669]" /> SPV Structure & Sharia Compliance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SPV Details */}
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
                  <div className="flex justify-between">
                    <span>Registration Number:</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {spvDetails.registration_number || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#fcfaf7] p-6 rounded-2xl border border-gray-100 flex items-center justify-center text-xs text-gray-500">
                SPV details structure pending confirmation.
              </div>
            )}

            {/* Sharia Audit Certification */}
            <div className="bg-[#fcfaf7] p-6 rounded-2xl border border-gray-100 space-y-4 text-xs flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#059669] font-bold text-sm">
                  <Sparkles className="w-4 h-4" /> Sharia Compliance Audit
                </div>
                <p className="text-gray-600 leading-relaxed">
                  This campaign is structured in adherence to Islamic financial principles under the{" "}
                  <strong className="text-[#064e3b] font-semibold">{project.sharia_contract_type || "Sharia"}</strong> framework.
                </p>

                {/* Sharia Compliance Status Badge */}
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

              {project.shariah_compliance_status === "verified" && project.shariah_certificate_doc?.signedUrl && (
                <a
                  href={project.shariah_certificate_doc.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all shadow-sm mt-3"
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  View Sharia Certificate
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 6: PRIVATE DOCUMENTS (INVESTOR VAULT) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#064e3b] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#059669]" /> Private Investor Documents
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Restricted access documents available to verified investors of Class {investorClass}.
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
                      <Eye className="w-4 h-4" />
                      View Document
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
                const isComplete = milestone.status === "complete";
                const isPendingConfirmation = milestone.status === "pending_confirmation";

                return (
                  <div key={milestone.id || idx} className="relative group">
                    {/* Dot Indicator */}
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

                    {/* Milestone Card */}
                    <div className="bg-[#fcfaf7] p-5 rounded-2xl border border-gray-100 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#064e3b]">
                            {milestone.title}
                          </h4>

                          {/* Milestone Source Tag */}
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

                        {/* Milestone Status Badge & Target Date */}
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
                              ? new Date(milestone.target_date).toLocaleDateString()
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

        {/* SECTION 8: CONTEXTUAL INVEST CTA PANEL */}
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

            {/* CTA Button Or Warning */}
            {eligibility.eligible ? (
              <button
                onClick={() => setIsPledgeModalOpen(true)}
                className="px-8 py-4 rounded-2xl bg-emerald-500 text-white font-extrabold text-sm hover:bg-emerald-400 transition-all shadow-lg hover:shadow-emerald-500/25 shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                Invest Now <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                disabled
                className="px-6 py-3.5 rounded-2xl bg-slate-800 text-slate-400 font-bold text-xs shrink-0 flex items-center gap-2 cursor-not-allowed border border-slate-700"
              >
                <Lock className="w-4 h-4 text-amber-400" /> Ineligible to Invest
              </button>
            )}
          </div>

          {/* Warning Banner if Ineligible */}
          {!eligibility.eligible && eligibility.reason && (
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-bold block mb-0.5">Investment Restriction Notice</strong>
                {eligibility.reason}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PLEDGE INVESTMENT MODAL */}
      {isPledgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-gray-100 my-8">
            <div className="flex items-center justify-between border-b pb-4 border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-[#059669] flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#064e3b]">Pledge Investment</h3>
                  <p className="text-[11px] text-gray-500">Class {investorClass} ({classCfg.name})</p>
                </div>
              </div>
              <button
                onClick={() => setIsPledgeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {pledgeSuccess ? (
              <div className="py-4 space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black text-[#064e3b]">Pledge Confirmed!</h4>
                  <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                    Your commitment for <strong>{project.title}</strong> has been recorded in the platform registry.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-emerald-900/10 space-y-2.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Pledged Principal:</span>
                    <span className="font-bold text-[#064e3b]">{currency} {parsedPledgeAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Investor Fee ({feePercent}%):</span>
                    <span className="font-bold text-gray-700">{currency} {(pledgeResultData?.feeAmount || computedFeeAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-800 font-bold pt-2 border-t border-gray-200">
                    <span>Total Debited from Wallet:</span>
                    <span className="text-[#059669]">{currency} {(pledgeResultData?.totalDeducted || totalWalletDeduction).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {pledgeResultData?.newBalance != null && (
                    <div className="flex justify-between text-gray-500 text-[11px] pt-1">
                      <span>Updated Wallet Balance:</span>
                      <span className="font-semibold text-gray-800">{currency} {pledgeResultData.newBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {unitPrice > 0 && (
                    <div className="flex justify-between text-gray-600 pt-1">
                      <span>Units Allocated:</span>
                      <span className="font-bold text-gray-900">{estimatedUnits.toLocaleString()} Sukuk units</span>
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
                    onClick={() => setIsPledgeModalOpen(false)}
                    className="py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-all"
                  >
                    Close Modal
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePledgeSubmit} className="space-y-5">
                {/* Investor Wallet Balance Bar */}
                <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${hasEnoughBalance ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-xs">
                      <Wallet className="w-4 h-4 text-[#059669]" /> Investor Wallet Balance
                    </span>
                    <span className="font-extrabold text-sm">
                      {currency} {currentWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {!hasEnoughBalance && (
                    <div className="pt-2 flex items-center justify-between border-t border-amber-200/80">
                      <span className="text-[11px] text-amber-800 font-medium">
                        Insufficient funds for total deduction ({currency} {totalWalletDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
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

                {pledgeError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>{pledgeError}</div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-[#064e3b]">
                      Pledge Amount ({currency})
                    </label>
                    <span className="text-[11px] text-gray-500">
                      Class Cap: {maxPledge === Infinity ? "Unlimited" : `${currency} ${maxPledge.toLocaleString()}`}
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
                  <div className="flex justify-between text-[11px] text-gray-500 pt-0.5">
                    <span>Min floor: {currency} {minFloor.toLocaleString()}</span>
                    {unitPrice > 0 && <span>Sukuk unit price: {currency} {unitPrice.toLocaleString()}</span>}
                  </div>
                </div>

                {/* Financial Breakdown Table */}
                <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-gray-200/80 text-xs space-y-2.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Investment Principal:</span>
                    <span className="font-bold text-[#064e3b]">{currency} {parsedPledgeAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Investor Fee (Class {investorClass} - {feePercent}%):</span>
                    <span className="font-semibold text-gray-800">{currency} {computedFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {unitPrice > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Estimated Units Acquired:</span>
                      <span className="font-bold text-gray-800">{estimatedUnits.toLocaleString()} units</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-900 font-extrabold pt-2 border-t border-gray-200 text-sm">
                    <span>Total Wallet Deduction:</span>
                    <span className={hasEnoughBalance ? "text-[#059669]" : "text-amber-600"}>
                      {currency} {totalWalletDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPledgeModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPledge || !hasEnoughBalance || isBelowMinFloor || isExceedingMaxPledge}
                    className="px-6 py-2.5 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmittingPledge ? "Submitting Pledge..." : "Confirm & Pledge"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
