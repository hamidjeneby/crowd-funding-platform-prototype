"use client";

import { FileText, ExternalLink, ShieldCheck, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export default function DocumentsTab({ documents = [] }) {
  const DOC_LABELS = {
    pitch_deck: "Pitch Deck Presentation",
    balance_sheet: "Audited Financials / Balance Sheet",
    valuation_report: "SPV Independent Valuation Report",
    cap_table: "Cap Table & Shareholder Breakdown",
    spv_registration: "SPV Registration & Incorporation Document",
    shariah_certificate: "Sharia Compliance Certificate",
    other: "Supporting Document / Annexure",
  };

  function getDocLabel(docType) {
    return DOC_LABELS[docType] || docType?.replace("_", " ") || "Document";
  }

  function formatUtcDate(dateStr) {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  function getStatusBadge(reviewStatus) {
    const status = (reviewStatus || "pending").toLowerCase();
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#064e3b] font-extrabold text-[11px] uppercase border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-[#059669]" /> Approved & Cleared
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-extrabold text-[11px] uppercase border border-red-300">
            <AlertTriangle className="w-3 h-3 text-red-600" /> Changes Requested / Rejected
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[11px] uppercase border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Auditor Review
          </span>
        );
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#059669]" /> Project Document Repository
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Displaying all submitted compliance documents and their platform verification status.
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 self-start sm:self-auto">
          Read-Only View
        </span>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500 space-y-2">
          <FileText className="w-10 h-10 mx-auto text-gray-300" />
          <p className="text-xs font-semibold">No project documents uploaded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-extrabold text-[10px] bg-gray-50/50">
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4">Uploaded Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {documents.map((doc) => (
                <tr key={doc.id || doc.file_url} className="hover:bg-[#fdfbf7] transition-all">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-[#064e3b] block">
                          {getDocLabel(doc.doc_type)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {doc.doc_type}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">{getStatusBadge(doc.review_status)}</td>

                  <td className="py-3.5 px-4 text-gray-600">{formatUtcDate(doc.uploaded_at)}</td>

                  <td className="py-3.5 px-4 text-right">
                    {doc.signedUrl || doc.file_url ? (
                      <a
                        href={doc.signedUrl || doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#064e3b] text-white rounded-xl text-xs font-bold hover:bg-[#047857] transition-all shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Document
                      </a>
                    ) : (
                      <span className="text-gray-400 text-[11px]">URL Unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
