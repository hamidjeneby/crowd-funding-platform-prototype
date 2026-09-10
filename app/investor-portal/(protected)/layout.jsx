import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function ProtectedInvestorLayout({ children }) {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/investor/sign-in");
  }

  let investor = null;

  if (orgId) {
    // 1. Operating in Organization Context (Institutional Investor)
    const { data: instData } = await supabaseAdmin
      .from("investors")
      .select("onboarding_status")
      .eq("org_id", orgId)
      .maybeSingle();

    investor = instData;
  } else {
    // 2. Operating in Personal Context (Individual Investor)
    const { data: indData } = await supabaseAdmin
      .from("investors")
      .select("onboarding_status")
      .eq("user_id", userId)
      .maybeSingle();

    investor = indData;
  }

  const isFullyOnboarded =
    investor?.onboarding_status && investor.onboarding_status !== "incomplete";

  if (!isFullyOnboarded) {
    redirect("/investor-portal/onboarding");
  }

  return <>{children}</>;
}
