import Link from "next/link";
import { getInvestorPortalData } from "@/app/actions/investor-portal";
import {
  TrendingUp,
  Briefcase,
  Flag,
  Bell,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Clock,
  ChevronRight
} from "lucide-react";

export default async function InvestorDashboardPage() {
  const investor = await getInvestorPortalData();

  const dummyUpcomingMilestones = [
    {
      id: 1,
      project: "Solaris Green Energy Infrastructure",
      title: "Phase 2 Grid Connection Complete",
      date: "Sep 28, 2026",
      type: "issuer",
      status: "In Progress",
      progress: 75,
    },
    {
      id: 2,
      project: "Aura Luxury Residences",
      title: "Escrow Release & Custody Transfer",
      date: "Oct 05, 2026",
      type: "system",
      status: "Upcoming",
      progress: 40,
    },
    {
      id: 3,
      project: "Apex Logistics Tech Hub",
      title: "Quarterly Dividend Distribution",
      date: "Oct 15, 2026",
      type: "system",
      status: "Scheduled",
      progress: 10,
    },
  ];

  const dummyRecentNotifications = [
    {
      id: 1,
      title: "Milestone Verified: Groundbreaking Completed",
      project: "Aura Luxury Residences",
      time: "2 hours ago",
      type: "milestone",
    },
    {
      id: 2,
      title: "Campaign Closing Alert: Solaris Green Energy",
      project: "Solaris Green Energy Infrastructure",
      time: "1 day ago",
      type: "campaign",
    },
    {
      id: 3,
      title: "Investor Class Verified: Class 2 Sophisticated",
      project: "System",
      time: "3 days ago",
      type: "kyc",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Investor Portal Overview
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Welcome back, {investor.legal_name}
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Here is your live capital overview, upcoming project milestones, and account snapshot.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/investor-portal/wallet"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#059669]/30 text-[#064e3b] font-semibold text-sm hover:bg-emerald-50 transition-all shadow-xs"
          >
            <Wallet className="w-4 h-4 text-[#059669]" />
            Wallet: ${investor.wallet_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Link>

          <Link
            href="/investor-portal/marketplace"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#064e3b] text-white font-semibold text-sm hover:bg-[#047857] transition-all shadow-md"
          >
            Explore Projects <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Capital Deployed */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900 to-[#064e3b] text-white shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Capital Deployed</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-white">
            $45,000<span className="text-sm font-normal text-emerald-300">.00</span>
          </div>
          <div className="mt-3 text-xs text-emerald-200/80 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">+12.4%</span> estimated returns target
          </div>
        </div>

        {/* Active Pledges */}
        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-sm hover:border-[#059669]/30 transition-all">
          <div className="flex items-center justify-between text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Pledges</span>
            <Briefcase className="w-5 h-5 text-[#059669]" />
          </div>
          <div className="text-3xl font-black text-[#064e3b]">3</div>
          <div className="mt-3 text-xs text-[#064e3b]/70">
            Across 3 high-yield campaigns
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-sm hover:border-[#059669]/30 transition-all">
          <div className="flex items-center justify-between text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Upcoming Milestones</span>
            <Flag className="w-5 h-5 text-[#059669]" />
          </div>
          <div className="text-3xl font-black text-[#064e3b]">3</div>
          <div className="mt-3 text-xs text-[#064e3b]/70">
            Next milestone in 14 days
          </div>
        </div>

        {/* Unread Notifications */}
        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-sm hover:border-[#059669]/30 transition-all">
          <div className="flex items-center justify-between text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Unread Alerts</span>
            <Bell className="w-5 h-5 text-[#059669]" />
          </div>
          <div className="text-3xl font-black text-[#064e3b]">3</div>
          <div className="mt-3 text-xs text-[#064e3b]/70">
            System & campaign updates
          </div>
        </div>
      </div>

      {/* Main Grid: Milestones Preview & Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Upcoming Milestones Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#064e3b]">Upcoming Milestones</h2>
              <p className="text-xs text-[#064e3b]/70">
                Key progress events scheduled across your active portfolio holdings.
              </p>
            </div>
            <Link
              href="/investor-portal/milestones"
              className="text-xs font-bold text-[#059669] hover:text-[#064e3b] flex items-center gap-1 transition-colors"
            >
              View Full Timeline <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {dummyUpcomingMilestones.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-white border border-[#059669]/15 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      {m.type === "system" ? "System Event" : "Issuer Milestone"}
                    </span>
                    <span className="text-xs text-[#064e3b]/60 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> {m.date}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#064e3b]">{m.title}</h3>
                  <p className="text-xs text-[#064e3b]/70 flex items-center gap-1.5 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-[#059669]" /> {m.project}
                  </p>
                </div>

                <div className="w-full md:w-36 space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-[#064e3b]">
                    <span>Progress</span>
                    <span>{m.progress}%</span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#059669] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1 col): Recent Notifications */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#064e3b]">Recent Alerts</h2>
              <p className="text-xs text-[#064e3b]/70">Latest account & pledge updates.</p>
            </div>
            <Link
              href="/investor-portal/notifications"
              className="text-xs font-bold text-[#059669] hover:text-[#064e3b] flex items-center gap-1 transition-colors"
            >
              All Notifications <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-[#059669]/15 p-4 divide-y divide-[#059669]/10 shadow-xs">
            {dummyRecentNotifications.map((n) => (
              <div key={n.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span className="font-semibold text-[#059669] uppercase tracking-wider text-[10px]">
                    {n.type}
                  </span>
                  <span>{n.time}</span>
                </div>
                <h4 className="text-sm font-bold text-[#064e3b]">{n.title}</h4>
                <p className="text-xs text-[#064e3b]/70">{n.project}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
