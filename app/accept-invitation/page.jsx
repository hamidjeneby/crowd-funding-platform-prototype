"use client";

import { useEffect, useState, Suspense } from "react";
import { useUser, useOrganization, useOrganizationList, SignUp } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Building2, ArrowRight, ShieldCheck, Sparkles, LayoutDashboard, UserCheck, KeyRound } from "lucide-react";
import { getOrganizationTypeAndSyncRole } from "@/app/actions/organization";

function AcceptInvitationContent() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const { isLoaded: isListLoaded, userInvitations, setActive } = useOrganizationList({
    userInvitations: { infinite: true },
  });
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState("idle"); // "idle" | "accepting" | "success"
  const [joinedOrgName, setJoinedOrgName] = useState("");
  const [syncedRole, setSyncedRole] = useState(null);

  const clerkTicket = searchParams.get("__clerk_ticket") || searchParams.get("ticket");
  const fallbackRole = user?.publicMetadata?.role || user?.unsafeMetadata?.role || "investor";
  const effectiveRole = syncedRole || fallbackRole;
  const orgNameParam = searchParams.get("orgName") || searchParams.get("org");

  useEffect(() => {
    async function handleInvitation() {
      if (!isUserLoaded || !isOrgLoaded || !isListLoaded) return;

      if (!isSignedIn) {
        if (!clerkTicket) {
          const currentUrl = typeof window !== "undefined" ? window.location.href : "";
          router.push(`/investor/sign-in?redirect_url=${encodeURIComponent(currentUrl)}`);
        }
        return;
      }

      let activeOrgId = organization?.id;

      // Process pending invitation if available
      if (userInvitations?.data && userInvitations.data.length > 0) {
        setStatus("accepting");
        try {
          const firstInvitation = userInvitations.data[0];
          setJoinedOrgName(firstInvitation.publicOrganizationData?.name || "Organization");
          const accepted = await firstInvitation.accept();
          if (accepted?.publicOrganizationData?.id && setActive) {
            activeOrgId = accepted.publicOrganizationData.id;
            await setActive({ organization: activeOrgId });
          }
        } catch (err) {
          console.error("Error accepting organization invitation:", err);
          if (organization?.name) {
            setJoinedOrgName(organization.name);
          }
        }
      } else {
        if (organization?.name) {
          setJoinedOrgName(organization.name);
        } else if (orgNameParam) {
          setJoinedOrgName(orgNameParam);
        }
      }

      // Sync role dynamically based on active organization type
      if (activeOrgId && user?.id) {
        try {
          const { role: newRole } = await getOrganizationTypeAndSyncRole(activeOrgId, user.id);
          if (newRole) {
            setSyncedRole(newRole);
          }
        } catch (syncErr) {
          console.error("Error syncing role in accept-invitation:", syncErr);
        }
      }

      setStatus("success");
    }

    handleInvitation();
  }, [isUserLoaded, isOrgLoaded, isListLoaded, isSignedIn, userInvitations, organization, orgNameParam, clerkTicket, router, setActive, user]);

  // Loading state
  if (!isUserLoaded || !isOrgLoaded || !isListLoaded || (isSignedIn && status === "accepting")) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#fdfbf7] p-4">
        <div className="w-full max-w-md p-10 glass rounded-3xl border border-[#059669]/20 shadow-2xl flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin" />
          <h2 className="text-xl font-bold text-[#064e3b]">Joining Organization...</h2>
          <p className="text-sm text-[#064e3b]/70 animate-pulse">
            Processing your organization invitation details...
          </p>
        </div>
      </div>
    );
  }

  // If user is not signed in and has a ticket token from an email link, render Clerk SignUp/SignIn with ticket
  if (!isSignedIn && clerkTicket) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center bg-[#fdfbf7] p-4">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-[#059669] flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#064e3b]">Accept Organization Invitation</h1>
          <p className="text-sm text-[#064e3b]/70 mt-1 max-w-md">
            Please sign in or create an account to accept your organization invitation.
          </p>
        </div>

        <SignUp
          routing="hash"
          ticket={clerkTicket}
          fallbackRedirectUrl="/accept-invitation"
          forceRedirectUrl="/accept-invitation"
          signInUrl="/investor/sign-in"
          unsafeMetadata={{ role: "issuer" }}
        />
      </div>
    );
  }

  const targetPortal = effectiveRole === "issuer" ? "/issuer-portal" : "/investor-portal";
  const portalLabel = effectiveRole === "issuer" ? "Go to Issuer Portal" : "Go to Investor Portal";
  const displayOrgName = joinedOrgName || organization?.name || "the Organization";

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-[#fdfbf7] p-4 sm:p-6">
      <div className="w-full max-w-xl glass rounded-3xl border border-[#059669]/25 shadow-2xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#059669] via-[#34d399] to-[#064e3b]" />

        {/* Success Icon Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100/80 border-2 border-[#059669]/30 flex items-center justify-center text-[#059669] shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-[#059669]" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#064e3b] text-emerald-300 p-1.5 rounded-full shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          {/* Subheading Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-[#064e3b] text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" /> Invitation Accepted
          </span>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#064e3b] tracking-tight">
            Welcome Aboard!
          </h1>

          <p className="text-base text-[#064e3b]/80 mt-3 max-w-md leading-relaxed">
            You have successfully joined <span className="font-bold text-[#064e3b] underline decoration-[#059669]/40">{displayOrgName}</span> on Jade Fortune.
          </p>
        </div>

        {/* Organization & Role Info Card */}
        <div className="my-8 p-5 rounded-2xl bg-white/80 border border-[#059669]/15 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#064e3b]/70 font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#059669]" /> Organization
            </span>
            <span className="font-bold text-[#064e3b] truncate max-w-[200px]">
              {displayOrgName}
            </span>
          </div>

          <div className="border-t border-[#059669]/10 pt-3 flex items-center justify-between text-sm">
            <span className="text-[#064e3b]/70 font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#059669]" /> User Role
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#064e3b] text-emerald-100 font-semibold text-xs capitalize">
              {effectiveRole}
            </span>
          </div>

          {user?.primaryEmailAddress?.emailAddress && (
            <div className="border-t border-[#059669]/10 pt-3 flex items-center justify-between text-sm">
              <span className="text-[#064e3b]/70 font-medium">Account</span>
              <span className="text-[#064e3b]/90 text-xs font-medium truncate max-w-[220px]">
                {user.primaryEmailAddress.emailAddress}
              </span>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-col gap-3">
          <Link
            href={targetPortal}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#059669] to-[#064e3b] border-b-[3px] border-[#033527] shadow-lg hover:brightness-110 active:translate-y-[1px] active:border-b-[1.5px] transition-all text-base"
          >
            <LayoutDashboard className="w-5 h-5" />
            {portalLabel}
            <ArrowRight className="w-5 h-5 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center bg-[#fdfbf7]">
          <div className="w-10 h-10 border-4 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
