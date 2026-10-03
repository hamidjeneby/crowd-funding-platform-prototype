import { ShieldCheck, Clock } from "lucide-react";

export default function AuditorPortalPage() {
  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-[#059669]" /> Compliance & Oversight
          </div>
          <h1 className="text-2xl font-extrabold text-[#064e3b]">Auditor Portal</h1>
          <p className="text-xs text-gray-500">
            Welcome to the platform auditing and verification center.
          </p>
        </div>
      </div>

      {/* Blank / Placeholder Canvas */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center text-gray-400 space-y-3 shadow-xs">
        <Clock className="w-10 h-10 mx-auto text-emerald-600/40" />
        <h3 className="text-sm font-bold text-gray-700">Auditor Dashboard Workspace</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
          This workspace is protected and initialized. Modules for auditing milestone submissions and compliance verification will appear here.
        </p>
      </div>
    </div>
  );
}
