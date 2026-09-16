"use client";

import { useEffect, useRef } from "react";
import { OrganizationSwitcher, useOrganization } from "@clerk/nextjs";
import { Building2 } from "lucide-react";

export default function OnboardingHeader({
  title = "Issuer Onboarding",
  subtitle = "Please complete your organization onboarding details below to access your issuer dashboard.",
}) {
  const { organization } = useOrganization();
  const prevOrgId = useRef(organization?.id);

  // Monitor active organization switching and redirect to /issuer-portal
  useEffect(() => {
    if (organization?.id && prevOrgId.current && organization.id !== prevOrgId.current) {
      window.location.href = "/issuer-portal";
    }
    prevOrgId.current = organization?.id;
  }, [organization?.id]);

  return (
    <div className="mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 bg-white/90 backdrop-blur-xl p-6 sm:p-7 rounded-3xl border border-[#059669]/20 shadow-md">
      <div className="flex-1 text-center md:text-left">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-[#064e3b] text-xs font-bold uppercase tracking-wider mb-2.5">
          <Building2 className="w-3.5 h-3.5 text-[#059669]" /> Corporate Workspace
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#064e3b] tracking-tight">{title}</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-[#064e3b]/75 max-w-xl leading-relaxed">
          {subtitle}
        </p>
      </div>

      {organization && (
        <div className="flex flex-col gap-2 flex-shrink-0 bg-gradient-to-b from-[#ecfdf5] to-[#f0fdf4] p-4 rounded-2xl border border-[#059669]/25 shadow-sm min-w-[240px]">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#064e3b] uppercase tracking-wider">
            <span>Active Workspace</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <OrganizationSwitcher
            hidePersonal={true}
            createOrganizationMode="modal"
            organizationProfileMode="modal"
            afterSelectOrganizationUrl="/issuer-portal"
            afterCreateOrganizationUrl="/issuer-portal"
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#059669]/25 text-[#064e3b] hover:bg-emerald-50/80 text-xs font-bold shadow-xs transition-all gap-2",
                organizationPreviewTextContainer: "font-semibold text-[#064e3b] text-xs truncate max-w-[150px]",
                organizationSwitcherTriggerIcon: "text-[#064e3b]",
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
