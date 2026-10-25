"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  Eye,
  Download,
  ExternalLink,
  Layers,
  FileCheck2,
  FileSpreadsheet,
  Landmark,
  Search,
  X,
  Calendar,
  Coins,
  Package,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

const TABS = [
  { id: "all", label: "All Documents", icon: Layers },
  { id: "shariah_certificates", label: "Shariah Certificates", icon: ShieldCheck },
  { id: "subscription_agreements", label: "Subscription Agreements", icon: FileCheck2 },
  { id: "auditor_reports", label: "Auditor & Valuation Reports", icon: FileSpreadsheet },
  { id: "financial_tax", label: "Tax & Financial Statements", icon: Landmark },
];

function formatFileSize(bytes) {
  if (!bytes) return "PDF";
  const k = 1024;
  if (bytes < k) return `${bytes} B`;
  const kb = bytes / k;
  if (kb < k) return `${Math.round(kb)} KB`;
  return `${(kb / k).toFixed(1)} MB`;
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return "—";
  }
}

function formatCurrency(val, currency = "AED") {
  const num = Number(val) || 0;
  return `${currency} ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DocumentsClient({ initialDocuments = [] }) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Tab counts
  const tabCounts = {
    all: initialDocuments.length,
    shariah_certificates: initialDocuments.filter((d) => d.category === "shariah_certificates").length,
    subscription_agreements: initialDocuments.filter((d) => d.category === "subscription_agreements").length,
    auditor_reports: initialDocuments.filter((d) => d.category === "auditor_reports").length,
    financial_tax: initialDocuments.filter((d) => d.category === "financial_tax").length,
  };

  // Filtered documents
  const filteredDocuments = initialDocuments.filter((doc) => {
    // Tab category filter
    if (activeTab !== "all" && doc.category !== activeTab) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = doc.title?.toLowerCase().includes(q);
      const matchFileName = doc.file_name?.toLowerCase().includes(q);
      const matchProject = doc.pledge_details?.project_title?.toLowerCase().includes(q);
      const matchPledgeId = String(doc.pledge_details?.pledge_id || "").includes(q);
      const matchContract = doc.pledge_details?.sharia_contract_type?.toLowerCase().includes(q);
      return matchTitle || matchFileName || matchProject || matchPledgeId || matchContract;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#059669]/15 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Official Document Vault
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Investment & Pledge Documents
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5 max-w-2xl">
            Access your official Shariah certificates, subscription contracts, and investment receipts generated for your holdings.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-[#059669]/20 shadow-xs self-start md:self-auto">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center font-black text-sm">
            {initialDocuments.length}
          </div>
          <div className="text-xs">
            <span className="block font-bold text-gray-800">Total Documents</span>
            <span className="text-gray-500">
              {tabCounts.shariah_certificates} Shariah Certificate{tabCounts.shariah_certificates === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-gray-200/60">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id] || 0;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-[#064e3b] text-white shadow-sm"
                    : "bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 border border-gray-200/70"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-300" : "text-gray-400"}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : count > 0
                      ? "bg-emerald-100 text-[#064e3b]"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project title, contract, or pledge ID..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-800">{filteredDocuments.length}</span> document{filteredDocuments.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Documents Grid / Empty State */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const p = doc.pledge_details || {};
            const isAllocated = p.status === "allocated" || p.status === "completed";

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl border border-gray-200/80 hover:border-[#059669]/40 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Top Section */}
                <div className="p-6 space-y-4">
                  {/* Category Pill and File Meta */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-[#064e3b] border border-emerald-200/60">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {doc.category_label || "Shariah Certificate"}
                    </span>

                    <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono text-[10px] font-bold">
                        PDF
                      </span>
                      <span>{formatFileSize(doc.file_size)}</span>
                    </span>
                  </div>

                  {/* Document and Project Title */}
                  <div>
                    <h3 className="text-base font-extrabold text-[#064e3b] group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2">
                      {p.project_title || doc.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">Pledge #{p.pledge_id}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Short Pledge Details Strip */}
                  <div className="bg-[#fcfaf7] rounded-2xl p-4 border border-gray-200/60 space-y-2.5 text-xs">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                      <span>Pledge Overview</span>
                      <span
                        className={`capitalize font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          isAllocated
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status || "Pledged"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[11px] text-gray-500 block">Contract Type</span>
                        <span className="font-bold text-gray-900">
                          {p.sharia_contract_type || "Murabaha"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-gray-500 block">
                          {isAllocated ? "Allocated Amount" : "Pledged Amount"}
                        </span>
                        <span className="font-extrabold text-gray-900">
                          {formatCurrency(p.allocated_amount || p.pledged_amount, p.currency)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-gray-500 block">Allocated Holding</span>
                        <span className="font-bold text-gray-900">
                          {p.allocated_units != null ? `${p.allocated_units} units` : "Pending allocation"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-gray-500 block">Expected Return</span>
                        <span className="font-bold text-emerald-700">
                          {p.expected_roi_percent != null
                            ? `${p.expected_roi_percent}% p.a.`
                            : "Profit sharing"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#064e3b] hover:bg-[#059669] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Document</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-gray-500 hover:text-[#064e3b] hover:bg-white transition-colors border border-transparent hover:border-gray-200"
                        title="Open in new window"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {doc.url && (
                      <a
                        href={doc.url}
                        download={doc.file_name || "shariah_certificate.pdf"}
                        className="p-2 rounded-xl text-gray-500 hover:text-[#064e3b] hover:bg-white transition-colors border border-transparent hover:border-gray-200"
                        title="Download certificate"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Category Specific Empty State */
        <div className="p-12 rounded-3xl bg-white border border-dashed border-[#059669]/25 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-[#059669] flex items-center justify-center shadow-xs">
            {activeTab === "shariah_certificates" ? (
              <ShieldCheck className="w-8 h-8" />
            ) : activeTab === "subscription_agreements" ? (
              <FileCheck2 className="w-8 h-8" />
            ) : activeTab === "auditor_reports" ? (
              <FileSpreadsheet className="w-8 h-8" />
            ) : activeTab === "financial_tax" ? (
              <Landmark className="w-8 h-8" />
            ) : (
              <FileText className="w-8 h-8" />
            )}
          </div>

          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-bold text-[#064e3b]">
              {searchQuery
                ? "No Matching Documents Found"
                : activeTab === "shariah_certificates"
                ? "No Shariah Certificates Issued Yet"
                : activeTab === "subscription_agreements"
                ? "No Subscription Agreements on File"
                : activeTab === "auditor_reports"
                ? "No Auditor or Valuation Reports"
                : activeTab === "financial_tax"
                ? "No Tax or Financial Statements"
                : "No Investment Documents Yet"}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {searchQuery
                ? `No document matching "${searchQuery}" was found. Try clearing your search or switching categories.`
                : activeTab === "shariah_certificates"
                ? "Official Sharia-compliant Sukuk Certificates are issued for allocated pledges upon campaign closing and stored in your vault."
                : activeTab === "subscription_agreements"
                ? "Subscription contracts and terms signed electronically during campaign investment allocation will appear here."
                : activeTab === "auditor_reports"
                ? "Certified Sharia audit verification reports and independent project valuation certificates will populate here."
                : activeTab === "financial_tax"
                ? "Periodic profit distribution statements, coupon payment notes, and annual tax statements will appear here."
                : "When your pledges are allocated and campaigns close, your official certificates and contract notes will automatically populate here."}
            </p>
          </div>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-bold text-[#059669] hover:underline pt-2"
            >
              Clear search filter
            </button>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-4 bg-[#fcfaf7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#064e3b] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#064e3b] leading-tight">
                    {selectedDoc.pledge_details?.project_title || selectedDoc.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span className="font-semibold text-gray-700">Pledge #{selectedDoc.pledge_details?.pledge_id}</span>
                    <span>•</span>
                    <span>{selectedDoc.file_name}</span>
                    <span>•</span>
                    <span>{formatFileSize(selectedDoc.file_size)}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {selectedDoc.url && (
                  <a
                    href={selectedDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open in New Window</span>
                  </a>
                )}
                {selectedDoc.url && (
                  <a
                    href={selectedDoc.url}
                    download={selectedDoc.file_name || "certificate.pdf"}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#064e3b] hover:bg-[#059669] text-white text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                )}
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF Preview */}
            <div className="flex-1 bg-gray-100 relative min-h-[500px] overflow-hidden flex flex-col">
              {selectedDoc.url ? (
                <iframe
                  src={selectedDoc.url}
                  className="w-full flex-1 min-h-[600px] border-0"
                  title={selectedDoc.title}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm font-semibold">Document preview is not available</p>
                  <p className="text-xs text-gray-400 mt-1">Please try downloading or re-generating the file.</p>
                </div>
              )}
            </div>

            {/* Modal Footer Note */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 px-6 flex items-center justify-between text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Official Shariah Certificate signed & issued under platform custody.
              </span>
              {selectedDoc.url && (
                <a
                  href={selectedDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#059669] font-bold hover:underline"
                >
                  Preview not rendering? Click here to open directly
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
