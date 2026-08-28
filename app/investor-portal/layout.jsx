import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "./components/Sidebar";

export default async function InvestorPortalLayout({ children }) {
  const user = await currentUser();

  if (!user) {
    redirect("/investor/sign-in");
  }

  const role = user.publicMetadata?.role || user.unsafeMetadata?.role;

  // Strict role checking: If they are explicitly an issuer, send them to their portal.
  if (role === "issuer") {
    redirect("/issuer-portal");
  }

  // If role is missing (edge case) or 'investor', allow them to proceed.
  if (role !== "investor" && role !== undefined) {
    redirect("/");
  }

  // Check if DB sync is complete
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data } = await supabaseAdmin
    .from("users")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    // Webhook hasn't completed yet, send them to sign-in page to poll
    redirect("/investor/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
