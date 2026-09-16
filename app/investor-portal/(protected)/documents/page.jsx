import { getInvestorPortalData } from "@/app/actions/investor-portal";
import { ShieldCheck, FileText } from "lucide-react";

export default async function DocumentsPage() {
  await getInvestorPortalData();

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#059669]/15 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
          <ShieldCheck className="w-4 h-4" /> Document Vault
        </div>
        <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
          Investment & Pledge Documents
        </h1>
        <p className="text-sm text-[#064e3b]/70 mt-0.5">
          Access your official pledge confirmations, contract notes, subscription agreements, and tax certificates generated per investment.
        </p>
      </div>

      {/* Empty State / Document Vault Content */}
      <div className="p-10 rounded-2xl bg-white border border-dashed border-[#059669]/25 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#059669] flex items-center justify-center">
          <FileText className="w-7 h-7" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="text-base font-bold text-[#064e3b]">No Investment Documents Yet</h3>
          <p className="text-xs text-[#064e3b]/70">
            When you complete investments and pledges, your official contract notes, share certificates, and pledge receipts will automatically populate here.
          </p>
        </div>
      </div>
    </div>
  );
}
