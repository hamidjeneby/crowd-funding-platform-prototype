"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton, useUser, OrganizationSwitcher, useClerk, useOrganization } from "@clerk/nextjs";
import { LayoutDashboard, Settings, FolderOpen, PlusCircle, Building2, Repeat } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const clerk = useClerk();
  const { organization } = useOrganization();

  // Do not render sidebar on onboarding pages
  if (pathname?.startsWith("/issuer-portal/onboarding")) {
    return null;
  }

  const links = [
    { 
      name: "Dashboard", 
      href: "/issuer-portal", 
      icon: LayoutDashboard,
      match: (path) => path === "/issuer-portal"
    },
    {
      name: "New Project",
      href: "/issuer-portal/projects/new",
      icon: PlusCircle,
      match: (path) => path === "/issuer-portal/projects/new"
    },
    { 
      name: "Projects", 
      href: "/issuer-portal/projects", 
      icon: FolderOpen,
      match: (path) => path === "/issuer-portal/projects" || (path?.startsWith("/issuer-portal/projects/") && path !== "/issuer-portal/projects/new")
    },
    { 
      name: "Settings", 
      href: "#", 
      icon: Settings,
      match: (path) => false
    },
  ];

  return (
    <aside className="w-64 h-screen sticky top-0 bg-[#fdfbf7] border-r border-[#059669]/10 flex flex-col shadow-sm flex-shrink-0 z-40">
      <div className="p-6 overflow-y-auto">
        <div className="flex items-center gap-2 mb-6">
          <svg
            className="w-8 h-8 filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]"
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
          <span className="text-xl font-bold tracking-tighter text-[#064e3b]">
            Issuer Portal
          </span>
        </div>

        {/* Organization Switcher Header Section */}
        <div className="mb-6 p-3 rounded-lg bg-[#ecfdf5] border border-[#059669]/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#064e3b] uppercase tracking-wider">
              Operating Mode
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[10px] flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Issuer
            </span>
          </div>

          <OrganizationSwitcher
            hidePersonal
            createOrganizationMode="modal"
            organizationProfileMode="modal"
            afterCreateOrganizationUrl="/issuer-portal/onboarding"
            afterSelectOrganizationUrl="/issuer-portal"
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "w-full flex items-center justify-between px-3 py-2 rounded-md bg-white border border-[#059669]/20 text-[#064e3b] hover:bg-emerald-50 text-xs font-medium transition-all shadow-xs",
                organizationPreviewTextContainer: "font-semibold text-[#064e3b] text-xs truncate",
                organizationSwitcherTriggerIcon: "text-[#064e3b]",
              },
            }}
          />
        </div>

        <div className="border-t border-[#059669]/20 mb-6 w-full"></div>

        <nav className="space-y-2">
          {links.map((link, idx) => {
            const isActive = link.match ? link.match(pathname) : pathname === link.href;
            return (
              <Link
                key={idx}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                  isActive
                    ? "bg-[#064e3b] text-white shadow-md"
                    : "text-[#064e3b] hover:bg-[#ecfdf5]"
                }`}
                onClick={
                  link.href === "#" ? (e) => e.preventDefault() : undefined
                }
              >
                <link.icon
                  className={`w-5 h-5 ${isActive ? "opacity-100" : "opacity-70"}`}
                />
                {link.name}
              </Link>
            );
          })}

          {/* Manage Organization Button */}
          <button
            type="button"
            onClick={() => clerk.openOrganizationProfile()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm text-[#064e3b] hover:bg-[#ecfdf5]"
          >
            <Building2 className="w-5 h-5 opacity-70" />
            Manage Organization
          </button>

          {/* Create / Switch Organization Button */}
          <button
            type="button"
            onClick={() =>
              clerk.openCreateOrganization({
                afterCreateOrganizationUrl: "/issuer-portal/onboarding",
              })
            }
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm text-[#064e3b] hover:bg-[#ecfdf5]"
          >
            <Repeat className="w-5 h-5 opacity-70" />
            New Organization
          </button>
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-[#059669]/10 bg-white/50 backdrop-blur-sm">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
          User Profile
        </div>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <UserButton afterSignOutUrl="/" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-gray-900 truncate">
              {user?.fullName || "Issuer"}
            </span>
            <span className="text-xs text-gray-500 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
