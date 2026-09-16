"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import {
  NoAccessRoleView,
  OnboardingIncompleteView,
  OnboardingPendingReviewView,
  OnboardingRejectedView,
  OnboardingReturnedView
} from "./StatusViews";

export default function InvestorPortalLayoutClient({
  userRole,
  onboardingStatus,
  children
}) {
  const pathname = usePathname();

  // 1. Role Check: If role is anything except investor
  if (userRole && userRole !== "investor") {
    return <NoAccessRoleView />;
  }

  // Normalize onboarding status string (handles "pending review", "pending-review", "pending_review", etc.)
  const rawStatus = (onboardingStatus || "incomplete").toLowerCase().trim();
  const normalized = rawStatus.replace(/[-_]/g, " ").replace(/\s+/g, " ");

  // 2. Pending Review Check (matches "pending review", "pending-review", "pending_review", "pending", etc.)
  if (
    normalized === "pending review" ||
    normalized === "pending" ||
    normalized.includes("pending")
  ) {
    return <OnboardingPendingReviewView />;
  }

  // 3. Rejected Check (matches "rejected", "reject")
  if (normalized === "rejected" || normalized.includes("reject")) {
    return <OnboardingRejectedView />;
  }

  // 4. Returned After Review Check (matches "returned", "returned review", "returned after review", "returned for edits", "flagged")
  if (
    normalized.includes("return") ||
    normalized.includes("flag") ||
    normalized === "returned"
  ) {
    if (pathname === "/investor-portal/onboarding") {
      return (
        <div className="flex min-h-screen">
          <div className="flex-1 overflow-x-hidden">{children}</div>
        </div>
      );
    }
    return <OnboardingReturnedView />;
  }

  // 5. Incomplete Check (matches "incomplete", "draft", empty status)
  if (
    normalized === "incomplete" ||
    normalized.includes("incomple") ||
    normalized === "draft"
  ) {
    if (pathname === "/investor-portal/onboarding") {
      return (
        <div className="flex min-h-screen">
          <div className="flex-1 overflow-x-hidden">{children}</div>
        </div>
      );
    }
    return <OnboardingIncompleteView />;
  }

  // 6. Approved / Completed / Verified: Render full dashboard layout
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
