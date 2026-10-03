"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ShieldCheck, UserCheck } from "lucide-react";

export default function AuditorPortalLayoutClient({ userRole, auditor, children }) {
  if (userRole === "invalid") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#fcfbf7] text-gray-900 flex flex-col">
      {/* Header Bar */}
      <header className="bg-[#041d16] border-b border-[#059669]/20 text-[#fdfbf7] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/auditor-portal"
              className="flex items-center gap-2 text-base font-extrabold tracking-tight text-white hover:text-emerald-300 transition-colors"
            >
              <svg
                className="w-6 h-6 filter drop-shadow-[0_2px_8px_rgba(52,211,153,0.4)]"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9 9H15L17 2H7L9 9Z" fill="#a7f3d0" />
                <path d="M7 2L9 9H2L7 2Z" fill="#34d399" />
                <path d="M17 2L15 9H22L17 2Z" fill="#059669" />
                <path d="M9 9H15L12 22L9 9Z" fill="#10b981" />
                <path d="M2 9H9L12 22L2 9Z" fill="#065f46" />
                <path d="M15 9H22L12 22L15 9Z" fill="#047857" />
              </svg>
              <span>Jade Fortune</span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-[#34d399]" /> Auditor Workspace
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-200/80 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-xl">
              <UserCheck className="w-3.5 h-3.5 text-[#34d399]" />
              <span>
                {auditor?.first_name ? `${auditor.first_name} ${auditor.last_name || ""}`.trim() : auditor?.email || "Auditor Account"}
              </span>
            </div>
            <UserButton afterSignOutUrl="/auditor/sign-in" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/80 bg-white py-4 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Jade Fortune &bull; Auditor Verification & Compliance Portal
      </footer>
    </div>
  );
}
