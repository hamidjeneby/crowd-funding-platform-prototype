import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getInvestorPortalData } from "@/app/actions/investor-portal";
import { parseInvestorClass } from "@/app/actions/marketplace";
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
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Lock,
  Layers,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

function formatUtcDate(dateString) {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return null;
  }
}

export default async function InvestorDashboardPage() {
  const investor = await getInvestorPortalData();
  const investorClassNum = await parseInvestorClass(investor?.investor_class);
  const isClass1To4 = investorClassNum >= 1 && investorClassNum <= 4;
  const isClass1 = investorClassNum === 1;

  const investorId = investor?.id;

  let totalCapitalDeployed = 0;
  let activePledgesCount = 0;
  let pendingPledgedAmount = 0;
  let recentNotifications = [];
  let upcomingMilestones = [];
  let campaignsClosingSoon = [];

  if (investorId) {
    // 1. Fetch Pledges
    const { data: pledgesData } = await supabaseAdmin
      .from("pledges")
      .select(`
        *,
        projects (
          id,
          title,
          slug,
          campaign_end_date,
          currency,
          target_goal,
          status,
          spv_details (*)
        )
      `)
      .eq("investor_id", investorId);

    const pledges = pledgesData || [];

    // Stat card 1: Total Capital Deployed: SUM(allocated_amount || pledged_amount) where status IN (allocated, active, completed)
    const deployedPledges = pledges.filter((p) =>
      ["allocated", "active", "completed"].includes(
        (p.status || "").toLowerCase()
      )
    );
    totalCapitalDeployed = deployedPledges.reduce(
      (sum, p) => sum + Number(p.allocated_amount || p.pledged_amount || 0),
      0
    );

    // Stat card 3: Active Pledges Count: COUNT where status IN (allocated, active)
    const activePledges = pledges.filter((p) =>
      ["allocated", "active"].includes((p.status || "").toLowerCase())
    );
    activePledgesCount = activePledges.length;

    // Stat card 4: Pending (awaiting allocation): SUM(pledged_amount) where status = 'pending'
    const pendingPledges = pledges.filter(
      (p) => (p.status || "").toLowerCase() === "pending"
    );
    pendingPledgedAmount = pendingPledges.reduce(
      (sum, p) => sum + Number(p.pledged_amount || 0),
      0
    );

    // Active held project IDs for Milestones & Campaigns Closing Soon
    const validHeldPledges = pledges.filter(
      (p) =>
        !["cancelled", "refunded"].includes((p.status || "").toLowerCase())
    );
    const heldProjectIds = Array.from(
      new Set(validHeldPledges.map((p) => p.project_id).filter(Boolean))
    );

    // 2. Fetch Notifications (latest 3-5 unread/recent)
    const { data: notifsData } = await supabaseAdmin
      .from("notifications")
      .select("*, projects(id, title, slug)")
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false })
      .limit(5);

    recentNotifications = notifsData || [];

    // 3. Fetch Upcoming Milestones across projects this investor holds an active pledge in
    if (heldProjectIds.length > 0) {
      const { data: milestonesData } = await supabaseAdmin
        .from("project_milestones")
        .select("*, projects(id, title, slug)")
        .in("project_id", heldProjectIds)
        .eq("status", "upcoming")
        .order("target_date", { ascending: true });

      const filteredMs = (milestonesData || []).filter((m) => {
        const vStatus =
          m.mileston_verification_status || m.milestone_verification_status;
        if (vStatus === "pending" || vStatus === "rejected") return false;
        return (
          vStatus === "approved" || m.milestone_source === "system" || !vStatus
        );
      });

      upcomingMilestones = filteredMs.slice(0, 3);
    }

    // 4. Campaigns Closing Soon (held projects closing within 30 days)
    const now = new Date();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const closingMap = new Map();
    validHeldPledges.forEach((p) => {
      const proj = p.projects;
      if (!proj || !proj.campaign_end_date) return;
      const endDate = new Date(proj.campaign_end_date);
      const diff = endDate.getTime() - now.getTime();
      if (diff > -86400000 && diff <= thirtyDaysMs) {
        const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        closingMap.set(proj.id, {
          ...proj,
          daysLeft,
          isUrgent: daysLeft <= 7,
        });
      }
    });

    campaignsClosingSoon = Array.from(closingMap.values()).sort(
      (a, b) => a.daysLeft - b.daysLeft
    );
  }

  const currency = "USD";

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 text-[#064e3b]">
      {/* SECTION 1: HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#064e3b] font-extrabold text-xs border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-[#059669]" /> Class{" "}
              {investorClassNum} Access Badge
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-2">
            Welcome back, {investor?.legal_name || "Investor"}
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Capital allocation overview, upcoming project milestones, and account updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/investor-portal/wallet"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#059669]/30 text-[#064e3b] font-semibold text-xs sm:text-sm hover:bg-emerald-50 transition-all shadow-xs"
          >
            <Wallet className="w-4 h-4 text-[#059669]" />
            Wallet: {currency}{" "}
            {Number(investor?.wallet_balance || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Link>

          <Link
            href="/investor-portal/marketplace"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#064e3b] text-white font-semibold text-xs sm:text-sm hover:bg-[#047857] transition-all shadow-md"
          >
            Explore Projects <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* SECTION 2: TOP STAT CARDS (FOUR CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Capital Deployed */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900 to-[#064e3b] text-white shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Capital Deployed</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-white">
            {currency} {totalCapitalDeployed.toLocaleString()}
          </div>
          <div className="mt-3 text-xs text-emerald-200/80 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Allocated & active holdings
          </div>
        </div>

        {/* Card 2: Total Returns Received (Coming Soon State) */}
        <div className="p-6 rounded-3xl bg-white border border-[#059669]/15 shadow-xs relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Total Returns Received</span>
              <DollarSign className="w-5 h-5 text-[#059669]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-gray-400">—</span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] uppercase tracking-wider border border-amber-200">
                Coming Soon
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Automated dividend payouts engine under development
          </div>
        </div>

        {/* Card 3: Active Pledges Count */}
        <div className="p-6 rounded-3xl bg-white border border-[#059669]/15 shadow-xs hover:border-[#059669]/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Active Pledges</span>
              <Briefcase className="w-5 h-5 text-[#059669]" />
            </div>
            <div className="text-3xl font-black text-[#064e3b]">
              {activePledgesCount}
            </div>
          </div>
          <div className="mt-3 text-xs text-[#064e3b]/70">
            Active campaign allocations
          </div>
        </div>

        {/* Card 4: Pending (Awaiting Allocation) */}
        <div className="p-6 rounded-3xl bg-white border border-[#059669]/15 shadow-xs hover:border-[#059669]/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#064e3b]/70 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Pending Allocation</span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-3xl font-black text-[#064e3b]">
              {currency} {pendingPledgedAmount.toLocaleString()}
            </div>
          </div>
          <div className="mt-3 text-xs text-amber-700 font-medium">
            Awaiting escrow confirmation
          </div>
        </div>
      </div>

      {/* MAIN GRID: RECENT ALERTS & UPCOMING MILESTONES SNAPSHOT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Upcoming Milestones Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
                <Flag className="w-5 h-5 text-[#059669]" /> Upcoming Milestones
              </h2>
              <p className="text-xs text-[#064e3b]/70 mt-0.5">
                Next execution milestones for projects in your active portfolio.
              </p>
            </div>
            <Link
              href="/investor-portal/milestones"
              className="text-xs font-bold text-[#059669] hover:text-[#064e3b] flex items-center gap-1 transition-colors"
            >
              View Full Timeline <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {upcomingMilestones.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-white rounded-3xl border border-gray-200/80">
              No upcoming milestones scheduled for your held projects.
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingMilestones.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl bg-white border border-[#059669]/15 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {m.milestone_source === "system"
                          ? "Platform Milestone"
                          : "Issuer Milestone"}
                      </span>
                      {m.target_date && (
                        <span className="text-xs text-[#064e3b]/60 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5" />{" "}
                          {formatUtcDate(m.target_date)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#064e3b]">
                      {m.title}
                    </h3>
                    {m.projects && (
                      <p className="text-xs text-[#064e3b]/70 flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-[#059669]" />{" "}
                        {m.projects.title}
                      </p>
                    )}
                  </div>

                  <Link
                    href={
                      m.projects?.slug
                        ? `/investor-portal/projects/${m.projects.slug}`
                        : "/investor-portal/milestones"
                    }
                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#064e3b] font-bold text-xs transition-colors shrink-0 flex items-center gap-1 self-end md:self-auto"
                  >
                    View Project <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 col): Recent Notifications */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#059669]" /> Recent Alerts
              </h2>
              <p className="text-xs text-[#064e3b]/70 mt-0.5">
                Latest account & campaign notifications.
              </p>
            </div>
            <Link
              href="/investor-portal/notifications"
              className="text-xs font-bold text-[#059669] hover:text-[#064e3b] flex items-center gap-1 transition-colors"
            >
              All Alerts <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-white rounded-3xl border border-gray-200/80">
              No recent alerts found.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#059669]/15 p-4 divide-y divide-gray-100 shadow-xs">
              {recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className="py-3.5 first:pt-0 last:pb-0 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-semibold text-[#059669] uppercase tracking-wider text-[10px]">
                      {n.notification_type || n.type || "System Alert"}
                    </span>
                    <span>{formatUtcDate(n.created_at)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#064e3b]">
                    {n.title}
                  </h4>
                  {n.projects?.title && (
                    <Link
                      href={`/investor-portal/projects/${n.projects.slug}`}
                      className="text-xs text-[#059669] hover:underline font-medium block"
                    >
                      {n.projects.title}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: CAMPAIGNS CLOSING SOON SNAPSHOT */}
      {campaignsClosingSoon.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#059669]" /> Campaigns Closing Soon
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Active projects in your portfolio ending within 30 days.
              </p>
            </div>
            <Link
              href="/investor-portal/marketplace"
              className="text-xs font-bold text-[#059669] hover:text-[#064e3b] flex items-center gap-1"
            >
              Explore Marketplace <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaignsClosingSoon.map((proj) => (
              <div
                key={proj.id}
                className={`p-5 rounded-2xl border transition-all ${
                  proj.isUrgent
                    ? "bg-amber-50/60 border-amber-300"
                    : "bg-[#fcfaf7] border-gray-200/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {proj.isUrgent ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                      <AlertTriangle className="w-3 h-3" /> Ends in {proj.daysLeft} days!
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                      {proj.daysLeft} days remaining
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-[#064e3b] line-clamp-1">
                  {proj.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Target: {proj.currency || "USD"}{" "}
                  {Number(proj.target_goal || 0).toLocaleString()}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-200/60 flex justify-end">
                  <Link
                    href={`/investor-portal/projects/${proj.slug}`}
                    className="text-xs font-bold text-[#059669] hover:text-[#064e3b] flex items-center gap-1"
                  >
                    View Project <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 7: UNDERWRITING OFFERS (CLASS 1 INVESTORS ONLY) */}
      {isClass1 && (
        <div className="bg-gradient-to-br from-emerald-950 via-[#064e3b] to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-500/30">
                Class 1 Institutional Privilege
              </span>
              <h3 className="text-xl font-extrabold mt-1 text-white">
                Underwriting Desk Offers
              </h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Exclusive primary underwriting lead allocation offers for Class 1 accredited institutions.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/10 text-white font-semibold text-xs border border-white/20 self-start sm:self-auto">
              0 Pending Offers
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-emerald-100/70 space-y-2">
            <Lock className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="font-semibold text-white">
              Underwriting Offers Registry Desk
            </p>
            <p className="max-w-md mx-auto text-emerald-200/70">
              When issuers open underwriting allocations for upcoming campaigns, primary offer sheets will appear here for priority commitment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
