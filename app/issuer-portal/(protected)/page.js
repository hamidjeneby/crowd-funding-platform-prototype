import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { getLiveRaisedAmounts } from "@/app/actions/marketplace";
import {
  Building2,
  TrendingUp,
  Clock,
  AlertTriangle,
  FolderOpen,
  Plus,
  Sliders,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  FileText,
} from "lucide-react";

export default async function IssuerPortalDashboard() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return <div>Unauthorized</div>;
  }

  // Fetch issuer profile by org_id
  const { data: issuer } = await supabaseAdmin
    .from("issuers")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const legalName = issuer?.legal_entity_name || "Organization Issuer";
  const onboardingStatus = issuer?.onboarding_status || "incomplete";
  const isFullyCompleted = onboardingStatus === "completed";

  let projects = [];
  let lifetimeCapitalRaised = 0;
  let liveCampaignsCount = 0;
  let draftCount = 0;
  let underReviewCount = 0;

  if (issuer?.id) {
    // 1. Fetch issuer's projects
    const { data: projectsData } = await supabaseAdmin
      .from("projects")
      .select("*, spv_details(*)")
      .eq("issuer_id", issuer.id)
      .order("created_at", { ascending: false });

    const rawProjects = projectsData || [];

    // Calculate project counts by status
    liveCampaignsCount = rawProjects.filter(
      (p) => p.status === "campaign_live"
    ).length;
    draftCount = rawProjects.filter((p) => p.status === "draft").length;
    underReviewCount = rawProjects.filter(
      (p) => p.status === "pending_review"
    ).length;

    // 2. Fetch all pledges across all issuer's projects for lifetime raised capital calculation
    const projectIds = rawProjects.map((p) => p.id);
    if (projectIds.length > 0) {
      const { data: pledgesData } = await supabaseAdmin
        .from("pledges")
        .select("project_id, pledged_amount, allocated_amount, status")
        .in("project_id", projectIds);

      const allPledges = pledgesData || [];

      // Lifetime capital raised: SUM(allocated_amount || pledged_amount) where status IN (allocated, active, completed)
      const validLifetimePledges = allPledges.filter((p) =>
        ["allocated", "active", "completed"].includes(
          (p.status || "").toLowerCase()
        )
      );

      lifetimeCapitalRaised = validLifetimePledges.reduce(
        (sum, p) => sum + Number(p.allocated_amount || p.pledged_amount || 0),
        0
      );

      // Fetch live raised totals for snapshot cards
      const raisedTotals = await getLiveRaisedAmounts(projectIds);
      projects = rawProjects.map((p) => ({
        ...p,
        live_raised_amount: raisedTotals[p.id] || 0,
      }));
    } else {
      projects = rawProjects;
    }
  }

  // Top 3-5 projects snapshot
  const recentProjects = projects.slice(0, 5);

  function getStatusBadgeStyle(status) {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "pending_review":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "campaign_live":
        return "bg-emerald-600 text-white border-emerald-700 shadow-xs";
      case "funded":
        return "bg-teal-600 text-white border-teal-700 shadow-xs";
      case "closed":
        return "bg-slate-700 text-white border-slate-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 text-[#064e3b]">
      {/* SECTION 1: HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#064e3b] font-extrabold text-xs border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <Building2 className="w-4 h-4 text-[#059669]" /> {legalName}
            </span>

            {/* Onboarding Status Badge if not completed */}
            {!isFullyCompleted && (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs border border-amber-300 flex items-center gap-1.5 capitalize">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> KYB Status: {onboardingStatus}
              </span>
            )}
            {isFullyCompleted && (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> KYB Approved
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-2">
            Issuer Executive Dashboard
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Lifetime capital metrics, active project pipeline, and project management snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isFullyCompleted && (
            <Link
              href="/issuer-portal/onboarding"
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2"
            >
              Complete Onboarding <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}

          <Link
            href="/issuer-portal/projects/new"
            className="px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Project
          </Link>
        </div>
      </div>

      {/* SECTION 2: TOP STAT CARDS (FOUR CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Capital Raised (Lifetime) */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Capital Raised
            </span>
            <div className="w-9 h-9 bg-emerald-100 text-[#059669] rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#064e3b]">
            USD {lifetimeCapitalRaised.toLocaleString()}
          </div>
          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" /> Lifetime allocated capital
          </p>
        </div>

        {/* Card 2: Live Campaigns Count */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Live Campaigns
            </span>
            <div className="w-9 h-9 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#064e3b]">
            {liveCampaignsCount} Active
          </div>
          <p className="text-xs text-gray-500 font-semibold">
            Active marketplace deals
          </p>
        </div>

        {/* Card 3: Projects in Draft */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Projects in Draft
            </span>
            <div className="w-9 h-9 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#064e3b]">
            {draftCount} Drafts
          </div>
          <p className="text-xs text-gray-500 font-semibold">
            In-progress creation wizard
          </p>
        </div>

        {/* Card 4: Projects Under Review */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Projects Under Review
            </span>
            <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#064e3b]">
            {underReviewCount} Pending
          </div>
          <p className="text-xs text-amber-700 font-semibold">
            Under auditor review
          </p>
        </div>
      </div>

      {/* SECTION 3: LIVE PROJECTS SNAPSHOT */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#059669]" /> Live Projects Snapshot
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Recent projects pipeline with funding progress and quick access to project management.
            </p>
          </div>

          <Link
            href="/issuer-portal/projects"
            className="text-xs font-bold text-[#059669] hover:underline flex items-center gap-1"
          >
            View All Projects ({projects.length}) <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 bg-[#fcfaf7] rounded-2xl border border-dashed border-gray-200 space-y-3">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-700 text-sm">No Projects Created Yet</p>
            <p className="max-w-md mx-auto">
              Start by creating your first project draft to raise capital on the marketplace.
            </p>
            <Link
              href="/issuer-portal/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create First Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.map((project) => {
              const status = project.status || "draft";
              const isDraft = status === "draft";
              const isPendingReview = status === "pending_review";
              const canManage = !isDraft && !isPendingReview;

              const targetGoal = Number(project.target_goal) || 0;
              const liveRaised = Number(project.live_raised_amount) || 0;
              const percent =
                targetGoal > 0
                  ? Math.min((liveRaised / targetGoal) * 100, 100).toFixed(1)
                  : 0;
              const currency = project.currency || "USD";

              return (
                <div
                  key={project.id}
                  className="bg-[#fcfaf7] rounded-2xl p-5 border border-gray-200/80 flex flex-col justify-between space-y-4 hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border uppercase tracking-wider ${getStatusBadgeStyle(
                          status
                        )}`}
                      >
                        {status.replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#064e3b] line-clamp-1">
                      {project.title || "Untitled Project"}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {project.summary || "No summary provided."}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 bg-white p-3.5 rounded-xl border border-gray-200/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-500">
                        Funding Progress
                      </span>
                      <span className="font-extrabold text-[#064e3b]">
                        {percent}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#059669] to-[#047857] h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] font-semibold text-gray-700 pt-0.5">
                      <span>
                        Raised: {currency} {liveRaised.toLocaleString()}
                      </span>
                      <span>
                        Goal: {currency}{" "}
                        {targetGoal > 0 ? targetGoal.toLocaleString() : "TBD"}
                      </span>
                    </div>
                  </div>

                  {/* Management Action Button */}
                  <div className="pt-2 flex items-center gap-2">
                    {canManage ? (
                      <Link
                        href={`/issuer-portal/projects/${project.slug || project.id}/manage`}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5" /> Manage Project
                      </Link>
                    ) : (
                      <Link
                        href={`/issuer-portal/projects/${project.slug || project.id}/edit`}
                        className="w-full py-2.5 px-3 rounded-xl bg-gray-100 text-gray-800 border border-gray-200 font-bold text-xs hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5" /> View / Edit Draft
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
