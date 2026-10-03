import { currentUser, auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import AuditorPortalLayoutClient from "./components/AuditorPortalLayoutClient";

export default async function AuditorPortalLayout({ children }) {
  const user = await currentUser();
  const { userId } = await auth();

  // Authentication Check: Redirect unauthenticated users to sign-in
  if (!user || !userId) {
    redirect("/auditor/sign-in");
  }

  // ====================================================================
  // GATE 1: User Metadata Gate
  // Verifies that the user's role metadata is "auditor".
  // ====================================================================
  const userRole = user.publicMetadata?.role || user.unsafeMetadata?.role;
  const isGatePassed = userRole === "auditor";

  let auditor = null;

  if (isGatePassed) {
    // 1. Fetch internal integer ID from users table
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (userRow) {
      // 2. Fetch individual auditor profile record using integer user_id foreign key
      const { data: auditorData } = await supabaseAdmin
        .from("auditors")
        .select("*")
        .eq("user_id", userRow.id)
        .maybeSingle();

      if (auditorData) {
        auditor = auditorData;
      }
    }
  }

  if (!isGatePassed) {
    return (
      <AuditorPortalLayoutClient userRole="invalid" auditor={null}>
        <div className="min-h-screen bg-[#041d16] flex items-center justify-center p-6 text-white text-center">
          <div className="max-w-md bg-[#062c22] border border-red-500/30 rounded-3xl p-8 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-red-400">Access Restricted</h2>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              Your account does not have auditor clearance. Please sign in with an authorized auditor account.
            </p>
          </div>
        </div>
      </AuditorPortalLayoutClient>
    );
  }

  return (
    <AuditorPortalLayoutClient userRole={userRole} auditor={auditor}>
      {children}
    </AuditorPortalLayoutClient>
  );
}
