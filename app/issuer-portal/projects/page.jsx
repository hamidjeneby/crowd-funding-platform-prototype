import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import {
  getLiveRaisedAmounts,
  getLiveConversionTotals,
} from "@/app/actions/marketplace";
import {
  FolderOpen,
  PlusCircle,
  AlertCircle,
  Edit,
  Eye,
  Clock,
  TrendingUp,
  Sliders,
  Sparkles,
  ImageIcon,
} from "lucide-react";

export default async function ProjectsPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return <div>Unauthorized</div>;
  }

  let projects = [];
  let fetchError = null;

  try {
    const { data: issuer, error: issuerError } = await supabaseAdmin
      .from("issuers")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (issuerError || !issuer) {
      projects = [];
    } else {
      const { data, error } = await supabaseAdmin
        .from("projects")
        .select("*, project_media(id), spv_details(*)")
        .eq("issuer_id", issuer.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      const rawProjects = data || [];

      if (rawProjects.length > 0) {
        const projectIds = rawProjects.map((p) => p.id);
        const [raisedTotals, conversionTotals] = await Promise.all([
          getLiveRaisedAmounts(projectIds),
          getLiveConversionTotals(projectIds),
        ]);

        projects = await Promise.all(
          rawProjects.map(async (p) => {
            let coverUrl = p.cover_image_url;
            if (coverUrl && coverUrl.includes("/cover_img/")) {
              const urlParts = coverUrl.split("/cover_img/");
              if (urlParts.length === 2) {
                const { data: sData } = await supabaseAdmin.storage
                  .from("cover_img")
                  .createSignedUrl(urlParts[1], 3600);
                if (sData?.signedUrl) {
                  coverUrl = sData.signedUrl;
                }
              }
            }

            let spvDetails = null;
            if (Array.isArray(p.spv_details) && p.spv_details.length > 0) {
              spvDetails = p.spv_details[0];
            } else if (p.spv_details && typeof p.spv_details === "object") {
              spvDetails = p.spv_details;
            }

            return {
              ...p,
              spv_details: spvDetails,
              cover_image_url: coverUrl,
              live_raised_amount: raisedTotals[p.id] || 0,
              live_conversion_units: conversionTotals[p.id] || 0,
            };
          })
        );
      }
    }
  } catch (err) {
    console.error("Error fetching projects:", err);
    fetchError =
      "There was an error fetching your projects. Please try again later.";
  }

  function getDaysRemaining(deadlineStr) {
    if (!deadlineStr) return null;
    try {
      const deadline = new Date(deadlineStr);
      const now = new Date();
      const diffMs = deadline - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return null;
    }
  }

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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-[#064e3b]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#064e3b]">My Projects</h1>
          <p className="text-sm text-[#064e3b]/70 mt-1">
            Manage your project pipeline, track campaign funding, and access
            project management dashboards.
          </p>
        </div>
        <Link
          href="/issuer-portal/projects/new"
          className="flex items-center px-5 py-2.5 bg-[#064e3b] text-white font-bold text-xs rounded-xl hover:bg-[#047857] transition-all shadow-md shrink-0"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Create New Project
        </Link>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center shadow-xs">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="font-medium text-xs">{fetchError}</p>
        </div>
      )}

      {!fetchError && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-200 border-dashed text-center shadow-xs">
          <div className="w-20 h-20 bg-emerald-50 text-[#059669] rounded-2xl flex items-center justify-center mb-6">
            <FolderOpen className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-[#064e3b] mb-2">
            No projects listed
          </h2>
          <p className="text-gray-500 mb-8 max-w-md text-sm">
            You haven't created any crowdfunding projects yet. Start by creating
            your first project draft to raise capital.
          </p>
          <Link
            href="/issuer-portal/projects/new"
            className="flex items-center px-6 py-3 bg-[#064e3b] text-white font-bold rounded-xl hover:bg-[#047857] transition-all shadow-md text-sm"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Create Your First Project
          </Link>
        </div>
      )}

      {!fetchError && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => {
            const status = project.status || "draft";
            const isDraft = status === "draft";
            const isPendingReview = status === "pending_review";
            const canManage = !isDraft && !isPendingReview;

            const targetGoal = Number(project.target_goal) || 0;
            const liveRaised = Number(project.live_raised_amount) || 0;
            const rawPercent =
              targetGoal > 0 ? (liveRaised / targetGoal) * 100 : 0;
            const percent = Math.min(rawPercent, 100).toFixed(1);
            const daysRemaining = getDaysRemaining(
              project.campaign_end_date || project.deadline
            );
            const currency = project.currency || "USD";

            return (
              <div
                key={project.id}
                className="bg-white rounded-3xl shadow-xs border border-gray-200/80 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Card Header / Cover */}
                <div className="relative h-48 bg-gray-100 shrink-0 border-b border-gray-100">
                  {project.cover_image_url ? (
                    <img
                      src={project.cover_image_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                      <ImageIcon className="w-10 h-10 mb-2 opacity-40 text-[#059669]" />
                      <span className="text-xs font-semibold text-gray-400">
                        No Cover Image
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-3 py-1 text-[11px] font-extrabold rounded-full border uppercase tracking-wider ${getStatusBadgeStyle(
                        status
                      )}`}
                    >
                      {status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3
                      className="text-lg font-bold text-white line-clamp-1 drop-shadow-md"
                      title={project.title}
                    >
                      {project.title || "Untitled Project"}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col space-y-4">
                  <p className="text-xs text-gray-600 line-clamp-2 min-h-[36px]">
                    {project.summary || "No summary provided."}
                  </p>

                  {/* Funding Progress & Days Remaining */}
                  <div className="space-y-2.5 bg-[#fdfbf7] p-3.5 rounded-2xl border border-emerald-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-500 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#059669]" />{" "}
                        Funding Progress
                      </span>
                      <span className="font-extrabold text-[#064e3b]">
                        {percent}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#059669] to-[#047857] h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium uppercase">
                          Raised
                        </span>
                        <span className="font-bold text-gray-900 text-xs">
                          {currency} {liveRaised.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-medium uppercase">
                          Target Goal
                        </span>
                        <span className="font-bold text-gray-900 text-xs">
                          {currency}{" "}
                          {targetGoal > 0
                            ? targetGoal.toLocaleString()
                            : "Not set"}
                        </span>
                      </div>
                    </div>

                    {daysRemaining !== null && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 pt-1 border-t border-emerald-100/60">
                        <Clock className="w-3.5 h-3.5 text-[#059669]" />
                        <span>{daysRemaining} days remaining in campaign</span>
                      </div>
                    )}
                  </div>

                  {/* Conversion Pool Progress Bar (Shown if SPV conversion is enabled or total_shares_authorized exists) */}
                  {(() => {
                    const isSpvEquity =
                      project.sharia_contract_type === "spv_equity";
                    const spvDetails = project.spv_details;
                    const hasConversionClause =
                      !isSpvEquity &&
                      (Boolean(spvDetails?.conversion_enabled) ||
                        Number(spvDetails?.total_shares_authorized) > 0);

                    if (!hasConversionClause) return null;

                    const totalSharesAuthorized =
                      Number(spvDetails?.total_shares_authorized) || 0;
                    const conversionRatioShares =
                      Number(spvDetails?.conversion_ratio_shares) || 1;
                    const totalConvertibleUnits =
                      conversionRatioShares > 0
                        ? Math.floor(
                            totalSharesAuthorized / conversionRatioShares
                          )
                        : totalSharesAuthorized;
                    const pledgedConvertedUnits =
                      Number(project.live_conversion_units) || 0;
                    const conversionPercent =
                      totalConvertibleUnits > 0
                        ? Math.min(
                            (pledgedConvertedUnits / totalConvertibleUnits) *
                              100,
                            100
                          ).toFixed(1)
                        : 0;

                    return (
                      <div className="space-y-2 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#064e3b] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#059669]" />{" "}
                            Conversion Pool ({conversionPercent}%)
                          </span>
                          <span className="font-extrabold text-[#064e3b]">
                            {pledgedConvertedUnits.toLocaleString()} /{" "}
                            {totalConvertibleUnits.toLocaleString()} units
                          </span>
                        </div>

                        <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#059669] to-[#047857] h-full rounded-full transition-all duration-500"
                            style={{ width: `${conversionPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Buttons Footer */}
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2">
                    {/* Button 1: Edit Draft or Preview Listing */}
                    <Link
                      href={
                        isDraft
                          ? `/issuer-portal/projects/${project.slug || project.id}/edit`
                          : `/issuer-portal/projects/${project.slug || project.id}/preview`
                      }
                      className={`flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs ${
                        isDraft
                          ? "bg-[#064e3b] text-white hover:bg-[#047857]"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200"
                      }`}
                    >
                      {isDraft ? (
                        <>
                          <Edit className="w-3.5 h-3.5 mr-1.5" />
                          Edit Draft
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Preview Listing
                        </>
                      )}
                    </Link>

                    {/* Button 2: Manage Button (Only visible/clickable when status is NOT draft or pending_review) */}
                    {canManage ? (
                      <Link
                        href={`/issuer-portal/projects/${project.slug || project.id}/manage`}
                        className="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl text-xs font-bold bg-[#064e3b] text-white hover:bg-[#047857] transition-all shadow-xs"
                      >
                        <Sliders className="w-3.5 h-3.5 mr-1.5" />
                        Manage Project
                      </Link>
                    ) : (
                      <button
                        disabled
                        title="Management dashboard available once project is live or approved"
                        className="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
                      >
                        <Sliders className="w-3.5 h-3.5 mr-1.5" />
                        Manage (Locked)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
