import { currentUser, auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { syncOrganizationTypeAndMetadata } from "@/app/actions/organization";
import InvestorPortalLayoutClient from "./components/InvestorPortalLayoutClient";

export default async function InvestorPortalLayout({ children }) {
  const user = await currentUser();
  const { userId, orgId } = await auth();

  // Authentication Check: Redirect unauthenticated users to sign-in
  if (!user || !userId) {
    redirect("/investor/sign-in");
  }

  // ====================================================================
  // GATE 1: User Metadata Gate
  // Verifies that the user's role metadata is "investor".
  // ====================================================================
  const userRole = user.publicMetadata?.role || user.unsafeMetadata?.role;
  const isGate1Passed = userRole === "investor";

  // ====================================================================
  // GATE 2 & GATE 3: Organization Verification (when operating in orgId context)
  // ====================================================================
  let isGate2Passed = true; // Clerk Organization Metadata Gate
  let isGate3Passed = true; // Supabase Organizations Table Gate
  let investor = null;

  if (orgId) {
    // ----------------------------------------------------
    // GATE 2: Clerk Organization Metadata Gate
    // ----------------------------------------------------
    let clerkOrg = null;
    try {
      const client = await clerkClient();
      clerkOrg = await client.organizations.getOrganization({ organizationId: orgId });
    } catch (err) {
      console.error("Error fetching Clerk organization in layout:", err);
    }

    const orgTypeMeta = clerkOrg?.publicMetadata?.type || clerkOrg?.publicMetadata?.role;

    if (!orgTypeMeta) {
      // If metadata is uninitialized, auto-tag new investor organization
      await syncOrganizationTypeAndMetadata(orgId, "investor");
    } else if (orgTypeMeta !== "investor") {
      isGate2Passed = false;
    }

    // ----------------------------------------------------
    // GATE 3: Supabase Organizations Table Gate
    // Matches org_id to the organizations table and verifies row.type === "investor".
    // ----------------------------------------------------
    const { data: orgData } = await supabaseAdmin
      .from("organizations")
      .select("type")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!orgData) {
      // Auto-insert newly created organization as investor
      await syncOrganizationTypeAndMetadata(orgId, "investor");
    } else if (orgData.type !== "investor") {
      isGate3Passed = false;
    }

    // Fetch institutional investor record if org gates passed
    if (isGate2Passed && isGate3Passed) {
      const { data: instData } = await supabaseAdmin
        .from("investors")
        .select("onboarding_status")
        .eq("org_id", orgId)
        .maybeSingle();

      if (instData) investor = instData;
    }
  } else {
    // Individual investor context (no org active)
    const { data: indData } = await supabaseAdmin
      .from("investors")
      .select("onboarding_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (indData) investor = indData;
  }

  // ====================================================================
  // TRIPLE GATE EVALUATION
  // If ANY gate fails (Gate 1 OR Gate 2 OR Gate 3), show the error view!
  // ONLY if ALL THREE GATES PASS is access granted.
  // ====================================================================
  const areAllGatesPassed = isGate1Passed && isGate2Passed && isGate3Passed;

  if (!areAllGatesPassed) {
    return (
      <InvestorPortalLayoutClient
        userRole="invalid"
        onboardingStatus="incomplete"
      >
        {children}
      </InvestorPortalLayoutClient>
    );
  }

  const onboardingStatus = investor?.onboarding_status || "incomplete";

  return (
    <InvestorPortalLayoutClient
      userRole={userRole}
      onboardingStatus={onboardingStatus}
    >
      {children}
    </InvestorPortalLayoutClient>
  );
}
