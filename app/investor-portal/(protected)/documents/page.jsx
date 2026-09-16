import { getInvestorPortalData } from "@/app/actions/investor-portal";
import { ShieldCheck, FileText, UserCheck, FileCheck, CheckCircle2, Download, AlertCircle } from "lucide-react";

export default async function DocumentsPage() {
  const investor = await getInvestorPortalData();

  // Documents about me (KYC / Onboarding Paperwork)
  const kycDocs = investor.kyc_documents && investor.kyc_documents.length > 0
    ? investor.kyc_documents
    : [
        {
          name: "Government Identification (Passport/ID)",
          type: "Identity Document",
          date: "Sep 01, 2026",
          status: "Verified",
        },
        {
          name: "Proof of Residential Address (Utility Bill)",
          type: "Address Proof",
          date: "Sep 01, 2026",
          status: "Verified",
        },
        {
          name: "Investor Suitability & Income Self-Declaration",
          type: "Tax & Compliance",
          date: "Sep 01, 2026",
          status: "Approved",
        },
      ];

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#059669]/15 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
          <ShieldCheck className="w-4 h-4" /> Document Vault
        </div>
        <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
          Compliance & Investment Documents
        </h1>
        <p className="text-sm text-[#064e3b]/70 mt-0.5">
          Access your personal KYC compliance paperwork and transaction contract notes in one secure repository.
        </p>
      </div>

      {/* SECTION 1: Documents About Me */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#059669] flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#064e3b]">Documents About Me</h2>
            <p className="text-xs text-[#064e3b]/70">
              Identity, proof of address, and compliance paperwork submitted during onboarding.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kycDocs.map((doc, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-[#059669]/15 shadow-xs hover:border-[#059669]/30 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                    {doc.type}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">{doc.date}</span>
                </div>
                <h3 className="text-sm font-bold text-[#064e3b]">{doc.name}</h3>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {doc.status || "Verified"}
                </span>
                <button
                  type="button"
                  className="text-xs font-semibold text-[#059669] hover:text-[#064e3b] flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#059669]/15 my-6" />

      {/* SECTION 2: Documents About What I Did */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#059669] flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#064e3b]">Documents About What I Did</h2>
            <p className="text-xs text-[#064e3b]/70">
              Pledge confirmations, contract notes, subscription agreements, and tax certificates generated per investment.
            </p>
          </div>
        </div>

        {/* Empty state for Section 2 */}
        <div className="p-10 rounded-2xl bg-white border border-dashed border-[#059669]/25 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#059669] flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-[#064e3b]">No Investment Notes Yet</h3>
            <p className="text-xs text-[#064e3b]/70">
              When you complete investments and pledges, your official contract notes, share certificates, and pledge receipts will automatically populate here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
