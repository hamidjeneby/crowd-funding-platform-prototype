import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export default async function ProtectedInvestorLayout({ children }) {
  const user = await currentUser();

  if (!user) return null;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const { data } = await supabaseAdmin
    .from("investors")
    .select("onboarding_status")
    .eq("user_id", user.id)
    .single();

  const isFullyOnboarded = data?.onboarding_status && data.onboarding_status !== "incomplete";

  if (!isFullyOnboarded) {
    redirect("/investor-portal/onboarding");
  }

  return <>{children}</>;
}
