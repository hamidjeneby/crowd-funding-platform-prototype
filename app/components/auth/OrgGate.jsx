"use client";

import { useOrganization, useOrganizationList, CreateOrganization, OrganizationSwitcher, useUser } from "@clerk/nextjs";
import { Building2, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function OrgGate({
  children,
  title = "Organization Required",
  subtitle = "Please create or select an active organization workspace to proceed.",
  roleRequirement = "org:admin",
}) {
  const { isLoaded: isOrgLoaded, organization, membership } = useOrganization();
  const { isLoaded: isListLoaded, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { isLoaded: isUserLoaded, user } = useUser();

  const isLoaded = isOrgLoaded && isListLoaded && isUserLoaded;

  if (!isLoaded) {
    return (
      <div className="w-full max-w-md p-10 mx-auto glass rounded-3xl border border-[#059669]/15 shadow-2xl flex flex-col items-center justify-center gap-4 min-h-[380px]">
        <div className="w-10 h-10 border-3 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin" />
        <p className="text-[#064e3b] font-medium text-sm animate-pulse">
          Loading organization context...
        </p>
      </div>
    );
  }

  // If user does not have an active organization selected
  if (!organization) {
    const hasExistingOrgs = userMemberships && userMemberships.data && userMemberships.data.length > 0;

    return (
      <div className="w-full max-w-xl mx-auto py-8 px-4">
        <div className="glass rounded-3xl border border-[#059669]/20 shadow-2xl p-7 sm:p-9 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#059669] via-[#10b981] to-[#064e3b]" />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-[#059669] flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#064e3b] tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-[#064e3b]/70 mt-1.5 max-w-md">
              {subtitle}
            </p>
          </div>

          {hasExistingOrgs && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50/70 border border-[#059669]/20 flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-[#064e3b] uppercase tracking-wider">
                Select Active Organization
              </p>
              <OrganizationSwitcher
                hidePersonal={true}
                afterSelectOrganizationUrl="#"
                afterLeaveOrganizationUrl="#"
                appearance={{
                  elements: {
                    rootBox: "w-full flex justify-center",
                    organizationSwitcherTrigger:
                      "py-2.5 px-4 rounded-xl bg-white border border-[#064e3b]/20 text-[#064e3b] font-semibold text-sm shadow-sm",
                  },
                }}
              />
            </div>
          )}

          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-[#064e3b] uppercase tracking-wider mb-4">
              Create New Organization
            </p>
            <div className="w-full flex justify-center border border-[#059669]/15 rounded-2xl p-4 bg-white/70">
              <CreateOrganization
                afterCreateOrganizationUrl="#"
                appearance={{
                  elements: {
                    rootBox: "w-full max-w-full",
                    card: "shadow-none border-0 p-0 bg-transparent w-full",
                  },
                }}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-[#064e3b]/50 font-medium border-t border-[#064e3b]/10 pt-4">
            <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
            <span>Organization Creator Assigned <code className="text-[#059669] font-bold">org:admin</code> Role</span>
          </div>
        </div>
      </div>
    );
  }

  // Active organization exists: render child onboarding flow
  return children;
}
