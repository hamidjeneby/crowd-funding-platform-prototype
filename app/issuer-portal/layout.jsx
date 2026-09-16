import { currentUser, auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { syncOrganizationTypeAndMetadata } from "@/app/actions/organization";
import Sidebar from "./components/Sidebar";
import Link from "next/link";
import { ShieldAlert, Home } from "lucide-react";

export default async function IssuerPortalLayout({ children }) {
  const user = await currentUser();
  const { userId, orgId } = await auth();

  if (!user || !userId) {
    redirect("/issuer/sign-in");
  }

  // ----------------------------------------------------
  // GATE 1: Clerk User Metadata Gate (Must be issuer)
  // ----------------------------------------------------
  const userRole = user.publicMetadata?.role || user.unsafeMetadata?.role;
  const isUserGatePassed = userRole === "issuer";

  // ----------------------------------------------------
  // GATE 2: Clerk Organization Metadata Gate
  // ----------------------------------------------------
  let isOrgMetaGatePassed = true;
  let clerkOrg = null;

  if (orgId) {
    try {
      const client = await clerkClient();
      clerkOrg = await client.organizations.getOrganization({ organizationId: orgId });
      const orgTypeMeta = clerkOrg?.publicMetadata?.type || clerkOrg?.publicMetadata?.role;
      if (orgTypeMeta && orgTypeMeta !== "issuer") {
        isOrgMetaGatePassed = false;
      }
    } catch (err) {
      console.error("Error fetching Clerk organization metadata in issuer layout:", err);
    }
  }

  // ----------------------------------------------------
  // GATE 3: Supabase Organizations Table Gate
  // ----------------------------------------------------
  let isOrgDbGatePassed = true;

  if (orgId) {
    const { data: orgData } = await supabaseAdmin
      .from("organizations")
      .select("type")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!orgData) {
      await syncOrganizationTypeAndMetadata(orgId, "issuer");
    } else if (orgData.type !== "issuer") {
      isOrgDbGatePassed = false;
    } else {
      if (!clerkOrg?.publicMetadata?.type) {
        await syncOrganizationTypeAndMetadata(orgId, "issuer");
      }
    }
  }

  // ----------------------------------------------------
  // TRIPLE GATE EVALUATION: Gate 1 AND Gate 2 AND Gate 3 MUST pass
  // DO NOT REDIRECT OUT: Render access restricted card on page!
  // ----------------------------------------------------
  const isTripleGatePassed = isUserGatePassed && isOrgMetaGatePassed && isOrgDbGatePassed;

  if (!isTripleGatePassed) {
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
              No Access To Issuer Portal
            </h1>
            <p className="text-xs text-[#064e3b]/80 leading-relaxed">
              You are not permitted to access this page or portal entirely. Your account role or active organization workspace does not have access privileges for the Issuer Portal.
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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
