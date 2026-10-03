"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { getLiveRaisedAmounts, getLiveConversionTotals } from "./marketplace";
import { triggerMakeWebhook } from "@/lib/webhook";

/**
 * Helper to get issuer record by orgId
 */
async function getIssuerByOrgId(orgId) {
  const { data: issuer, error } = await supabaseAdmin
    .from("issuers")
    .select("id, legal_entity_name")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !issuer) {
    throw new Error("Issuer profile not found for this organization.");
  }
  return issuer;
}

/**
 * Server-side loader for issuer project management data
 */
export async function getIssuerProjectManagementData(slugOrId) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { error: "unauthorized" };
  }

  const issuer = await getIssuerByOrgId(orgId);

  // Fetch project row by slug or id
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
    return { notFound: true };
  }

  // Strict ownership check
  if (project.issuer_id !== issuer.id) {
    return { notFound: true };
  }

  // Resolve spv_details (handle array vs object)
  let spvDetails = null;
  if (Array.isArray(project.spv_details) && project.spv_details.length > 0) {
    spvDetails = project.spv_details[0];
  } else if (project.spv_details && typeof project.spv_details === "object") {
    spvDetails = project.spv_details;
  }

  // Cover image signed URL
  let coverUrl = project.cover_image_url;
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

  // If project is still draft, return minimal project info for draft banner display
  if (project.status === "draft") {
    return {
      project: {
        ...project,
        spv_details: spvDetails,
        cover_image_url: coverUrl,
      },
      isDraft: true,
    };
  }

  // Submitted project: Fetch full management aggregates using service key
  const [raisedTotals, conversionTotals, pledgesRes, milestonesRes, docsRes] =
    await Promise.all([
      getLiveRaisedAmounts([project.id]),
      getLiveConversionTotals([project.id]),
      supabaseAdmin
        .from("pledges")
        .select(
          "id, investor_id, pledged_amount, allocated_amount, investor_class_at_pledge, status",
        )
        .eq("project_id", project.id),
      supabaseAdmin
        .from("project_milestones")
        .select("*")
        .eq("project_id", project.id)
        .order("target_date", { ascending: true }),
      supabaseAdmin
        .from("project_docs")
        .select("*")
        .eq("project_id", project.id)
        .order("uploaded_at", { ascending: false }),
    ]);

  const allPledges = pledgesRes.data || [];
  const validPledges = allPledges.filter(
    (p) => p.status !== "cancelled" && p.status !== "refunded",
  );

  // Distinct investor count (no PII exposed)
  const distinctInvestorIds = new Set(
    validPledges.map((p) => p.investor_id).filter(Boolean),
  );
  const totalInvestorCount = distinctInvestorIds.size;

  // Aggregate positions by investor_class_at_pledge
  const classBreakdown = {};
  const statusCounts = {
    pending: 0,
    allocated: 0,
    active: 0,
    completed: 0,
  };

  validPledges.forEach((p) => {
    const rawClass = p.investor_class_at_pledge || 10;
    const classKey = `Class ${rawClass}`;
    if (!classBreakdown[classKey]) {
      classBreakdown[classKey] = {
        className: classKey,
        classNum: Number(rawClass) || 10,
        investorIds: new Set(),
        totalPledged: 0,
        totalAllocated: 0,
        hasAllocatedValues: false,
      };
    }

    if (p.investor_id) {
      classBreakdown[classKey].investorIds.add(p.investor_id);
    }
    classBreakdown[classKey].totalPledged += Number(p.pledged_amount) || 0;
    if (p.allocated_amount !== null && p.allocated_amount !== undefined) {
      classBreakdown[classKey].totalAllocated +=
        Number(p.allocated_amount) || 0;
      classBreakdown[classKey].hasAllocatedValues = true;
    }

    if (statusCounts[p.status] !== undefined) {
      statusCounts[p.status]++;
    }
  });

  const formattedClassBreakdown = Object.values(classBreakdown)
    .map((item) => ({
      className: item.className,
      classNum: item.classNum,
      investorCount: item.investorIds.size,
      totalPledged: item.totalPledged,
      totalAllocated: item.hasAllocatedValues ? item.totalAllocated : null,
    }))
    .sort((a, b) => a.classNum - b.classNum);

  // Process documents & generate signed URLs
  const rawDocs = docsRes.data || [];
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

      // Review status defaults to 'pending' if null/undefined
      const reviewStatus = (doc.review_status || "pending").toLowerCase();

      return {
        ...doc,
        signedUrl,
        review_status: reviewStatus,
      };
    }),
  );

  return {
    isDraft: false,
    project: {
      ...project,
      spv_details: spvDetails,
      cover_image_url: coverUrl,
      live_raised_amount: raisedTotals[project.id] || 0,
      live_conversion_units: conversionTotals[project.id] || 0,
    },
    totalInvestorCount,
    classBreakdown: formattedClassBreakdown,
    statusCounts,
    milestones: milestonesRes.data || [],
    documents: docsWithSignedUrls,
  };
}

function parseAsUtcIso(dateStr) {
  if (!dateStr) return null;

  if (typeof dateStr === "string") {
    let s = dateStr.trim();
    if (!s) return null;

    if (s.includes(" ") && !s.includes("T")) {
      s = s.replace(" ", "T");
    }

    if (
      s.endsWith("Z") ||
      /[+-]\d{2}:?\d{2}$/.test(s) ||
      /[+-]\d{2}$/.test(s)
    ) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    if (s.includes("T")) {
      const parts = s.split("T");
      let timeStr = parts[1];
      if (timeStr.split(":").length === 2) timeStr += ":00";
      if (!timeStr.endsWith("Z") && !/[+-]\d{2}/.test(timeStr))
        timeStr += ".000Z";
      const d = new Date(`${parts[0]}T${timeStr}`);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return `${s}T00:00:00.000Z`;
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString();

    return null;
  }

  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr.toISOString();
  }

  return null;
}

/**
 * Server action to add or update an issuer milestone
 */
export async function saveIssuerMilestone(projectId, milestoneData) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  const issuer = await getIssuerByOrgId(orgId);

  const numProjectId = !isNaN(Number(projectId))
    ? Number(projectId)
    : projectId;

  // Verify ownership of project
  const { data: project, error: pError } = await supabaseAdmin
    .from("projects")
    .select("id, issuer_id")
    .eq("id", numProjectId)
    .single();

  if (pError || !project || project.issuer_id !== issuer.id) {
    throw new Error("Unauthorized: Project ownership mismatch.");
  }

  const title = String(milestoneData.title || "").trim();
  if (!title) {
    throw new Error("Milestone title is required.");
  }

  const formattedDate = parseAsUtcIso(milestoneData.target_date);

  const payload = {
    project_id: numProjectId,
    issuer_id: issuer.id,
    milestone_source: "issuer",
    linked_system_event: null,
    title,
    description: milestoneData.description
      ? String(milestoneData.description).trim()
      : null,
    target_date: formattedDate,
    status: milestoneData.status || "upcoming",
    verification_status: "pending",
  };

  if (milestoneData.id) {
    // Verify existing milestone is an issuer milestone and not complete
    const { data: existing } = await supabaseAdmin
      .from("project_milestones")
      .select("id, milestone_source, status")
      .eq("id", milestoneData.id)
      .eq("project_id", numProjectId)
      .single();

    if (!existing || existing.milestone_source === "system") {
      throw new Error("Cannot edit system platform milestones.");
    }
    if (existing.status === "complete" || existing.status === "completed") {
      throw new Error(
        "Completed milestones are immutable and cannot be edited.",
      );
    }

    const { error } = await supabaseAdmin
      .from("project_milestones")
      .update(payload)
      .eq("id", milestoneData.id);

    if (error) {
      console.error("Error updating milestone:", error);
      throw new Error(
        `Failed to update milestone: ${error.message || error.details || "Unknown error"}`,
      );
    }
  } else {
    const { data: insertedMilestone, error } = await supabaseAdmin
      .from("project_milestones")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Error inserting milestone:", error);
      throw new Error(
        `Failed to create milestone: ${error.message || error.details || "Unknown error"}`,
      );
    }

    // Trigger Make Webhook for newly added milestone
    triggerMakeWebhook({
      type: "milestone_review",
      milestone: insertedMilestone,
      project_id: numProjectId,
    });
  }

  revalidatePath("/issuer-portal/projects");
  return { success: true };
}

/**
 * Server action to mark an issuer milestone as reached/completed
 */
export async function markMilestoneReached(projectId, milestoneId) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  const issuer = await getIssuerByOrgId(orgId);

  const numProjectId = !isNaN(Number(projectId))
    ? Number(projectId)
    : projectId;

  // Verify ownership
  const { data: project, error: pError } = await supabaseAdmin
    .from("projects")
    .select("id, issuer_id")
    .eq("id", numProjectId)
    .single();

  if (pError || !project || project.issuer_id !== issuer.id) {
    throw new Error("Unauthorized: Project ownership mismatch.");
  }

  // Fetch milestone
  const { data: milestone, error: mError } = await supabaseAdmin
    .from("project_milestones")
    .select("id, milestone_source, status, verification_status")
    .eq("id", milestoneId)
    .eq("project_id", numProjectId)
    .single();

  if (mError || !milestone) {
    throw new Error("Milestone not found.");
  }

  if (milestone.milestone_source === "system") {
    throw new Error(
      "System milestones are managed automatically by the platform.",
    );
  }

  const verifStatus = milestone.verification_status;
  if (!verifStatus || String(verifStatus).trim().toLowerCase() !== "approved") {
    throw new Error(
      "Milestone must be approved/cleared by an auditor before it can be marked as reached.",
    );
  }

  if (milestone.status === "complete" || milestone.status === "completed") {
    return { success: true }; // Already complete
  }

  const { error } = await supabaseAdmin
    .from("project_milestones")
    .update({
      status: "completed",
      verification_status: "pending", // Submit completion for reviewer clearing
    })
    .eq("id", milestoneId);

  if (error) {
    console.error("Error marking milestone complete:", error);
    throw new Error("Failed to update milestone status.");
  }

  revalidatePath("/issuer-portal/projects");
  return { success: true };
}
