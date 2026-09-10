"use client";

import { useState } from "react";
import { useOrganization, useOrganizationList, CreateOrganization, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck, ArrowRight, Plus, CheckCircle2, UserCheck } from "lucide-react";

export default function OrgGate({
  children,
  title = "Organization Required",
  subtitle = "Please select an existing workspace or create a new organization to proceed.",
  redirectUrl = "#",
}) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const { isLoaded: isListLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { isLoaded: isUserLoaded } = useUser();
  const router = useRouter();

  const [mode, setMode] = useState("select"); // "select" | "create"
  const [selectingOrgId, setSelectingOrgId] = useState(null);

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

  // Handle direct selection of an existing organization
  const handleSelectOrg = async (orgId) => {
    setSelectingOrgId(orgId);
    try {
      if (setActive) {
        await setActive({ organization: orgId });
      }
      if (redirectUrl && redirectUrl !== "#") {
        router.push(redirectUrl);
      }
    } catch (err) {
      console.error("Error switching organization:", err);
    } finally {
      setSelectingOrgId(null);
    }
  };

  // If user does not have an active organization selected
  if (!organization) {
    const existingMemberships = userMemberships?.data || [];
    const hasExistingOrgs = existingMemberships.length > 0;

    return (
      <div className="w-full max-w-xl mx-auto py-8 px-4">
        <div className="glass rounded-3xl border border-[#059669]/20 shadow-2xl p-7 sm:p-9 relative overflow-hidden backdrop-blur-xl">
          {/* Accent Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#059669] via-[#10b981] to-[#064e3b]" />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-[#059669] flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#064e3b] tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-[#064e3b]/70 mt-1.5 max-w-md">
              {hasExistingOrgs
                ? "Select one of your existing organizations below, or create a new organization."
                : subtitle}
            </p>
          </div>

          {/* If user has existing organizations */}
          {hasExistingOrgs && mode === "select" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[#064e3b] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" /> Select Your Organization
                </span>
                <span className="text-xs text-[#064e3b]/60 font-medium">
                  {existingMemberships.length} workspace{existingMemberships.length > 1 ? "s" : ""} available
                </span>
              </div>

              {/* Organization Cards List */}
              <div className="space-y-3">
                {existingMemberships.map((mem) => {
                  const org = mem.organization;
                  const isSelecting = selectingOrgId === org.id;

                  return (
                    <div
                      key={org.id}
                      className="p-4 rounded-2xl bg-white/90 border border-[#059669]/20 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {org.imageUrl ? (
                          <img
                            src={org.imageUrl}
                            alt={org.name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#059669]/20 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-[#064e3b] font-bold text-base flex items-center justify-center flex-shrink-0">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-[#064e3b] text-base truncate">
                            {org.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-xs text-[#064e3b]/60 capitalize font-medium">
                            <UserCheck className="w-3 h-3 text-[#059669]" />
                            {mem.role ? mem.role.replace("org:", "") : "Member"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectOrg(org.id)}
                        disabled={isSelecting}
                        className="px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#059669] to-[#064e3b] hover:brightness-110 shadow-sm active:translate-y-[1px] transition-all flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                      >
                        {isSelecting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            Select & Continue
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Secondary Option: Create New Organization */}
              <div className="pt-4 border-t border-[#064e3b]/10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className="w-full py-3 rounded-xl border border-dashed border-[#059669]/40 text-[#064e3b] font-semibold text-sm hover:bg-emerald-50/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 text-[#059669]" />
                  Create a New Organization Instead
                </button>
              </div>
            </div>
          )}

          {/* Creation View (or if user has no orgs) */}
          {(!hasExistingOrgs || mode === "create") && (
            <div className="flex flex-col items-center">
              {hasExistingOrgs && (
                <div className="w-full flex justify-between items-center mb-4">
                  <button
                    type="button"
                    onClick={() => setMode("select")}
                    className="text-xs font-semibold text-[#059669] hover:underline flex items-center gap-1"
                  >
                    ← Back to My Organizations ({existingMemberships.length})
                  </button>
                </div>
              )}

              <p className="text-xs font-semibold text-[#064e3b] uppercase tracking-wider mb-4">
                Create New Organization
              </p>
              <div className="w-full flex justify-center border border-[#059669]/15 rounded-2xl p-4 bg-white/70">
                <CreateOrganization
                  afterCreateOrganizationUrl={redirectUrl}
                  appearance={{
                    elements: {
                      rootBox: "w-full max-w-full",
                      card: "shadow-none border-0 p-0 bg-transparent w-full",
                    },
                  }}
                />
              </div>
            </div>
          )}

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
