import { currentUser, auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { syncOrganizationTypeAndMetadata } from "@/app/actions/organization";
import IssuerPortalLayoutClient from "./components/IssuerPortalLayoutClient";

export default async function IssuerPortalLayout({ children }) {
  const user = await currentUser();
  const { userId, orgId } = await auth();

  if (!user || !userId) {
    redirect("/issuer/sign-in");
  }

  // 1. GATE 1: Clerk User Metadata Gate (Must be issuer)
  const userRole = user.publicMetadata?.role || user.unsafeMetadata?.role;

  let isOrgMetaGatePassed = true;
  let isOrgDbGatePassed = true;
  let issuer = null;

  if (orgId) {
    // 2. GATE 2: Clerk Organization Metadata Gate
    try {
      const client = await clerkClient();
      const clerkOrg = await client.organizations.getOrganization({ organizationId: orgId });
      const orgTypeMeta = clerkOrg?.publicMetadata?.type || clerkOrg?.publicMetadata?.role;
      if (!orgTypeMeta) {
        await syncOrganizationTypeAndMetadata(orgId, "issuer");
      } else if (orgTypeMeta !== "issuer") {
        isOrgMetaGatePassed = false;
      }
    } catch (err) {
      console.error("Error fetching Clerk organization metadata in issuer layout:", err);
    }

    // 3. GATE 3: Supabase Organizations Table Gate
    const { data: orgData } = await supabaseAdmin
      .from("organizations")
      .select("type")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!orgData) {
      await syncOrganizationTypeAndMetadata(orgId, "issuer");
    } else if (orgData.type !== "issuer") {
      isOrgDbGatePassed = false;
    }

    // Fetch issuer record
    const { data: issuerData } = await supabaseAdmin
      .from("issuers")
      .select("onboarding_status")
      .eq("org_id", orgId)
      .maybeSingle();

    if (issuerData) {
      issuer = issuerData;
    }
  }

  const isOrgGatePassed = isOrgMetaGatePassed && isOrgDbGatePassed;
  const onboardingStatus = issuer?.onboarding_status || "incomplete";

  return (
    <IssuerPortalLayoutClient
      hasOrg={Boolean(orgId)}
      userRole={userRole}
      isOrgGatePassed={isOrgGatePassed}
      onboardingStatus={onboardingStatus}
    >
      {children}
    </IssuerPortalLayoutClient>
  );
}
