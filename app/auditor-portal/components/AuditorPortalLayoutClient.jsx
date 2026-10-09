"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  Building2,
  Briefcase,
  Target,
  Landmark,
  FileText,
} from "lucide-react";

export default function AuditorPortalLayoutClient({
  userRole,
  auditor,
  children,
}) {
  const pathname = usePathname();

  if (userRole === "invalid") {
    return <>{children}</>;
  }

  const navLinks = [
    {
      name: "Dashboard",
      href: "/auditor-portal",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Investor Onboarding",
      href: "/auditor-portal/investor-onboarding",
      icon: UserCheck,
    },
    {
      name: "Issuer Onboarding",
      href: "/auditor-portal/issuer-onboarding",
      icon: Building2,
    },
    {
      name: "Project Creation Review",
      href: "/auditor-portal/project-creation",
      icon: Briefcase,
    },
    {
      name: "Milestone Review",
      href: "/auditor-portal/milestone-review",
      icon: Target,
    },
    {
      name: "Bank Details Review",
      href: "/auditor-portal/bank-review",
      icon: Landmark,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fcfbf7] text-gray-900 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-[#041d16] text-[#fdfbf7] border-r border-[#059669]/20 flex-col justify-between shrink-0 fixed top-0 left-0 bottom-0 z-30 h-screen">
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Logo Brand */}
          <Link
            href="/auditor-portal"
            className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-white hover:text-emerald-300 transition-colors"
          >
            <svg
              className="w-7 h-7 filter drop-shadow-[0_2px_8px_rgba(52,211,153,0.4)] shrink-0"
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
            <div className="flex flex-col leading-tight">
              <span>Jade Fortune</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400/80">
                Auditor Workspace
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-extrabold text-emerald-400/60 uppercase tracking-wider">
              Verification Modules
            </div>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 shadow-xs"
                      : "text-emerald-100/70 hover:bg-emerald-950/60 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-emerald-100/50"}`}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Auditor Profile & Sign-out at bottom */}
        <div className="p-4 border-t border-[#059669]/20 bg-[#02130e]/60 space-y-3 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-emerald-900/80 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-white truncate">
                {auditor?.first_name
                  ? `${auditor.first_name} ${auditor.last_name || ""}`.trim()
                  : auditor?.email || "Auditor Account"}
              </span>
              <span className="text-[10px] text-emerald-400/70 truncate flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />{" "}
                Verified Auditor
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-emerald-900/40">
            <span className="text-[11px] font-semibold text-emerald-200/60">
              Account Settings
            </span>
            <UserButton afterSignOutUrl="/auditor/sign-in" />
          </div>
        </div>
      </aside>

      {/* Header - Mobile Only */}
      <header className="md:hidden bg-[#041d16] border-b border-[#059669]/20 text-[#fdfbf7] p-4 flex items-center justify-between sticky top-0 z-40">
        <Link
          href="/auditor-portal"
          className="flex items-center gap-2 text-sm font-extrabold text-white"
        >
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Auditor Portal</span>
        </Link>
        <div className="flex items-center gap-2 overflow-x-auto max-w-[240px] py-1">
          {navLinks.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 border ${
                  isActive
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-200"
                    : "border-emerald-800/40 text-emerald-200/80"
                }`}
              >
                {item.name.split(" ")[0]}
              </Link>
            );
          })}
        </div>
        <UserButton afterSignOutUrl="/auditor/sign-in" />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 md:ml-64 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
