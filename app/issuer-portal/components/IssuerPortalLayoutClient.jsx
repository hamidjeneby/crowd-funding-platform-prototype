"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import Sidebar from "./Sidebar";
import {
  Building2,
  Plus,
  ShieldAlert,
  Home,
  Clock,
  XCircle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";

export default function IssuerPortalLayoutClient({
  hasOrg,
  userRole,
  isOrgGatePassed,
  onboardingStatus,
  children,
}) {
  const pathname = usePathname();
  const clerk = useClerk();

  // 1. NO ORGANIZATION SESSION GATE: Issuers cannot operate on individual accounts
  if (!hasOrg) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6 text-[#064e3b]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 font-bold text-xs uppercase tracking-wider">
              Organization Required
            </span>
            <h1 className="text-2xl font-black text-[#064e3b]">
              You Are Not Part of an Organization
            </h1>
            <p className="text-xs text-[#064e3b]/80 leading-relaxed">
              Issuers cannot operate using individual accounts. To publish projects and manage funding, you must create or join an active Issuer Organization.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-3">
            <button
              onClick={() =>
                clerk.openCreateOrganization({
                  afterCreateOrganizationUrl: "/issuer-portal/onboarding",
                })
              }
              className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Organization & Onboard
            </button>

            <Link
              href="/"
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. USER ROLE GATE: Must be "issuer"
  if (userRole && userRole !== "issuer") {
    return (
      <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6 text-[#064e3b]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs uppercase tracking-wider">
              Access Restricted
            </span>
            <h1 className="text-2xl font-black text-[#064e3b]">
              Issuer Role Required
            </h1>
            <p className="text-xs text-[#064e3b]/80 leading-relaxed">
              Your account is registered as an Investor. This portal is strictly reserved for corporate Issuers.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-2">
            <Link
              href="/investor-portal"
              className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2"
            >
              Go to Investor Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. ORGANIZATION TYPE TRIPLE GATE: Org type must be "issuer"
  if (!isOrgGatePassed) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6 text-[#064e3b]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs uppercase tracking-wider">
              Invalid Workspace Type
            </span>
            <h1 className="text-2xl font-black text-[#064e3b]">
              Not an Issuer Organization
            </h1>
            <p className="text-xs text-[#064e3b]/80 leading-relaxed">
              Your active organization workspace is not registered as an Issuer Organization. Please switch to an Issuer organization or create a new one.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() =>
                clerk.openCreateOrganization({
                  afterCreateOrganizationUrl: "/issuer-portal/onboarding",
                })
              }
              className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Issuer Organization
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normalize onboarding status string
  const rawStatus = (onboardingStatus || "incomplete").toLowerCase().trim();
  const normalized = rawStatus.replace(/[-_]/g, " ").replace(/\s+/g, " ");

  // 4. ONBOARDING STATUS EVALUATION
  if (normalized.includes("pending")) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6 text-[#064e3b]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-xs uppercase tracking-wider">
              KYB Verification Under Review
            </span>
            <h1 className="text-2xl font-black text-[#064e3b]">
              Compliance Audit in Progress
            </h1>
            <p className="text-xs text-[#064e3b]/80 leading-relaxed">
              Your corporate KYB documentation and representative credentials have been submitted and are currently undergoing auditor verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (normalized === "incomplete" || normalized.includes("incomple") || normalized === "draft") {
    if (pathname === "/issuer-portal/onboarding") {
      return (
        <div className="flex min-h-screen">
          <div className="flex-1 overflow-x-hidden">{children}</div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6 text-[#064e3b]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 font-bold text-xs uppercase tracking-wider">
              Onboarding Incomplete
            </span>
            <h1 className="text-2xl font-black text-[#064e3b]">
              Complete Organization KYB
            </h1>
            <p className="text-xs text-[#064e3b]/80 leading-relaxed">
              Please complete your organization's corporate profile, representative verification, and bank details before accessing the Issuer Portal.
            </p>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <Link
              href="/issuer-portal/onboarding"
              className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2"
            >
              Complete Onboarding Form
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Approved / Completed: Render full portal with sidebar layout
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
