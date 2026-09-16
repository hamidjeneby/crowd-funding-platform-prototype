"use client";

import Link from "next/link";
import {
  ShieldAlert,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Home,
  Headphones,
  FileEdit,
  UserCheck
} from "lucide-react";

// 1. Triple Gate Check Failed (Role / Org Metadata / Org Table Type Mismatch)
export function NoAccessRoleView({ title, message }) {
  return (
    <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs uppercase tracking-wider">
            Access Restricted
          </span>
          <h1 className="text-2xl font-black text-[#064e3b]">
            {title || "No Access To This Dashboard"}
          </h1>
          <p className="text-xs text-[#064e3b]/80 leading-relaxed">
            {message || "You are not permitted to access this page or dashboard entirely. Your account role or active organization workspace does not have access privileges for the Investor Portal."}
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <Link
            href="/"
            className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// 2. Onboarding Incomplete
export function OnboardingIncompleteView() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#059669]/20 shadow-xl text-center space-y-6 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto">
          <UserCheck className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs uppercase tracking-wider border border-emerald-200">
            Action Required
          </span>
          <h1 className="text-2xl font-black text-[#064e3b]">
            Onboarding Required
          </h1>
          <p className="text-xs text-[#064e3b]/75 leading-relaxed">
            You must complete your onboarding in order to access this page and participate in investment campaigns.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <Link
            href="/investor-portal/onboarding"
            className="w-full py-3.5 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2"
          >
            Complete Onboarding <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// 3. Onboarding Pending Review
export function OnboardingPendingReviewView() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-pulse">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 font-bold text-xs uppercase tracking-wider border border-amber-200">
            Pending Compliance Review
          </span>
          <h1 className="text-2xl font-black text-[#064e3b]">
            Under Review
          </h1>
          <p className="text-xs text-[#064e3b]/80 leading-relaxed">
            Your onboarding documents are under review, you will be given access to the portal once the review process is complete, this usually takes less than 24 hours.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100 space-y-2.5">
          <Link
            href="/"
            className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Return to Home
          </Link>
          <Link
            href="/contact"
            className="w-full py-2.5 rounded-xl bg-gray-50 text-gray-700 font-semibold text-xs hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-gray-200"
          >
            <Headphones className="w-4 h-4" /> Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

// 4. Onboarding Rejected
export function OnboardingRejectedView() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-red-50 text-red-800 font-bold text-xs uppercase tracking-wider border border-red-200">
            Application Rejected
          </span>
          <h1 className="text-2xl font-black text-[#064e3b]">
            Access Not Permitted
          </h1>
          <p className="text-xs text-[#064e3b]/80 leading-relaxed">
            Unfortunately your onboarding documents were rejected and you are not permitted to access this dashboard, if you believe this is an error please contact support.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100 space-y-2.5">
          <Link
            href="/"
            className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Back to Home
          </Link>
          <Link
            href="/contact"
            className="w-full py-2.5 rounded-xl bg-red-50 text-red-700 font-semibold text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-200"
          >
            <Headphones className="w-4 h-4" /> Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

// 5. Onboarding Returned After Review (Flagged)
export function OnboardingReturnedView() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-300 shadow-xl text-center space-y-6 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 font-bold text-xs uppercase tracking-wider border border-amber-200">
            Correction Needed
          </span>
          <h1 className="text-2xl font-black text-[#064e3b]">
            Onboarding Flagged
          </h1>
          <p className="text-xs text-[#064e3b]/80 leading-relaxed">
            Your onboarding was flagged, kindly go back to the onboarding form to correct the flagged details or records.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <Link
            href="/investor-portal/onboarding"
            className="w-full py-3.5 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <FileEdit className="w-4 h-4" /> Return to Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
