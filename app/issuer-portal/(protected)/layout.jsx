import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function ProtectedIssuerLayout({ children }) {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/issuer/sign-in");
  }

  // Issuers MUST be a part of an organization (org_id is strictly required)
  if (!orgId) {
    redirect("/issuer-portal/onboarding");
  }

  const { data: issuer } = await supabaseAdmin
    .from("issuers")
    .select("onboarding_status")
    .eq("org_id", orgId)
    .maybeSingle();

  const rawStatus = (issuer?.onboarding_status || "").toLowerCase().trim();
  const isFullyOnboarded = rawStatus === "completed" || rawStatus === "approved";

  if (!isFullyOnboarded) {
    redirect("/issuer-portal/onboarding");
  }

  return <>{children}</>;
}
