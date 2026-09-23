"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import slugify from "slugify";

// Helper function to get issuer record by orgId
async function getIssuerByOrgId(orgId) {
  const { data: issuer, error } = await supabaseAdmin
    .from("issuers")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !issuer) {
    throw new Error("Issuer profile not found for this organization.");
  }
  return issuer;
}

/**
 * Helper function to parse user date inputs directly as UTC without converting local timezone offset.
 * Handles datetime-local strings, ISO strings, Postgres TIMESTAMPTZ strings, and YYYY-MM-DD date strings.
 */
function parseAsUtcIso(dateStr) {
  if (!dateStr) return null;

  if (typeof dateStr === "string") {
    let s = dateStr.trim();
    if (!s) return null;

    // Handle postgres timestamptz like "2027-12-31 21:00:00+00" or "2027-12-31 21:00:00"
    if (s.includes(" ") && !s.includes("T")) {
      s = s.replace(" ", "T");
    }

    // Try parsing standard ISO/Date string if it ends with Z or has offset (+00 / +00:00)
    if (s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s) || /[+-]\d{2}$/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }

    // Handle "T" datetime strings without explicit offset (assume UTC)
    if (s.includes("T")) {
      const parts = s.split("T");
      const timeParts = parts[1].split(":");
      let timeStr = parts[1];
      if (timeParts.length === 2) {
        timeStr += ":00";
      }
      if (!timeStr.endsWith("Z") && !/[+-]\d{2}/.test(timeStr)) {
        timeStr += ".000Z";
      }
      const iso = `${parts[0]}T${timeStr}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }

    // Handle YYYY-MM-DD date strings
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return `${s}T00:00:00.000Z`;
    }

    // Fallback: native Date parsing
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }

    return null;
  }

  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr.toISOString();
  }

  return null;
}

/**
 * Helper to ensure system milestones exist and system target dates are kept in sync
 */
export async function ensureSystemMilestonesExist(projectId, campaignEndDate = null) {
  const { data: existing } = await supabaseAdmin
    .from("project_milestones")
    .select("*")
    .eq("project_id", projectId)
    .eq("milestone_source", "system");

  const existingEvents = (existing || []).map((m) => m.linked_system_event);
  const systemMilestonesToCreate = [];

  if (!existingEvents.includes("campaign_live")) {
    systemMilestonesToCreate.push({
      project_id: projectId,
      issuer_id: null,
      title: "Campaign live",
      description: "Project campaign goes live on the marketplace platform.",
      linked_system_event: "campaign_live",
      milestone_source: "system",
      status: "upcoming",
      target_date: null,
    });
  }

  if (!existingEvents.includes("campaign_funded")) {
    systemMilestonesToCreate.push({
      project_id: projectId,
      issuer_id: null,
      title: "Campaign funded",
      description: "Campaign target goal successfully reached by the deadline.",
      linked_system_event: "campaign_funded",
      milestone_source: "system",
      status: "upcoming",
      target_date: campaignEndDate ? parseAsUtcIso(campaignEndDate) : null,
    });
  }

  if (!existingEvents.includes("custody_transfer_complete")) {
    let custodyDate = null;
    if (campaignEndDate) {
      const utcIso = parseAsUtcIso(campaignEndDate);
      if (utcIso) {
        const dt = new Date(utcIso);
        dt.setUTCDate(dt.getUTCDate() + 5);
        custodyDate = dt.toISOString();
      }
    }
    systemMilestonesToCreate.push({
      project_id: projectId,
      issuer_id: null,
      title: "Custody transfer complete",
      description: "Custody transfer and settlement finalized.",
      linked_system_event: "custody_transfer_complete",
      milestone_source: "system",
      status: "upcoming",
      target_date: custodyDate,
    });
  }

  if (systemMilestonesToCreate.length > 0) {
    await supabaseAdmin.from("project_milestones").insert(systemMilestonesToCreate);
  }

  // Update target dates for existing system milestones if campaignEndDate is set
  if (campaignEndDate) {
    const formattedEnd = parseAsUtcIso(campaignEndDate);
    if (formattedEnd) {
      const custodyDate = new Date(new Date(formattedEnd).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("project_milestones")
        .update({ target_date: formattedEnd })
        .eq("project_id", projectId)
        .eq("linked_system_event", "campaign_funded");

      await supabaseAdmin
        .from("project_milestones")
        .update({ target_date: custodyDate })
        .eq("project_id", projectId)
        .eq("linked_system_event", "custody_transfer_complete");
    }
  }
}

// Pre-wizard project creation
export async function createProjectDraft(title) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("Unauthorized: Organization workspace required for Issuers.");
  }

  const issuer = await getIssuerByOrgId(orgId);

  // Generate a unique slug
  let baseSlug = slugify(title || "project", { lower: true, strict: true }) || "project";

  let isUnique = false;
  let counter = 0;
  let currentSlug = baseSlug;

  while (!isUnique) {
    const { data: existing } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", currentSlug)
      .maybeSingle();

    if (!existing) {
      isUnique = true;
    } else {
      counter++;
      currentSlug = `${baseSlug}-${counter}`;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({
      issuer_id: issuer.id,
      title: title,
      slug: currentSlug,
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (error) {
    console.error("Error creating project draft:", error);
    throw new Error("Failed to create project draft.");
  }

  // Auto-create system milestones
  await ensureSystemMilestonesExist(data.id);

  return { id: data.id, slug: data.slug };
}

// Fetch all project milestones
export async function getProjectMilestones(projectId) {
  const { data, error } = await supabaseAdmin
    .from("project_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("target_date", { ascending: true });

  if (error) {
    console.error("Error fetching project milestones:", error);
    return [];
  }
  return data || [];
}

// Wizard Step update
export async function updateProjectDraft(projectId, data, step) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("Unauthorized: Organization workspace required for Issuers.");
  }

  const issuer = await getIssuerByOrgId(orgId);

  // Confirm ownership and draft status
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("issuer_id, status, current_step")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("Project not found.");
  }

  if (project.issuer_id !== issuer.id) {
    throw new Error("Unauthorized: Project ownership mismatch.");
  }

  if (project.status !== "draft") {
    throw new Error("Cannot edit project: Status is not draft.");
  }

  let updateError = null;

  switch (step) {
    case 1: {
      // Basic info
      let slug = slugify(data.title || "", { lower: true, strict: true });
      let isUnique = false;
      let counter = 0;
      let currentSlug = slug;

      while (!isUnique) {
        const { data: existing } = await supabaseAdmin
          .from("projects")
          .select("id")
          .eq("slug", currentSlug)
          .neq("id", projectId)
          .maybeSingle();

        if (!existing) {
          isUnique = true;
        } else {
          counter++;
          currentSlug = `${slug}-${counter}`;
        }
      }

      const { error } = await supabaseAdmin
        .from("projects")
        .update({
          title: data.title,
          slug: currentSlug,
          summary: data.summary,
          full_description: data.full_description,
        })
        .eq("id", projectId);

      updateError = error;

      // Handle Issuer Milestones
      if (!updateError && Array.isArray(data.issuer_milestones)) {
        const { data: existingIssuerMs } = await supabaseAdmin
          .from("project_milestones")
          .select("id")
          .eq("project_id", projectId)
          .eq("milestone_source", "issuer");

        const keepIds = data.issuer_milestones.map((m) => m.id).filter(Boolean);
        const toDeleteIds = (existingIssuerMs || [])
          .map((m) => m.id)
          .filter((id) => !keepIds.includes(id));

        if (toDeleteIds.length > 0) {
          await supabaseAdmin.from("project_milestones").delete().in("id", toDeleteIds);
        }

        for (const m of data.issuer_milestones) {
          if (!m.title || !m.title.trim()) continue;
          const payload = {
            project_id: projectId,
            issuer_id: issuer.id, // Server-enforced session value
            milestone_source: "issuer", // Server-enforced
            linked_system_event: null, // Server-enforced
            status: "upcoming", // Server-enforced
            title: m.title.trim(),
            description: m.description ? m.description.trim() : null,
            target_date: m.target_date ? parseAsUtcIso(m.target_date) : null,
          };

          if (m.id) {
            await supabaseAdmin
              .from("project_milestones")
              .update(payload)
              .eq("id", m.id)
              .eq("project_id", projectId)
              .eq("milestone_source", "issuer");
          } else {
            await supabaseAdmin.from("project_milestones").insert(payload);
          }
        }
      }
      break;
    }
    case 2: {
      // Structure
      const unitType = data.sharia_contract_type === "spv_equity" ? "shares" : "sukuk";

      const { error } = await supabaseAdmin
        .from("projects")
        .update({
          sharia_contract_type: data.sharia_contract_type,
          is_spv: data.is_spv,
          unit_type: unitType,
        })
        .eq("id", projectId);

      updateError = error;

      if (!updateError && data.is_spv) {
        const isConversion = Boolean(data.conversion_enabled);
        const isSpvEquity = data.sharia_contract_type === "spv_equity";
        const totalSharesAuth =
          data.total_shares_authorized !== undefined &&
          data.total_shares_authorized !== "" &&
          !isNaN(data.total_shares_authorized)
            ? Number(data.total_shares_authorized)
            : null;

        const ratioShares =
          isConversion &&
          data.conversion_ratio_shares !== undefined &&
          data.conversion_ratio_shares !== "" &&
          !isNaN(data.conversion_ratio_shares)
            ? Number(data.conversion_ratio_shares)
            : null;

        let totalCostAuth = null;
        if (!isSpvEquity && isConversion && ratioShares && ratioShares > 0 && totalSharesAuth && totalSharesAuth > 0) {
          const { data: projectRow } = await supabaseAdmin
            .from("projects")
            .select("unit_price")
            .eq("id", projectId)
            .maybeSingle();

          if (projectRow?.unit_price && Number(projectRow.unit_price) > 0) {
            totalCostAuth = (Number(projectRow.unit_price) / ratioShares) * totalSharesAuth;
          }
        }

        const spvPayload = {
          spv_legal_name: data.spv_legal_name,
          registration_authority: data.registration_authority,
          registration_number: data.registration_number,
          total_shares_authorized: totalSharesAuth,
          total_cost_authorized: totalCostAuth,
          conversion_enabled: isConversion,
          conversion_trigger_type: "share_price_above",
          conversion_trigger_value: isConversion && data.conversion_trigger_value !== undefined && data.conversion_trigger_value !== "" ? Number(data.conversion_trigger_value) : null,
          conversion_ratio_shares: ratioShares,
          conversion_deadline: isConversion && data.conversion_deadline ? data.conversion_deadline : null,
        };

        // Upsert spv_details
        const { data: existingSpv } = await supabaseAdmin
          .from("spv_details")
          .select("id")
          .eq("project_id", projectId)
          .maybeSingle();

        let spvError;
        if (existingSpv) {
          const res = await supabaseAdmin
            .from("spv_details")
            .update(spvPayload)
            .eq("project_id", projectId)
            .eq("issuer_id", issuer.id);
          spvError = res.error;
        } else {
          const res = await supabaseAdmin.from("spv_details").insert({
            project_id: projectId,
            issuer_id: issuer.id,
            ...spvPayload,
          });
          spvError = res.error;
        }

        updateError = spvError;
      }
      break;
    }
    case 3: {
      // Financials (now on projects table)
      const campaignEndDateIso = data.campaign_end_date ? parseAsUtcIso(data.campaign_end_date) : null;

      const { error } = await supabaseAdmin
        .from("projects")
        .update({
          target_goal: data.target_goal,
          soft_cap: data.soft_cap,
          hard_cap: data.hard_cap,
          min_investment_floor: data.min_investment_floor,
          unit_price: data.unit_price || null,
          expected_roi_percent: data.expected_roi_percent,
          yield_type: data.yield_type,
          currency: data.currency,
          clearing_option: data.clearing_option,
          campaign_end_date: campaignEndDateIso,
        })
        .eq("id", projectId);

      updateError = error;

      if (!updateError) {
        // Keep system milestones in sync with campaign_end_date
        await ensureSystemMilestonesExist(projectId, campaignEndDateIso);

        const { data: proj } = await supabaseAdmin
          .from("projects")
          .select("sharia_contract_type")
          .eq("id", projectId)
          .maybeSingle();

        const isSpvEquity = proj?.sharia_contract_type === "spv_equity";

        const { data: spvRow } = await supabaseAdmin
          .from("spv_details")
          .select("id, conversion_enabled, conversion_ratio_shares, total_shares_authorized")
          .eq("project_id", projectId)
          .maybeSingle();

        if (spvRow) {
          let calculatedTotalCost = null;
          const unitPrice = data.unit_price ? Number(data.unit_price) : 0;
          const isConversion = Boolean(spvRow.conversion_enabled);
          const ratio = spvRow.conversion_ratio_shares ? Number(spvRow.conversion_ratio_shares) : 0;
          const sharesAuth = spvRow.total_shares_authorized ? Number(spvRow.total_shares_authorized) : 0;

          if (!isSpvEquity && isConversion && unitPrice > 0 && ratio > 0 && sharesAuth > 0) {
            calculatedTotalCost = (unitPrice / ratio) * sharesAuth;
          }

          await supabaseAdmin
            .from("spv_details")
            .update({ total_cost_authorized: calculatedTotalCost })
            .eq("id", spvRow.id);
        }
      }
      break;
    }
    case 4: {
      // Link cap table to spv_details if necessary
      if (data.cap_table_doc_id) {
        const { error } = await supabaseAdmin
          .from("spv_details")
          .update({
            cap_table_doc_id: data.cap_table_doc_id,
          })
          .eq("project_id", projectId)
          .eq("issuer_id", issuer.id);

        updateError = error;
      }
      break;
    }
    case 5: {
      break;
    }
    default:
      throw new Error("Invalid step");
  }

  if (updateError) {
    console.error("Error updating project draft:", updateError);
    throw new Error("Failed to update project draft.");
  }

  // Update current_step if needed
  const nextStep = Math.min(step + 1, 6);
  const currentSavedStep = project.current_step || 1;
  if (currentSavedStep < nextStep) {
    const { error: stepError } = await supabaseAdmin
      .from("projects")
      .update({ current_step: nextStep })
      .eq("id", projectId);

    if (stepError) {
      console.error("Failed to update current_step:", stepError);
    }
  }

  return { success: true };
}

// Final submission
export async function submitProjectForReview(projectId) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("Unauthorized: Organization workspace required for Issuers.");
  }

  const issuer = await getIssuerByOrgId(orgId);

  // Confirm ownership and draft status
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select(`*, spv_details (*)`)
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("Project not found.");
  }

  if (project.issuer_id !== issuer.id) {
    throw new Error("Unauthorized: Project ownership mismatch.");
  }

  if (project.status !== "draft") {
    throw new Error("Cannot submit project: Status is not draft.");
  }

  // Completion check
  const missingFields = [];

  if (!project.title) missingFields.push("title");
  if (!project.full_description) missingFields.push("full_description");
  if (!project.summary) missingFields.push("summary");

  if (!project.sharia_contract_type) missingFields.push("sharia_contract_type");

  if (!project.target_goal) missingFields.push("target_goal");
  if (!project.soft_cap) missingFields.push("soft_cap");
  if (!project.hard_cap) missingFields.push("hard_cap");
  if (!project.min_investment_floor) missingFields.push("min_investment_floor");
  if (!project.campaign_end_date) missingFields.push("campaign_end_date");
  if (project.sharia_contract_type !== "spv_equity" && !project.expected_roi_percent) missingFields.push("expected_roi_percent");
  if (!project.yield_type) missingFields.push("yield_type");
  if (!project.currency) missingFields.push("currency");
  if (!project.clearing_option) missingFields.push("clearing_option");

  const { data: docs } = await supabaseAdmin
    .from("project_docs")
    .select("*")
    .eq("project_id", projectId);

  const { data: media } = await supabaseAdmin
    .from("project_media")
    .select("*")
    .eq("project_id", projectId);

  const docTypes = (docs || []).map((d) => d.doc_type);
  if (!docTypes.includes("pitch_deck")) missingFields.push("pitch_deck doc");
  if (!docTypes.includes("balance_sheet")) missingFields.push("balance_sheet doc");
  if (!docTypes.includes("valuation_report")) missingFields.push("valuation_report doc");

  if (project.is_spv) {
    if (!docTypes.includes("cap_table")) missingFields.push("cap_table doc");
    if (!docTypes.includes("spv_registration")) missingFields.push("spv_registration doc");
  }

  if (!media || media.length === 0) {
    missingFields.push("project_media");
  }

  if (missingFields.length > 0) {
    return { success: false, missingFields };
  }

  const { error: updateError } = await supabaseAdmin
    .from("projects")
    .update({ status: "pending_review" })
    .eq("id", projectId);

  if (updateError) {
    console.error("Error submitting project:", updateError);
    throw new Error("Failed to submit project.");
  }

  return { success: true };
}

export async function deleteProjectDoc(projectId, fileUrl) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized: Organization workspace required for Issuers.");

  const issuer = await getIssuerByOrgId(orgId);

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("issuer_id, status")
    .eq("id", projectId)
    .single();

  if (!project || project.issuer_id !== issuer.id) {
    throw new Error("Unauthorized: Project ownership mismatch.");
  }
  if (project.status !== "draft") {
    throw new Error("Cannot modify files: Project is not in draft status.");
  }

  const urlParts = fileUrl.split("/project_docs/");
  if (urlParts.length === 2) {
    const filePath = urlParts[1];

    const { error: storageError } = await supabaseAdmin.storage
      .from("project_docs")
      .remove([filePath]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      throw new Error("Failed to delete file from storage.");
    }

    const { error: dbError } = await supabaseAdmin
      .from("project_docs")
      .delete()
      .eq("file_url", fileUrl)
      .eq("issuer_id", issuer.id);

    if (dbError) {
      console.error("Error deleting from DB:", dbError);
      throw new Error("Failed to delete file from database.");
    }
  }

  return { success: true };
}

export async function deleteProjectMedia(projectId, fileUrl) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized: Organization workspace required for Issuers.");

  const issuer = await getIssuerByOrgId(orgId);

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("issuer_id, status")
    .eq("id", projectId)
    .single();

  if (!project || project.issuer_id !== issuer.id) {
    throw new Error("Unauthorized: Project ownership mismatch.");
  }
  if (project.status !== "draft") {
    throw new Error("Cannot modify files: Project is not in draft status.");
  }

  const urlParts = fileUrl.split("/project_media/");
  if (urlParts.length === 2) {
    const filePath = urlParts[1];

    const { error: storageError } = await supabaseAdmin.storage
      .from("project_media")
      .remove([filePath]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      throw new Error("Failed to delete media from storage.");
    }

    const { error: dbError } = await supabaseAdmin
      .from("project_media")
      .delete()
      .eq("url", fileUrl)
      .eq("issuer_id", issuer.id);

    if (dbError) {
      console.error("Error deleting from DB:", dbError);
      throw new Error("Failed to delete media from database.");
    }
  }

  return { success: true };
}
