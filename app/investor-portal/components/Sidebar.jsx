"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton, useUser, OrganizationSwitcher, useClerk, useOrganization } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Store,
  Briefcase,
  PieChart,
  Flag,
  Wallet,
  FileText,
  Landmark,
  Bell,
  HelpCircle,
  Building2,
  Plus,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Settings
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const clerk = useClerk();
  const { organization } = useOrganization();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Do not render sidebar on onboarding pages
  if (pathname?.startsWith("/investor-portal/onboarding")) {
    return null;
  }

  const links = [
    {
      name: "Dashboard",
      href: "/investor-portal",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Marketplace",
      href: "/investor-portal/marketplace",
      icon: Store,
    },
    {
      name: "My Investments",
      href: "/investor-portal/investments",
      icon: Briefcase,
    },
    {
      name: "Portfolio",
      href: "/investor-portal/portfolio",
      icon: PieChart,
    },
    {
      name: "Milestones",
      href: "/investor-portal/milestones",
      icon: Flag,
    },
    {
      name: "My Wallet",
      href: "/investor-portal/wallet",
      icon: Wallet,
    },
    {
      name: "Documents",
      href: "/investor-portal/documents",
      icon: FileText,
    },
    {
      name: "Account & Banking",
      href: "/investor-portal/account",
      icon: Landmark,
    },
    {
      name: "Notifications",
      href: "/investor-portal/notifications",
      icon: Bell,
    },
    {
      name: "Support/Help",
      href: "/investor-portal/support",
      icon: HelpCircle,
    },
  ];

  return (
    <aside
      className={`relative h-screen sticky top-0 bg-[#fdfbf7] border-r border-[#059669]/10 flex flex-col shadow-xs transition-all duration-300 z-40 flex-shrink-0 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-[#064e3b] text-emerald-100 flex items-center justify-center shadow-md hover:bg-[#047857] transition-all z-50 border border-emerald-400/30 cursor-pointer"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
        {/* Brand / Logo */}
        <div className={`flex items-center gap-3 mb-6 ${isCollapsed ? "justify-center" : "px-2"}`}>
          <svg
            className="w-8 h-8 filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)] flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9 9H15L17 2H7L9 9Z" fill="#a7f3d0" />
            <path d="M7 2L9 9H2L7 2Z" fill="#34d399" />
            <path d="M17 2L15 9H22L17 2Z" fill="#059669" />
            <path d="M9 9H15L12 22L9 9Z" fill="#10b981" />
            <path d="M2 9H9L12 22L2 9Z" fill="#065f46" />
            <path d="M15 9H22L12 22L15 9Z" fill="#047857" />
          </svg>
          {!isCollapsed && (
            <span className="text-lg font-bold tracking-tighter text-[#064e3b] whitespace-nowrap">
              Investor Portal
            </span>
          )}
        </div>

        {/* Operating / Org Switcher Section */}
        <div className={`mb-5 p-3 rounded-xl bg-[#ecfdf5] border border-[#059669]/20 shadow-xs flex flex-col items-center justify-center text-center space-y-2.5 ${isCollapsed ? "px-1" : ""}`}>
          {/* Investor Badge Centered */}
          <div className="flex items-center justify-center w-full">
            {organization ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-700 text-emerald-50 font-semibold text-[10px] flex items-center justify-center gap-1 shadow-xs mx-auto">
                <Building2 className="w-3 h-3 flex-shrink-0" /> {!isCollapsed && "Institutional Investor"}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-semibold text-[10px] flex items-center justify-center gap-1 shadow-xs mx-auto">
                <UserCheck className="w-3 h-3 flex-shrink-0" /> {!isCollapsed && "Individual Investor"}
              </span>
            )}
          </div>

          {/* Organization Switcher & Action Buttons (Hidden when collapsed) */}
          {!isCollapsed && (
            <>
              <div className="w-full flex justify-center">
                <OrganizationSwitcher
                  hidePersonal={false}
                  createOrganizationMode="modal"
                  organizationProfileMode="modal"
                  afterCreateOrganizationUrl="/investor-portal/onboarding?type=institutional"
                  afterSelectOrganizationUrl="/investor-portal"
                  appearance={{
                    elements: {
                      rootBox: "w-full flex justify-center",
                      organizationSwitcherTrigger:
                        "w-full flex items-center justify-between px-3 py-2 rounded-md bg-white border border-[#059669]/20 text-[#064e3b] hover:bg-emerald-50 text-xs font-medium transition-all shadow-xs",
                      organizationPreviewTextContainer: "font-semibold text-[#064e3b] text-xs truncate",
                      organizationSwitcherTriggerIcon: "text-[#064e3b]",
                    },
                  }}
                />
              </div>

              {/* Organization Action Buttons Centered Below Switcher */}
              <div className="flex items-center justify-center gap-2 pt-1 w-full">
                {organization && (
                  <button
                    type="button"
                    onClick={() => clerk.openOrganizationProfile()}
                    title="Manage Organization"
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-[#059669]/30 text-[#064e3b] hover:bg-emerald-100 hover:border-emerald-500 text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 flex-shrink-0" /> Manage
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    clerk.openCreateOrganization({
                      afterCreateOrganizationUrl: "/investor-portal/onboarding?type=institutional",
                    })
                  }
                  title="New Organization"
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#064e3b] text-white hover:bg-[#047857] text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 flex-shrink-0" /> New Org
                </button>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-[#059669]/15 mb-4 w-full" />

        {/* Links Navigation */}
        <nav className="space-y-1">
          {links.map((link, idx) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={idx}
                href={link.href}
                title={isCollapsed ? link.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                  isActive
                    ? "bg-[#064e3b] text-white shadow-md shadow-emerald-950/10"
                    : "text-[#064e3b]/80 hover:bg-[#ecfdf5] hover:text-[#064e3b]"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <link.icon
                  className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-emerald-300" : "text-[#059669]"}`}
                />
                {!isCollapsed && <span className="truncate">{link.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="mt-auto p-3 border-t border-[#059669]/10 bg-white/60 backdrop-blur-xs">
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : "px-2 py-1"}`}>
          <UserButton afterSignOutUrl="/" />
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-gray-900 truncate">
                {user?.fullName || "Investor"}
              </span>
              <span className="text-[11px] text-gray-500 truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
