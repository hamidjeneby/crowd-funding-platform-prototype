"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CLASS_CONFIG } from "@/app/constants/classConfig";
import { ensureSystemMilestonesExist } from "./projects";

function checkProjectVisibilityInternal(project, investorClassRaw) {
  if (!project) return false;

  const classNum = typeof investorClassRaw === "number" ? investorClassRaw : (parseInt(String(investorClassRaw || "").replace(/\D/g, ""), 10) || 10);
  const cfg = CLASS_CONFIG[classNum] || CLASS_CONFIG[10];

  // 1. Status Filter
  if (classNum === 1) {
    if (!["campaign_live", "pending_review"].includes(project.status)) {
      return false;
    }
  } else {
    if (project.status !== "campaign_live") {
      return false;
    }
  }

  // 2. Minimum Eligible Investor Class
  if (project.min_eligible_investor_class != null) {
    const minRequired = Number(project.min_eligible_investor_class);
    if (!isNaN(minRequired) && classNum > minRequired) {
      return false;
    }
  }

  // 3. Minimum Target Goal threshold per class (Classes 5-8)
  if (cfg.minTargetGoal > 0) {
    const goal = Number(project.target_goal) || 0;
    if (goal <= cfg.minTargetGoal) {
      return false;
    }
  }

  return true;
}

export async function parseInvestorClass(rawClass) {
  if (!rawClass) return 10;
  const num = parseInt(String(rawClass).replace(/\D/g, ""), 10);
  if (isNaN(num) || num < 1 || num > 10) return 10;
  return num;
}

/**
 * Checks if a single project object is visible to a given investor class.
 */
export async function isProjectVisibleToClass(project, investorClassRaw) {
  return checkProjectVisibilityInternal(project, investorClassRaw);
}

/**
 * Live computes raised amounts for project IDs directly from pledges table
 */
export async function getLiveRaisedAmounts(projectIds) {
  if (!projectIds || projectIds.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("pledges")
    .select("project_id, pledged_amount, status")
    .in("project_id", projectIds);

  if (error || !data) {
    console.error("Error fetching pledges live totals:", error);
    return {};
  }

  const totals = {};
  data.forEach((p) => {
    if (p.status !== "cancelled" && p.status !== "refunded") {
      const pid = p.project_id;
      const amt = Number(p.pledged_amount) || 0;
      totals[pid] = (totals[pid] || 0) + amt;
    }
  });

  return totals;
}


/**
 * Single backend query function for marketplace visible projects
 */
export async function getVisibleProjectsQuery(investorClassRaw) {
  const classNum = typeof investorClassRaw === "number" ? investorClassRaw : (parseInt(String(investorClassRaw || "").replace(/\D/g, ""), 10) || 10);

  let query = supabaseAdmin.from("projects").select("*");

  if (classNum === 1) {
    query = query.in("status", ["campaign_live", "pending_review"]);
  } else {
    query = query.eq("status", "campaign_live");
  }

  query = query.order("created_at", { ascending: false });

  const { data: projects, error } = await query;

  if (error) {
    console.error("Error querying visible projects:", error);
    throw new Error("Failed to fetch marketplace projects.");
  }

  if (!projects || projects.length === 0) return [];

  const filteredProjects = projects.filter((p) => checkProjectVisibilityInternal(p, classNum));

  if (filteredProjects.length === 0) return [];

  const projectIds = filteredProjects.map((p) => p.id);
  const raisedTotals = await getLiveRaisedAmounts(projectIds);

  const projectsWithResolvedUrls = await Promise.all(
    filteredProjects.map(async (p) => {
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
      return {
        ...p,
        cover_image_url: coverUrl,
        live_raised_amount: raisedTotals[p.id] || 0,
      };
    })
  );

  return projectsWithResolvedUrls;
}

/**
 * Server-side lookup for project detail by slug with strict class eligibility verification
 */
export async function getProjectDetailBySlug(slug, investorClassRaw) {
  if (!slug) return null;

  const classNum = typeof investorClassRaw === "number" ? investorClassRaw : (parseInt(String(investorClassRaw || "").replace(/\D/g, ""), 10) || 10);

  // 1. Fetch project by slug
  const { data: project, error: pError } = await supabaseAdmin
    .from("projects")
    .select(`
      *,
      spv_details (*)
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (pError || !project) {
    return null;
  }

  // 2. Re-verify visibility check
  if (!checkProjectVisibilityInternal(project, classNum)) {
    return null;
  }

  // 3. Ensure system milestones exist for project
  await ensureSystemMilestonesExist(project.id, project.campaign_end_date);

  // 4. Resolve spv_details (handle array, object, or direct query fallback)
  let spvDetails = null;
  if (Array.isArray(project.spv_details) && project.spv_details.length > 0) {
    spvDetails = project.spv_details[0];
  } else if (project.spv_details && typeof project.spv_details === "object" && !Array.isArray(project.spv_details)) {
    spvDetails = project.spv_details;
  }

  if (!spvDetails) {
    const { data: sData } = await supabaseAdmin
      .from("spv_details")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle();
    if (sData) {
      spvDetails = sData;
    }
  }

  // 5. Fetch related media, docs (filtered), and milestones
  const [mediaRes, docsRes, milestonesRes, raisedTotals] = await Promise.all([
    supabaseAdmin
      .from("project_media")
      .select("*")
      .eq("project_id", project.id)
      .order("display_order", { ascending: true }),
    supabaseAdmin
      .from("project_docs")
      .select("*")
      .eq("project_id", project.id)
      .in("doc_type", ["pitch_deck", "balance_sheet", "valuation_report", "cap_table"]),
    supabaseAdmin
      .from("project_milestones")
      .select("*")
      .eq("project_id", project.id)
      .order("target_date", { ascending: true }),
    getLiveRaisedAmounts([project.id]),
  ]);

  const rawDocs = docsRes.data || [];
  const rawMedia = mediaRes.data || [];
  const rawMilestones = milestonesRes.data || [];

  // Generate signed/resolved URLs for project_media items
  const mediaWithUrls = await Promise.all(
    rawMedia.map(async (item) => {
      const rawUrl = item.url || item.media_url;
      let finalUrl = rawUrl;
      if (rawUrl && rawUrl.includes("/project_media/")) {
        const urlParts = rawUrl.split("/project_media/");
        if (urlParts.length === 2) {
          const { data: sData } = await supabaseAdmin.storage
            .from("project_media")
            .createSignedUrl(urlParts[1], 3600);
          if (sData?.signedUrl) {
            finalUrl = sData.signedUrl;
          }
        }
      }
      return {
        ...item,
        url: finalUrl,
        media_url: finalUrl,
      };
    })
  );

  // Generate signed URL for cover_image_url if present
  let resolvedCoverUrl = project.cover_image_url;
  if (resolvedCoverUrl && resolvedCoverUrl.includes("/cover_img/")) {
    const urlParts = resolvedCoverUrl.split("/cover_img/");
    if (urlParts.length === 2) {
      const { data: sData } = await supabaseAdmin.storage
        .from("cover_img")
        .createSignedUrl(urlParts[1], 3600);
      if (sData?.signedUrl) {
        resolvedCoverUrl = sData.signedUrl;
      }
    }
  }

  // Generate signed URLs for allowed documents
  const docsWithSignedUrls = await Promise.all(
    rawDocs.map(async (doc) => {
      let signedUrl = doc.file_url;
      if (doc.file_url) {
        const urlParts = doc.file_url.split("/project_docs/");
        if (urlParts.length === 2) {
          const path = urlParts[1];
          const { data: sData } = await supabaseAdmin.storage
            .from("project_docs")
            .createSignedUrl(path, 3600);
          if (sData?.signedUrl) {
            signedUrl = sData.signedUrl;
          }
        }
      }
      return {
        ...doc,
        signedUrl,
      };
    })
  );

  // If Sharia certificate doc ID is set, check if a doc or signed URL exists for it
  let shariahCertDoc = null;
  if (project.shariah_certificate_doc_id) {
    const { data: certDoc } = await supabaseAdmin
      .from("project_docs")
      .select("*")
      .eq("id", project.shariah_certificate_doc_id)
      .maybeSingle();

    if (certDoc && certDoc.file_url) {
      let certSignedUrl = certDoc.file_url;
      const urlParts = certDoc.file_url.split("/project_docs/");
      if (urlParts.length === 2) {
        const { data: sData } = await supabaseAdmin.storage
          .from("project_docs")
          .createSignedUrl(urlParts[1], 3600);
        if (sData?.signedUrl) certSignedUrl = sData.signedUrl;
      }
      shariahCertDoc = { ...certDoc, signedUrl: certSignedUrl };
    }
  }

  return {
    ...project,
    spv_details: spvDetails,
    cover_image_url: resolvedCoverUrl,
    live_raised_amount: raisedTotals[project.id] || 0,
    project_media: mediaWithUrls,
    project_docs: docsWithSignedUrls,
    shariah_certificate_doc: shariahCertDoc,
    project_milestones: rawMilestones,
  };
}

/**
 * Checks invest eligibility for a given investor and project
 */
export async function checkInvestEligibility(project, investorClassRaw, investorId) {
  if (!project) {
    return { eligible: false, reason: "Project not found." };
  }

  const classNum = typeof investorClassRaw === "number" ? investorClassRaw : (parseInt(String(investorClassRaw || "").replace(/\D/g, ""), 10) || 10);
  const cfg = CLASS_CONFIG[classNum] || CLASS_CONFIG[10];

  // 1. Status Check
  if (project.status !== "campaign_live") {
    return {
      eligible: false,
      reason: `Campaign is not currently live (Status: ${project.status === "pending_review" ? "Pre-Audit / Under Review" : project.status.replace("_", " ")}).`,
    };
  }

  // 2. Class Max Pledge Check vs Min Floor
  const floor = Number(project.min_investment_floor) || 0;
  if (floor > cfg.maxPledge) {
    return {
      eligible: false,
      reason: `Minimum investment floor (${project.currency || "USD"} ${floor.toLocaleString()}) exceeds your ${cfg.name} maximum pledge limit of ${project.currency || "USD"} ${cfg.maxPledge.toLocaleString()}.`,
    };
  }

  // 3. Single Pledge per Project Check (All classes)
  if (investorId) {
    const { data: existingPledge } = await supabaseAdmin
      .from("pledges")
      .select("id")
      .eq("investor_id", investorId)
      .eq("project_id", project.id)
      .not("status", "in", '("cancelled","refunded")')
      .maybeSingle();

    if (existingPledge) {
      return {
        eligible: false,
        reason: "You have already pledged to this project. Each investor is limited to one pledge per project.",
      };
    }
  }

  // 4. Active Pledges Limit Check (Class-based max active pledges across projects)
  if (cfg.maxActivePledges !== Infinity && investorId) {
    const { data: activePledges } = await supabaseAdmin
      .from("pledges")
      .select("id")
      .eq("investor_id", investorId)
      .not("status", "in", '("cancelled","refunded")');

    const activeCount = activePledges ? activePledges.length : 0;
    if (activeCount >= cfg.maxActivePledges) {
      return {
        eligible: false,
        reason: `${cfg.name} investors are limited to a maximum of ${cfg.maxActivePledges} active project pledge at a time.`,
      };
    }
  }

  return { eligible: true, reason: null };
}

