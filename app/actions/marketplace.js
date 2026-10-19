"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CLASS_CONFIG, MAX_OVERSUBSCRIPTION_PERCENT } from "@/app/constants/classConfig";
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

  // 3. Minimum Target Goal threshold per class (Classes 5-10)
  if (cfg.minTargetGoal > 0) {
    const goal = Number(project.target_goal) || 0;
    if (goal <= cfg.minTargetGoal) {
      return false;
    }
  }

  // 4. SPV Equity Rule: Projects structured with SPV Equity are not eligible for investors below Class 4 (Classes 5-10)
  if (project.sharia_contract_type === "spv_equity" && classNum > 4) {
    return false;
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
 * Live computes raised/subscribed amounts for project IDs directly from pledges table.
 * Excludes cancelled, refunded, and rejected_oversubscribed.
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
    const s = (p.status || "").toLowerCase();
    if (s !== "cancelled" && s !== "refunded" && s !== "rejected_oversubscribed") {
      const pid = p.project_id;
      const amt = Number(p.pledged_amount) || 0;
      totals[pid] = (totals[pid] || 0) + amt;
    }
  });

  return totals;
}

/**
 * Live computes total conversion demand for project IDs directly from pledges table.
 * Prioritizes conversion_eligible_units (post-allocation) or falls back to requested_conversion_units.
 * Excludes cancelled, refunded, and rejected_oversubscribed.
 */
export async function getLiveConversionTotals(projectIds) {
  if (!projectIds || projectIds.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("pledges")
    .select("project_id, conversion_eligible_units, requested_conversion_units, status")
    .in("project_id", projectIds);

  if (error || !data) {
    console.error("Error fetching conversion totals:", error);
    return {};
  }

  const totals = {};
  data.forEach((p) => {
    const s = (p.status || "").toLowerCase();
    if (s !== "cancelled" && s !== "refunded" && s !== "rejected_oversubscribed") {
      const pid = p.project_id;
      const units =
        p.conversion_eligible_units != null
          ? Number(p.conversion_eligible_units)
          : Number(p.requested_conversion_units || 0);
      totals[pid] = (totals[pid] || 0) + units;
    }
  });

  return totals;
}

/**
 * Single backend query function for marketplace visible projects
 */
export async function getVisibleProjectsQuery(investorClassRaw) {
  const classNum = typeof investorClassRaw === "number" ? investorClassRaw : (parseInt(String(investorClassRaw || "").replace(/\D/g, ""), 10) || 10);

  let query = supabaseAdmin.from("projects").select(`
    *,
    spv_details (*)
  `);

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
  const [raisedTotals, conversionTotals] = await Promise.all([
    getLiveRaisedAmounts(projectIds),
    getLiveConversionTotals(projectIds),
  ]);

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

  return projectsWithResolvedUrls;
}

/**
 * Server-side lookup for project detail by slug with strict class eligibility verification
 */
/**
 * Shared server-side function to fetch and shape exact investor-facing project data.
 * Assumes authorization/visibility checks have been performed by the caller.
 */
export async function getInvestorFacingProjectData(slugOrId) {
  if (!slugOrId) return null;

  let query = supabaseAdmin.from("projects").select(`
    *,
    spv_details (*)
  `);

  if (!isNaN(Number(slugOrId))) {
    query = query.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
  } else {
    query = query.eq("slug", slugOrId);
  }

  const { data: project, error: pError } = await query.maybeSingle();

  if (pError || !project) {
    return null;
  }

  // Ensure system milestones exist
  await ensureSystemMilestonesExist(project.id, project.campaign_end_date);

  // Resolve spv_details
  let spvDetails = null;
  if (Array.isArray(project.spv_details) && project.spv_details.length > 0) {
    spvDetails = project.spv_details[0];
  } else if (
    project.spv_details &&
    typeof project.spv_details === "object" &&
    !Array.isArray(project.spv_details)
  ) {
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

  // Fetch related media, docs (filtered), and milestones
  const [mediaRes, docsRes, milestonesRes, raisedTotals, conversionTotals] =
    await Promise.all([
      supabaseAdmin
        .from("project_media")
        .select("*")
        .eq("project_id", project.id)
        .order("display_order", { ascending: true }),
      supabaseAdmin
        .from("project_docs")
        .select("*")
        .eq("project_id", project.id)
        .in("doc_type", [
          "pitch_deck",
          "balance_sheet",
          "valuation_report",
          "cap_table",
        ]),
      supabaseAdmin
        .from("project_milestones")
        .select("*")
        .eq("project_id", project.id)
        .order("target_date", { ascending: true }),
      getLiveRaisedAmounts([project.id]),
      getLiveConversionTotals([project.id]),
    ]);

  const rawDocs = docsRes.data || [];
  const rawMedia = mediaRes.data || [];
  const rawMilestones = milestonesRes.data || [];

  // Generate signed URLs for project_media items
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

  // Generate signed URL for cover_image_url
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

  // Filter rawDocs for investors: strictly EXCLUDE spv_registration and EXCLUDE pending/rejected docs
  const approvedDocs = rawDocs.filter((doc) => {
    if (!doc) return false;
    const status = (doc.review_status || "").trim().toLowerCase();
    if (status === "pending" || status === "rejected") return false;
    return true;
  });

  const docsWithSignedUrls = await Promise.all(
    approvedDocs.map(async (doc) => {
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

  // Sharia cert doc
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

  // Filter milestones for investor portal: approved milestones only
  const approvedMilestones = (rawMilestones || []).filter((m) => {
    if (!m) return false;
    if (m.milestone_source === "system") return true;
    const rawStatus =
      m.mileston_verification_status ??
      m.milestone_verification_status ??
      m.verification_status;
    if (rawStatus === null || rawStatus === undefined) return true;
    const vStatus = String(rawStatus).trim().toLowerCase();
    if (vStatus === "pending" || vStatus === "rejected") return false;
    return true;
  });

  return {
    ...project,
    spv_details: spvDetails,
    cover_image_url: resolvedCoverUrl,
    live_raised_amount: raisedTotals[project.id] || 0,
    live_conversion_units: conversionTotals[project.id] || 0,
    project_media: mediaWithUrls,
    project_docs: docsWithSignedUrls,
    shariah_certificate_doc: shariahCertDoc,
    project_milestones: approvedMilestones,
  };
}

/**
 * Helper to resolve current investor internal ID from Clerk session
 */
async function resolveViewerInvestorId(explicitInvestorId) {
  if (explicitInvestorId) return explicitInvestorId;
  try {
    const { userId, orgId } = await auth();
    if (!userId) return null;

    if (orgId) {
      const { data } = await supabaseAdmin
        .from("investors")
        .select("id")
        .eq("org_id", orgId)
        .maybeSingle();
      if (data?.id) return data.id;
    }

    const { data } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
}

/**
 * Server-side lookup for project detail by slug with strict class eligibility verification.
 * Also allows an investor who has a non-cancelled pledge on a closed project
 * ('closing', 'funded', 'failed', 'completed') to view the project page.
 */
export async function getProjectDetailBySlug(slug, investorClassRaw, investorId = null) {
  if (!slug) return null;

  const classNum =
    typeof investorClassRaw === "number"
      ? investorClassRaw
      : parseInt(String(investorClassRaw || "").replace(/\D/g, ""), 10) || 10;

  // 1. Fetch project row for visibility verification
  const { data: project, error: pError } = await supabaseAdmin
    .from("projects")
    .select("id, status, min_eligible_investor_class, target_goal, sharia_contract_type")
    .eq("slug", slug)
    .maybeSingle();

  if (pError || !project) {
    return null;
  }

  // 2. Verify visibility (or allow investor with a non-cancelled pledge after close)
  const isStandardVisible = checkProjectVisibilityInternal(project, classNum);
  if (!isStandardVisible) {
    const isClosedStatus = ["closing", "funded", "failed", "completed"].includes(project.status);
    if (!isClosedStatus) {
      return null;
    }

    const resolvedInvestorId = await resolveViewerInvestorId(investorId);
    if (!resolvedInvestorId) {
      return null;
    }

    const { data: nonCancelledPledge } = await supabaseAdmin
      .from("pledges")
      .select("id")
      .eq("project_id", project.id)
      .eq("investor_id", resolvedInvestorId)
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle();

    if (!nonCancelledPledge) {
      return null;
    }
  }

  // 3. Fetch shared investor-facing project data
  return getInvestorFacingProjectData(slug);
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

  // 1b. Deadline Check: block pledges when now() >= campaign_end_date
  if (project.campaign_end_date) {
    const deadlineMs = new Date(project.campaign_end_date).getTime();
    if (!isNaN(deadlineMs) && Date.now() >= deadlineMs) {
      return {
        eligible: false,
        reason: "The campaign deadline has passed and this campaign is no longer accepting pledges.",
      };
    }
  }

  // 2. SPV Equity Contract Check (Classes 1-4 only)
  if (project.sharia_contract_type === "spv_equity" && classNum > 4) {
    return {
      eligible: false,
      reason: "Projects structured with SPV Equity are restricted to Class 1 to Class 4 investors only.",
    };
  }

  // 3. Class Max Pledge Check vs Min Floor
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
      .not("status", "in", '("cancelled","refunded","rejected_oversubscribed")')
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
      .not("status", "in", '("cancelled","refunded","rejected_oversubscribed")');

    const activeCount = activePledges ? activePledges.length : 0;
    if (activeCount >= cfg.maxActivePledges) {
      return {
        eligible: false,
        reason: `${cfg.name} investors are limited to a maximum of ${cfg.maxActivePledges} active project pledge at a time.`,
      };
    }
  }

  // 5. Oversubscription Ceiling Check (150% of capacity)
  const capacity = Number(project.hard_cap) || Number(project.target_goal) || 0;
  const currentLiveSubscribed = Number(project.live_raised_amount) || 0;
  if (capacity > 0 && currentLiveSubscribed >= capacity * (MAX_OVERSUBSCRIPTION_PERCENT / 100)) {
    return {
      eligible: false,
      reason: "This campaign has reached its maximum subscription level.",
    };
  }

  return { eligible: true, reason: null };
}

/**
 * Server-side function (service key, after visibility check) that groups counted
 * pledges by investor_class_at_pledge and returns ONLY bucketed percentages.
 * Never returns amounts, counts, or individual pledge rows.
 */
export async function getProjectClassBandSubscription(slug, viewerClassNum) {
  const project = await getProjectDetailBySlug(slug, viewerClassNum);
  if (!project) return null;

  const capacity = Number(project.target_goal) || 0;
  const softCap = Number(project.soft_cap) || 0;
  const softCapPercent = capacity > 0 ? (softCap / capacity) * 100 : 0;

  // Fetch counted pledges
  const { data: pledgesData } = await supabaseAdmin
    .from("pledges")
    .select("investor_class_at_pledge, pledged_amount, status")
    .eq("project_id", project.id);

  const countedPledges = (pledgesData || []).filter(
    (p) => !["cancelled", "refunded", "rejected_oversubscribed"].includes((p.status || "").toLowerCase())
  );

  const isSpvEquity =
    String(project.sharia_contract_type || project.shariah_contract_type || "")
      .toLowerCase()
      .trim() === "spv_equity";

  const bands = [];

  if (isSpvEquity) {
    // For SPV equity projects, eligible investors are strictly Class 1 to Class 4.
    // Separate into two distinct bands:
    // 1) Class 1–2 (Class 1 and 2)
    // 2) Class 3–4 (Class 3 and 4)
    // No minimum 3-pledge privacy merge is applied: even a single pledge appears in its respective band.
    const spvTier1 = { id: "1-2", label: "Class 1–2", minClass: 1, maxClass: 2, count: 0, amount: 0 };
    const spvTier2 = { id: "3-4", label: "Class 3–4", minClass: 3, maxClass: 4, count: 0, amount: 0 };

    countedPledges.forEach((p) => {
      const cls = Number(p.investor_class_at_pledge) || 10;
      const amt = Number(p.pledged_amount) || 0;
      if (cls <= 2) {
        spvTier1.count += 1;
        spvTier1.amount += amt;
      } else {
        spvTier2.count += 1;
        spvTier2.amount += amt;
      }
    });

    if (spvTier1.count > 0) {
      bands.push(spvTier1);
    }
    if (spvTier2.count > 0) {
      bands.push(spvTier2);
    }
  } else {
    // Base bands definition in priority order for standard multi-tier contracts
    const rawTier1 = { id: "1", label: "Class 1", minClass: 1, maxClass: 1, count: 0, amount: 0 };
    const rawTier2 = { id: "2-4", label: "Class 2–4", minClass: 2, maxClass: 4, count: 0, amount: 0 };
    const rawTier3 = { id: "5-7", label: "Class 5–7", minClass: 5, maxClass: 7, count: 0, amount: 0 };
    const rawTier4 = { id: "8-10", label: "Class 8–10", minClass: 8, maxClass: 10, count: 0, amount: 0 };

    countedPledges.forEach((p) => {
      const cls = Number(p.investor_class_at_pledge) || 10;
      const amt = Number(p.pledged_amount) || 0;
      if (cls === 1) {
        rawTier1.count += 1;
        rawTier1.amount += amt;
      } else if (cls >= 2 && cls <= 4) {
        rawTier2.count += 1;
        rawTier2.amount += amt;
      } else if (cls >= 5 && cls <= 7) {
        rawTier3.count += 1;
        rawTier3.amount += amt;
      } else {
        rawTier4.count += 1;
        rawTier4.amount += amt;
      }
    });

    // Privacy merging rule applies ONLY for high-class tiers (Tier 1 & Tier 2: Class 1–4 maximum):
    // - If both Tier 1 and Tier 2 have >= 3 pledges, they remain separate as "Class 1" and "Class 2–4".
    // - If either has pledges and fewer than 3, they merge into "Class 1–4" to preserve investor privacy.
    // - Merging NEVER extends past Class 4 into Class 5–7 or Class 8–10.
    const totalHighClassCount = rawTier1.count + rawTier2.count;
    if (totalHighClassCount > 0) {
      if (rawTier1.count >= 3 && rawTier2.count >= 3) {
        bands.push(rawTier1);
        bands.push(rawTier2);
      } else if (rawTier1.count > 0 && (rawTier1.count < 3 || rawTier2.count > 0)) {
        bands.push({
          id: "1-4",
          label: "Class 1–4",
          minClass: 1,
          maxClass: 4,
          count: totalHighClassCount,
          amount: rawTier1.amount + rawTier2.amount,
        });
      } else if (rawTier1.count >= 3 && rawTier2.count === 0) {
        bands.push(rawTier1);
      } else {
        bands.push(rawTier2);
      }
    }

    // Tier 3 (Class 5–7) and Tier 4 (Class 8–10) NEVER merge:
    // Even if a tier has only 1 pledge, it remains distinct in its tier.
    if (rawTier3.count > 0) {
      bands.push(rawTier3);
    }
    if (rawTier4.count > 0) {
      bands.push(rawTier4);
    }
  }

  // Compute bucketed percentages
  let cumulative = 0;
  let viewerCumulativePercent = 0;
  let foundViewerBand = false;

  const finalBands = bands.map((band) => {
    const pct = capacity > 0 ? (band.amount / capacity) * 100 : 0;
    cumulative += pct;
    const isViewerBand = viewerClassNum >= band.minClass && viewerClassNum <= band.maxClass;
    if (isViewerBand) {
      viewerCumulativePercent = cumulative;
      foundViewerBand = true;
    }
    return {
      label: band.label,
      amount: band.amount,
      percent: Math.round(pct * 10) / 10,
      cumulativePercent: Math.round(cumulative * 10) / 10,
      isViewerBand,
    };
  });

  const totalSubscribed = countedPledges.reduce((sum, p) => sum + Number(p.pledged_amount || 0), 0);
  const totalPercent = capacity > 0 ? (totalSubscribed / capacity) * 100 : 0;

  if (!foundViewerBand) {
    let atOrAboveAmt = 0;
    countedPledges.forEach((p) => {
      if ((Number(p.investor_class_at_pledge) || 10) <= viewerClassNum) {
        atOrAboveAmt += Number(p.pledged_amount || 0);
      }
    });
    viewerCumulativePercent = capacity > 0 ? (atOrAboveAmt / capacity) * 100 : 0;
  }

  return {
    bands: finalBands,
    totalPercent: Math.round(totalPercent * 10) / 10,
    softCapPercent: Math.round(softCapPercent * 10) / 10,
    viewerCumulativePercent: Math.round(viewerCumulativePercent * 10) / 10,
    viewerClass: viewerClassNum,
    capacity,
    totalSubscribed,
    isOversubscribed: totalPercent > 100,
  };
}

/**
 * Server-side function (service key, after visibility check) that returns
 * conversion pool demand for Class 1-4 viewers.
 */
export async function getProjectConversionDemand(slug, viewerClassNum) {
  const project = await getProjectDetailBySlug(slug, viewerClassNum);
  if (!project) return null;

  const isSpvEquity = project.sharia_contract_type === "spv_equity";
  const spvDetail = Array.isArray(project.spv_details)
    ? project.spv_details[0]
    : project.spv_details;
  const isConversionActive = Boolean(!isSpvEquity && project.is_spv && spvDetail?.conversion_enabled);

  if (!isConversionActive || viewerClassNum > 4) {
    return null;
  }

  const totalSharesAuth = Number(spvDetail?.total_shares_authorized) || 0;
  const ratioShares = Number(spvDetail?.conversion_ratio_shares) || 1;
  const poolUnits = ratioShares > 0 ? Math.floor(totalSharesAuth / ratioShares) : 0;

  if (poolUnits <= 0) return null;

  const { data: pledgesData } = await supabaseAdmin
    .from("pledges")
    .select("investor_class_at_pledge, requested_conversion_units, conversion_eligible_units, status")
    .eq("project_id", project.id);

  const countedPledges = (pledgesData || []).filter(
    (p) => !["cancelled", "refunded", "rejected_oversubscribed"].includes((p.status || "").toLowerCase())
  );

  const contributingPledges = countedPledges.filter(
    (p) => Number(p.requested_conversion_units ?? p.conversion_eligible_units ?? 0) > 0
  );

  const totalDemand = countedPledges.reduce(
    (sum, p) => sum + Number(p.requested_conversion_units ?? p.conversion_eligible_units ?? 0),
    0
  );

  const demandAtOrAboveViewer = countedPledges
    .filter((p) => (Number(p.investor_class_at_pledge) || 10) <= viewerClassNum)
    .reduce((sum, p) => sum + Number(p.requested_conversion_units ?? p.conversion_eligible_units ?? 0), 0);

  const isOversubscribed = totalDemand > poolUnits;
  const viewerPriorityPercent = poolUnits > 0 ? Math.round(((demandAtOrAboveViewer / poolUnits) * 100) * 10) / 10 : 0;
  const totalDemandPercent = poolUnits > 0 ? Math.round(((totalDemand / poolUnits) * 100) * 10) / 10 : 0;

  return {
    isLowDemand: contributingPledges.length < 3,
    poolUnits,
    totalDemand,
    totalDemandPercent,
    viewerPriorityPercent,
    demandAtOrAboveViewer,
    isOversubscribed,
    viewerClass: viewerClassNum,
    contributingPledgeCount: contributingPledges.length,
  };
}

