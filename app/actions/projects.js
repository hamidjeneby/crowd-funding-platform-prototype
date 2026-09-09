"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import slugify from "slugify";

// Pre-wizard project creation
export async function createProjectDraft(title) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("Unauthorized: Organization workspace required for Issuers.");
  }

  // Generate a temporary slug just so the DB doesn't complain if it's unique, but we will overwrite it in Step 1
  let slug = slugify(title, { lower: true, strict: true });

  // We need to ensure slug is unique
  let isUnique = false;
  let counter = 0;
  let currentSlug = slug;

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
      currentSlug = `${slug}-${counter}`;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({
      issuer_id: orgId,
      title: title,
      slug: currentSlug,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating project draft:", error);
    throw new Error("Failed to create project draft.");
  }

  return data.id;
}

// Wizard Step update
export async function updateProjectDraft(projectId, data, step) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("Unauthorized: Organization workspace required for Issuers.");
  }

  // Confirm ownership and draft status
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("issuer_id, status, current_step")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("Project not found.");
  }

  if (project.issuer_id !== orgId) {
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
      break;
    }
    case 2: {
      // Structure
      const { error } = await supabaseAdmin
        .from("projects")
        .update({
          sharia_contract_type: data.sharia_contract_type,
          is_spv: data.is_spv,
        })
        .eq("id", projectId);

      updateError = error;

      if (!updateError && data.is_spv) {
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
            .update({
              spv_legal_name: data.spv_legal_name,
              registration_authority: data.registration_authority,
              registration_number: data.registration_number,
            })
            .eq("project_id", projectId)
            .eq("issuer_id", userId);
          spvError = res.error;
        } else {
          const res = await supabaseAdmin.from("spv_details").insert({
            project_id: projectId,
            issuer_id: orgId,
            spv_legal_name: data.spv_legal_name,
            registration_authority: data.registration_authority,
            registration_number: data.registration_number,
          });
          spvError = res.error;
        }

        updateError = spvError;
      }
      break;
    }
    case 3: {
      // Financials (now on projects table)
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
        })
        .eq("id", projectId);

      updateError = error;
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
          .eq("issuer_id", orgId);

        updateError = error;
      }
      break;
    }
    case 5: {
      // Media display orders are usually handled directly via their own updates
      // This is here as a placeholder for step 5 specific logic if any.
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

  // Confirm ownership and draft status
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select(
      `
      *,
      spv_details (*)
    `,
    )
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("Project not found.");
  }

  if (project.issuer_id !== orgId) {
    throw new Error("Unauthorized: Project ownership mismatch.");
  }

  if (project.status !== "draft") {
    throw new Error("Cannot submit project: Status is not draft.");
  }

  // Completion check
  const missingFields = [];

  // Step 1
  if (!project.title) missingFields.push("title");
  if (!project.full_description) missingFields.push("full_description");
  if (!project.summary) missingFields.push("summary");

  // Step 2
  if (!project.sharia_contract_type) missingFields.push("sharia_contract_type");

  // Step 3
  if (!project.target_goal) missingFields.push("target_goal");
  if (!project.soft_cap) missingFields.push("soft_cap");
  if (!project.hard_cap) missingFields.push("hard_cap");
  if (!project.min_investment_floor) missingFields.push("min_investment_floor");
  if (!project.expected_roi_percent) missingFields.push("expected_roi_percent");
  if (!project.yield_type) missingFields.push("yield_type");
  if (!project.currency) missingFields.push("currency");
  if (!project.clearing_option) missingFields.push("clearing_option");

  // Fetch docs and media
  const { data: docs } = await supabaseAdmin
    .from("project_docs")
    .select("*")
    .eq("project_id", projectId);

  const { data: media } = await supabaseAdmin
    .from("project_media")
    .select("*")
    .eq("project_id", projectId);

  // Step 4
  const docTypes = (docs || []).map((d) => d.doc_type);
  if (!docTypes.includes("pitch_deck")) missingFields.push("pitch_deck doc");
  if (!docTypes.includes("balance_sheet"))
    missingFields.push("balance_sheet doc");
  if (!docTypes.includes("valuation_report"))
    missingFields.push("valuation_report doc");

  if (project.is_spv) {
    if (!docTypes.includes("cap_table")) missingFields.push("cap_table doc");
    if (!docTypes.includes("spv_registration"))
      missingFields.push("spv_registration doc");
  }

  // Step 5
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

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("issuer_id, status")
    .eq("id", projectId)
    .single();

  if (!project || project.issuer_id !== orgId) {
    throw new Error("Unauthorized: Project ownership mismatch.");
  }
  if (project.status !== "draft") {
    throw new Error("Cannot modify files: Project is not in draft status.");
  }

  // Extract file path from URL
  const urlParts = fileUrl.split("/project_docs/");
  if (urlParts.length === 2) {
    const filePath = urlParts[1];

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from("project_docs")
      .remove([filePath]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      throw new Error("Failed to delete file from storage.");
    }

    // Delete from DB
    const { error: dbError } = await supabaseAdmin
      .from("project_docs")
      .delete()
      .eq("file_url", fileUrl)
      .eq("issuer_id", orgId);

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

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("issuer_id, status")
    .eq("id", projectId)
    .single();

  if (!project || project.issuer_id !== orgId) {
    throw new Error("Unauthorized: Project ownership mismatch.");
  }
  if (project.status !== "draft") {
    throw new Error("Cannot modify files: Project is not in draft status.");
  }

  // Extract file path from URL
  const urlParts = fileUrl.split("/project_media/");
  if (urlParts.length === 2) {
    const filePath = urlParts[1];

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from("project_media")
      .remove([filePath]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      throw new Error("Failed to delete media from storage.");
    }

    // Delete from DB
    const { error: dbError } = await supabaseAdmin
      .from("project_media")
      .delete()
      .eq("url", fileUrl)
      .eq("issuer_id", orgId);

    if (dbError) {
      console.error("Error deleting from DB:", dbError);
      throw new Error("Failed to delete media from database.");
    }
  }

  return { success: true };
}
