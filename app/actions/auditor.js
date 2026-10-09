"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { decrypt } from "@/app/utils/crypto";

/**
 * Helper to generate signed URLs for storage objects
 */
async function getSignedUrl(bucketName, fileUrl) {
  if (!fileUrl) return null;
  if (typeof fileUrl !== "string") return null;
  
  const splitStr = `/${bucketName}/`;
  const urlParts = fileUrl.split(splitStr);
  if (urlParts.length === 2) {
    const path = urlParts[1];
    const { data } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(path, 3600);
    return data?.signedUrl || fileUrl;
  }
  return fileUrl;
}

/**
 * Helper to delete a storage object file from Supabase Storage
 */
async function deleteStorageFile(bucketName, fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return;
  const splitStr = `/${bucketName}/`;
  const urlParts = fileUrl.split(splitStr);
  if (urlParts.length === 2) {
    const path = urlParts[1];
    await supabaseAdmin.storage.from(bucketName).remove([path]);
  }
}

/**
 * Safely normalizes flags from ai_review_results column into a string array
 */
function normalizeFlags(flags) {
  if (!flags) return [];
  if (Array.isArray(flags)) return flags.map((f) => String(f));
  if (typeof flags === "string") {
    const trimmed = flags.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((f) => String(f));
        if (typeof parsed === "object" && parsed !== null) {
          return Object.values(parsed).map((f) => String(f));
        }
      } catch (e) {
        // Fallback to plain string if JSON parse fails
      }
    }
    return [trimmed];
  }
  return [String(flags)];
}

/**
 * Verifies current authenticated user is an auditor in Supabase auditors table.
 * Returns the auditor database record.
 */
async function getAuthenticatedAuditor() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized: Sign in required.");

  // 1. Fetch internal integer ID from users table
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!userRow || userRow.role !== "auditor") {
    throw new Error("Unauthorized: Auditor access required.");
  }

  // 2. Fetch auditor profile record using internal integer user_id
  const { data: auditor } = await supabaseAdmin
    .from("auditors")
    .select("*")
    .eq("user_id", userRow.id)
    .maybeSingle();

  if (!auditor) {
    throw new Error("Unauthorized: Auditor profile record not found.");
  }

  return auditor;
}

/**
 * Fetches Queue Data for Auditor Portal (Pending or Resolved tab)
 */
export async function getAuditorQueueData(tab = "pending") {
  await getAuthenticatedAuditor();
  const isPendingTab = tab === "pending";

  // Fetch all AI Review Results for mapping suggestions
  const { data: allAiReviews } = await supabaseAdmin
    .from("ai_review_results")
    .select("*")
    .order("created_at", { ascending: false });

  const aiReviewsList = allAiReviews || [];

  // Group AI review results by entity_type and entity_id
  const aiMap = {};
  aiReviewsList.forEach((r) => {
    const key = `${r.entity_type}_${r.entity_id}`;
    if (!aiMap[key]) aiMap[key] = [];
    aiMap[key].push(r);
  });

  const cases = [];

  // ----------------------------------------------------
  // 1. INVESTORS
  // ----------------------------------------------------
  const investorStatusFilter = isPendingTab
    ? ["pending review", "pending_review"]
    : ["approved", "rejected"];

  const { data: investors } = await supabaseAdmin
    .from("investors")
    .select("*")
    .in("onboarding_status", investorStatusFilter);

  (investors || []).forEach((inv) => {
    // Get document reviews & onboarding review for this investor
    const onboardingReview = (aiMap[`investor_onboarding_${inv.id}`] || [])[0];
    
    // Find all doc reviews for docs linked to this investor
    const docReviewKeys = Object.keys(aiMap).filter((k) => k.startsWith("investor_document_review_"));
    const relatedDocReviews = docReviewKeys
      .flatMap((k) => aiMap[k])
      .filter((r) => r.reasoning_summary || r.suggested_outcome);

    const suggestedClass = onboardingReview?.suggested_class;
    
    // Outcome: if any doc review is rejected -> rejected, else if any approved -> approved
    let suggestedOutcome = onboardingReview?.suggested_outcome || null;
    if (!suggestedOutcome && relatedDocReviews.length > 0) {
      const hasRejection = relatedDocReviews.some((d) => d.suggested_outcome === "rejected");
      suggestedOutcome = hasRejection ? "rejected" : "approved";
    }

    // Confidence: average of onboarding and doc reviews
    const confScores = [
      onboardingReview?.confidence_score,
      ...relatedDocReviews.map((d) => d.confidence_score),
    ].filter((c) => c !== undefined && c !== null);

    const avgConfidence = confScores.length > 0
      ? confScores.reduce((a, b) => Number(a) + Number(b), 0) / confScores.length
      : null;

    // Check if human auditor resolved it or if pending
    const status = isPendingTab
      ? "pending"
      : "resolved";

    cases.push({
      id: inv.id,
      type: "investor",
      title: inv.full_name || inv.legal_entity_name || inv.email || `Investor #${inv.id}`,
      submittedAt: inv.consent_timestamp || inv.created_at,
      status,
      aiSummary: {
        confidence: avgConfidence,
        suggestedOutcome,
        suggestedClass,
      },
    });
  });

  // ----------------------------------------------------
  // 2. ISSUERS
  // ----------------------------------------------------
  const issuerStatusFilter = isPendingTab
    ? ["pending review", "pending_review"]
    : ["approved", "rejected"];

  const { data: issuers } = await supabaseAdmin
    .from("issuers")
    .select("*")
    .in("onboarding_status", issuerStatusFilter);

  (issuers || []).forEach((iss) => {
    // Find doc reviews for issuer
    const docReviewKeys = Object.keys(aiMap).filter((k) => k.startsWith("issuer_document_review_"));
    const relatedDocReviews = docReviewKeys
      .flatMap((k) => aiMap[k])
      .filter((r) => r.reasoning_summary || r.suggested_outcome);

    let suggestedOutcome = null;
    if (relatedDocReviews.length > 0) {
      const hasRejection = relatedDocReviews.some((d) => d.suggested_outcome === "rejected");
      suggestedOutcome = hasRejection ? "rejected" : "approved";
    }

    const confScores = relatedDocReviews
      .map((d) => d.confidence_score)
      .filter((c) => c !== undefined && c !== null);

    const avgConfidence = confScores.length > 0
      ? confScores.reduce((a, b) => Number(a) + Number(b), 0) / confScores.length
      : null;

    const status = isPendingTab ? "pending" : "resolved";

    cases.push({
      id: iss.id,
      type: "issuer",
      title: iss.legal_entity_name || `Issuer #${iss.id}`,
      submittedAt: iss.consent_timestamp || iss.created_at,
      status,
      aiSummary: {
        confidence: avgConfidence,
        suggestedOutcome,
        suggestedClass: null,
      },
    });
  });

  // ----------------------------------------------------
  // 3. PROJECTS
  // ----------------------------------------------------
  const projectStatusFilter = isPendingTab
    ? ["pending_review", "pending review"]
    : ["approved", "rejected", "published", "campaign_live", "active"];

  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("*")
    .in("status", projectStatusFilter);

  (projects || []).forEach((proj) => {
    const minVisReview = (aiMap[`project_min_visibility_class_review_${proj.id}`] || [])[0];
    
    // Find media and doc reviews
    const mediaKeys = Object.keys(aiMap).filter((k) => k.startsWith("project_media_review_"));
    const docKeys = Object.keys(aiMap).filter((k) => k.startsWith("project_document_review_"));

    const relatedReviews = [...mediaKeys, ...docKeys]
      .flatMap((k) => aiMap[k])
      .filter((r) => r.reasoning_summary || r.suggested_outcome);

    let suggestedOutcome = minVisReview?.suggested_outcome || null;
    if (!suggestedOutcome && relatedReviews.length > 0) {
      const hasRejection = relatedReviews.some((r) => r.suggested_outcome === "rejected");
      suggestedOutcome = hasRejection ? "rejected" : "approved";
    }

    const confScores = [
      minVisReview?.confidence_score,
      ...relatedReviews.map((r) => r.confidence_score),
    ].filter((c) => c !== undefined && c !== null);

    const avgConfidence = confScores.length > 0
      ? confScores.reduce((a, b) => Number(a) + Number(b), 0) / confScores.length
      : null;

    const status = isPendingTab ? "pending" : "resolved";

    cases.push({
      id: proj.id,
      type: "project",
      title: proj.title || `Project #${proj.id}`,
      submittedAt: proj.updated_at || proj.created_at,
      status,
      aiSummary: {
        confidence: avgConfidence,
        suggestedOutcome,
        suggestedClass: minVisReview?.suggested_class || null,
      },
    });
  });

  // ----------------------------------------------------
  // 4. PROJECT MILESTONES
  // ----------------------------------------------------
  if (isPendingTab) {
    // Pending Tab: milestone verification_status = 'pending' AND AI review confidence <= 0.8
    const { data: pendingMilestones } = await supabaseAdmin
      .from("project_milestones")
      .select("*, projects(title)")
      .eq("verification_status", "pending");

    (pendingMilestones || []).forEach((m) => {
      const aiReview = (aiMap[`milestone_review_${m.id}`] || [])[0];
      const confidence = aiReview?.confidence_score !== undefined ? Number(aiReview.confidence_score) : 0;

      // Filter: confidence <= 0.8 (higher confidence were auto-decided)
      if (!aiReview || confidence <= 0.8) {
        const projectTitle = m.projects?.title ? `${m.projects.title} — ` : "";
        cases.push({
          id: m.id,
          type: "milestone",
          title: `${projectTitle}${m.title}`,
          submittedAt: m.created_at || m.target_date,
          status: "pending",
          aiSummary: {
            confidence: aiReview?.confidence_score ?? null,
            suggestedOutcome: aiReview?.suggested_outcome || null,
            suggestedClass: null,
          },
        });
      }
    });
  } else {
    // Resolved Tab: milestones past pending, OR milestones auto-decided by AI (reviewed_by = 0)
    const { data: resolvedMilestones } = await supabaseAdmin
      .from("project_milestones")
      .select("*, projects(title)")
      .neq("verification_status", "pending");

    (resolvedMilestones || []).forEach((m) => {
      const aiReview = (aiMap[`milestone_review_${m.id}`] || [])[0];
      const isAiDecided = aiReview?.reviewed_by === 0 || m.verification_status === "approved" && aiReview?.confidence_score > 0.8;
      const status = isAiDecided ? "ai_decided" : "resolved";

      const projectTitle = m.projects?.title ? `${m.projects.title} — ` : "";
      cases.push({
        id: m.id,
        type: "milestone",
        title: `${projectTitle}${m.title}`,
        submittedAt: m.created_at || m.target_date,
        status,
        aiSummary: {
          confidence: aiReview?.confidence_score ?? null,
          suggestedOutcome: aiReview?.final_decision || aiReview?.suggested_outcome || null,
          suggestedClass: null,
        },
      });
    });

    // Also include milestones that might still have verification_status = 'pending' in table but were auto-decided with reviewed_by = 0
    const aiAutoDecidedMilestones = aiReviewsList.filter(
      (r) => r.entity_type === "milestone_review" && r.reviewed_by === 0
    );

    for (const autoAi of aiAutoDecidedMilestones) {
      const alreadyAdded = cases.some((c) => c.type === "milestone" && c.id === autoAi.entity_id);
      if (!alreadyAdded) {
        const { data: m } = await supabaseAdmin
          .from("project_milestones")
          .select("*, projects(title)")
          .eq("id", autoAi.entity_id)
          .maybeSingle();

        if (m) {
          const projectTitle = m.projects?.title ? `${m.projects.title} — ` : "";
          cases.push({
            id: m.id,
            type: "milestone",
            title: `${projectTitle}${m.title}`,
            submittedAt: m.created_at || m.target_date,
            status: "ai_decided",
            aiSummary: {
              confidence: autoAi.confidence_score ?? null,
              suggestedOutcome: autoAi.final_decision || autoAi.suggested_outcome || null,
              suggestedClass: null,
            },
          });
        }
      }
    }
  }

  // Sort combined queue list by submittedAt (newest first)
  cases.sort((a, b) => {
    const timeA = new Date(a.submittedAt || 0).getTime();
    const timeB = new Date(b.submittedAt || 0).getTime();
    return timeB - timeA;
  });

  return { cases };
}

/**
 * Fetches Case Detail Data by entity type & ID
 */
export async function getAuditorCaseDetails(type, id) {
  await getAuthenticatedAuditor();
  const numId = !isNaN(Number(id)) ? Number(id) : id;

  if (type === "investor") {
    // ----------------------------------------------------
    // INVESTOR CASE DETAIL
    // ----------------------------------------------------
    const { data: investor, error } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("id", numId)
      .single();

    if (error || !investor) throw new Error("Investor case not found.");

    // Decrypt sensitive fields
    if (investor.id_number) investor.id_number = decrypt(investor.id_number);
    if (investor.trade_license_number) investor.trade_license_number = decrypt(investor.trade_license_number);
    if (investor.bank_details?.iban) investor.bank_details.iban = decrypt(investor.bank_details.iban);

    // Fetch reps & docs
    const { data: reps } = await supabaseAdmin
      .from("investor_reps")
      .select("*")
      .eq("investor_id", numId);

    const { data: docs } = await supabaseAdmin
      .from("investor_docs")
      .select("*")
      .eq("investor_id", numId);

    // Generate signed URLs
    const docsWithUrls = await Promise.all(
      (docs || []).map(async (doc) => {
        const signedUrl = await getSignedUrl("investor_docs", doc.url);
        return {
          ...doc,
          signedUrl,
          document_password: doc.document_password ? decrypt(doc.document_password) : null,
        };
      })
    );

    const repsWithUrls = await Promise.all(
      (reps || []).map(async (rep) => {
        const signedUrl = await getSignedUrl("investor_reps", rep.id_url);
        return {
          ...rep,
          signedUrl,
          id_number: rep.id_number ? decrypt(rep.id_number) : null,
        };
      })
    );

    // Fetch AI Review Results for this investor
    const docIds = docsWithUrls.map((d) => d.id);
    const { data: docAiReviews } = docIds.length > 0
      ? await supabaseAdmin
          .from("ai_review_results")
          .select("*")
          .eq("entity_type", "investor_document_review")
          .in("entity_id", docIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const { data: onboardingAiReviews } = await supabaseAdmin
      .from("ai_review_results")
      .select("*")
      .eq("entity_type", "investor_onboarding")
      .eq("entity_id", numId)
      .order("created_at", { ascending: false });

    const onboardingAi = (onboardingAiReviews || [])[0] || null;

    // Attach AI review to each document
    const docsWithAi = docsWithUrls.map((doc) => {
      const review = (docAiReviews || []).find((r) => String(r.entity_id) === String(doc.id));
      return {
        ...doc,
        aiReview: review ? { ...review, normalizedFlags: normalizeFlags(review.flags) } : null,
      };
    });

    // Normalize flags for main AI suggestion
    const normalizedFlags = onboardingAi ? normalizeFlags(onboardingAi.flags) : [];

    return {
      type: "investor",
      entity: investor,
      reps: repsWithUrls,
      docs: docsWithAi,
      aiSuggestion: onboardingAi
        ? {
            ...onboardingAi,
            normalizedFlags,
          }
        : null,
    };
  }

  if (type === "issuer") {
    // ----------------------------------------------------
    // ISSUER CASE DETAIL
    // ----------------------------------------------------
    const { data: issuer, error } = await supabaseAdmin
      .from("issuers")
      .select("*")
      .eq("id", numId)
      .single();

    if (error || !issuer) throw new Error("Issuer case not found.");

    if (issuer.trade_license_number) issuer.trade_license_number = decrypt(issuer.trade_license_number);
    if (issuer.bank_details?.iban) issuer.bank_details.iban = decrypt(issuer.bank_details.iban);

    const { data: reps } = await supabaseAdmin
      .from("issuer_reps")
      .select("*")
      .eq("issuer_id", numId);

    const { data: docs } = await supabaseAdmin
      .from("issuer_docs")
      .select("*")
      .eq("issuer_id", numId);

    const docsWithUrls = await Promise.all(
      (docs || []).map(async (doc) => {
        const signedUrl = await getSignedUrl("issuer_docs", doc.url);
        return {
          ...doc,
          signedUrl,
          document_password: doc.document_password ? decrypt(doc.document_password) : null,
        };
      })
    );

    const repsWithUrls = await Promise.all(
      (reps || []).map(async (rep) => {
        const signedUrl = await getSignedUrl("issuer_reps", rep.id_url);
        return {
          ...rep,
          signedUrl,
          id_number: rep.id_number ? decrypt(rep.id_number) : null,
        };
      })
    );

    const docIds = docsWithUrls.map((d) => d.id);
    const { data: docAiReviews } = docIds.length > 0
      ? await supabaseAdmin
          .from("ai_review_results")
          .select("*")
          .eq("entity_type", "issuer_document_review")
          .in("entity_id", docIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const docsWithAi = docsWithUrls.map((doc) => {
      const review = (docAiReviews || []).find((r) => String(r.entity_id) === String(doc.id));
      return {
        ...doc,
        aiReview: review ? { ...review, normalizedFlags: normalizeFlags(review.flags) } : null,
      };
    });

    // Aggregate issuer AI suggestion panel
    const allFlags = (docAiReviews || []).flatMap((r) => normalizeFlags(r.flags));
    const confScores = (docAiReviews || [])
      .map((r) => r.confidence_score)
      .filter((c) => c !== null && c !== undefined);

    const avgConfidence = confScores.length > 0
      ? confScores.reduce((a, b) => Number(a) + Number(b), 0) / confScores.length
      : null;

    const hasRejection = (docAiReviews || []).some((r) => r.suggested_outcome === "rejected");
    const suggestedOutcome = (docAiReviews || []).length > 0 ? (hasRejection ? "rejected" : "approved") : null;
    const reasoningSummary = (docAiReviews || [])
      .map((r) => r.reasoning_summary)
      .filter(Boolean)
      .join(" | ");

    return {
      type: "issuer",
      entity: issuer,
      reps: repsWithUrls,
      docs: docsWithAi,
      aiSuggestion: docAiReviews && docAiReviews.length > 0
        ? {
            suggested_outcome: suggestedOutcome,
            confidence_score: avgConfidence,
            reasoning_summary: reasoningSummary || "Issuer document review summary.",
            normalizedFlags: Array.from(new Set(allFlags)),
          }
        : null,
    };
  }

  if (type === "project") {
    // ----------------------------------------------------
    // PROJECT CASE DETAIL
    // ----------------------------------------------------
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("*, spv_details(*)")
      .eq("id", numId)
      .single();

    if (error || !project) throw new Error("Project case not found.");

    const { data: docs } = await supabaseAdmin
      .from("project_docs")
      .select("*")
      .eq("project_id", numId);

    const { data: media } = await supabaseAdmin
      .from("project_media")
      .select("*")
      .eq("project_id", numId);

    const docsWithUrls = await Promise.all(
      (docs || []).map(async (doc) => {
        const rawUrl = doc.file_url || doc.url;
        const signedUrl = rawUrl ? await getSignedUrl("project_docs", rawUrl) : null;
        return { ...doc, signedUrl };
      })
    );

    const mediaWithUrls = await Promise.all(
      (media || []).map(async (m) => {
        const rawUrl = m.url || m.file_url || m.media_url;
        const signedUrl = rawUrl ? await getSignedUrl("project_media", rawUrl) : null;
        return { ...m, signedUrl };
      })
    );

    // Fetch AI Reviews for project
    const docIds = docsWithUrls.map((d) => d.id);
    const mediaIds = mediaWithUrls.map((m) => m.id);

    const { data: docAiReviews } = docIds.length > 0
      ? await supabaseAdmin
          .from("ai_review_results")
          .select("*")
          .eq("entity_type", "project_document_review")
          .in("entity_id", docIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const { data: mediaAiReviews } = mediaIds.length > 0
      ? await supabaseAdmin
          .from("ai_review_results")
          .select("*")
          .eq("entity_type", "project_media_review")
          .in("entity_id", mediaIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const { data: minVisReviews } = await supabaseAdmin
      .from("ai_review_results")
      .select("*")
      .eq("entity_type", "project_min_visibility_class_review")
      .eq("entity_id", numId)
      .order("created_at", { ascending: false });

    const minVisAi = (minVisReviews || [])[0] || null;

    const docsWithAi = docsWithUrls.map((doc) => {
      const review = (docAiReviews || []).find((r) => String(r.entity_id) === String(doc.id));
      return {
        ...doc,
        aiReview: review ? { ...review, normalizedFlags: normalizeFlags(review.flags) } : null,
      };
    });

    const mediaWithAi = mediaWithUrls.map((m) => {
      const review = (mediaAiReviews || []).find((r) => String(r.entity_id) === String(m.id));
      return {
        ...m,
        aiReview: review ? { ...review, normalizedFlags: normalizeFlags(review.flags) } : null,
      };
    });

    const allFlags = [
      ...(minVisAi ? normalizeFlags(minVisAi.flags) : []),
      ...(docAiReviews || []).flatMap((r) => normalizeFlags(r.flags)),
      ...(mediaAiReviews || []).flatMap((r) => normalizeFlags(r.flags)),
    ];

    return {
      type: "project",
      entity: project,
      docs: docsWithAi,
      media: mediaWithAi,
      aiSuggestion: minVisAi
        ? {
            ...minVisAi,
            normalizedFlags: Array.from(new Set(allFlags)),
          }
        : null,
    };
  }

  if (type === "milestone") {
    // ----------------------------------------------------
    // MILESTONE CASE DETAIL
    // ----------------------------------------------------
    const { data: milestone, error } = await supabaseAdmin
      .from("project_milestones")
      .select("*, projects(title)")
      .eq("id", numId)
      .single();

    if (error || !milestone) throw new Error("Milestone case not found.");

    // Fetch other milestones for context
    const { data: otherMilestones } = await supabaseAdmin
      .from("project_milestones")
      .select("*")
      .eq("project_id", milestone.project_id)
      .order("target_date", { ascending: true });

    // Fetch AI Review for milestone
    const { data: aiReviews } = await supabaseAdmin
      .from("ai_review_results")
      .select("*")
      .eq("entity_type", "milestone_review")
      .eq("entity_id", numId)
      .order("created_at", { ascending: false });

    const milestoneAi = (aiReviews || [])[0] || null;

    return {
      type: "milestone",
      entity: milestone,
      otherMilestones: otherMilestones || [],
      aiSuggestion: milestoneAi
        ? {
            ...milestoneAi,
            normalizedFlags: normalizeFlags(milestoneAi.flags),
          }
        : null,
    };
  }

  throw new Error("Invalid case type.");
}

/**
 * Submits Auditor Decision for any case type (investor | issuer | project | milestone)
 * Server-side verified against auditors table.
 */
export async function submitAuditorDecision({
  type,
  id,
  decision,
  investorClass = null,
  rejectionReason = null,
}) {
  const auditor = await getAuthenticatedAuditor();
  const numId = !isNaN(Number(id)) ? Number(id) : id;
  const now = new Date().toISOString();

  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid decision. Must be 'approved' or 'rejected'.");
  }

  // ----------------------------------------------------
  // 1. INVESTOR DECISION
  // ----------------------------------------------------
  if (type === "investor") {
    const { data: investor } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("id", numId)
      .single();

    if (!investor) throw new Error("Investor profile record not found.");

    const updatePayload = {
      onboarding_status: decision,
    };

    if (decision === "approved" && investorClass) {
      updatePayload.investor_class = Number(investorClass);
    }

    // Update investor profile
    const { error: invErr } = await supabaseAdmin
      .from("investors")
      .update(updatePayload)
      .eq("id", numId);

    if (invErr) throw new Error(`Failed to update investor profile: ${invErr.message}`);

    // Update investor documents
    if (decision === "rejected") {
      const { data: docs } = await supabaseAdmin
        .from("investor_docs")
        .select("id, url")
        .eq("investor_id", numId);

      for (const doc of docs || []) {
        if (doc.url) {
          await deleteStorageFile("investor_docs", doc.url);
        }
      }

      await supabaseAdmin
        .from("investor_docs")
        .update({
          status: decision,
          rejection_reason: rejectionReason,
          reviewed_by: auditor.id,
          reviewed_at: now,
          url: null,
        })
        .eq("investor_id", numId);
    } else {
      await supabaseAdmin
        .from("investor_docs")
        .update({
          status: decision,
          rejection_reason: null,
          reviewed_by: auditor.id,
          reviewed_at: now,
        })
        .eq("investor_id", numId);
    }

    // Update AI review results for investor
    const { data: docs } = await supabaseAdmin
      .from("investor_docs")
      .select("id")
      .eq("investor_id", numId);

    const docIds = (docs || []).map((d) => d.id);

    if (docIds.length > 0) {
      await supabaseAdmin
        .from("ai_review_results")
        .update({
          reviewed_by: auditor.id,
          final_decision: decision,
          reviewed_at: now,
        })
        .eq("entity_type", "investor_document_review")
        .in("entity_id", docIds);
    }

    await supabaseAdmin
      .from("ai_review_results")
      .update({
        reviewed_by: auditor.id,
        final_decision: decision,
        reviewed_at: now,
      })
      .eq("entity_type", "investor_onboarding")
      .eq("entity_id", numId);

    revalidatePath("/auditor-portal");
    revalidatePath(`/auditor-portal/case/investor/${numId}`);
    return { success: true };
  }

  // ----------------------------------------------------
  // 2. ISSUER DECISION
  // ----------------------------------------------------
  if (type === "issuer") {
    const { data: issuer } = await supabaseAdmin
      .from("issuers")
      .select("id")
      .eq("id", numId)
      .single();

    if (!issuer) throw new Error("Issuer profile record not found.");

    // Update issuer profile
    const { error: issErr } = await supabaseAdmin
      .from("issuers")
      .update({ onboarding_status: decision })
      .eq("id", numId);

    if (issErr) throw new Error(`Failed to update issuer profile: ${issErr.message}`);

    // Update issuer docs
    if (decision === "rejected") {
      const { data: docs } = await supabaseAdmin
        .from("issuer_docs")
        .select("id, url")
        .eq("issuer_id", numId);

      for (const doc of docs || []) {
        if (doc.url) {
          await deleteStorageFile("issuer_docs", doc.url);
        }
      }

      await supabaseAdmin
        .from("issuer_docs")
        .update({
          status: decision,
          rejection_reason: rejectionReason,
          reviewed_by: auditor.id,
          reviewed_at: now,
          url: null,
        })
        .eq("issuer_id", numId);
    } else {
      await supabaseAdmin
        .from("issuer_docs")
        .update({
          status: decision,
          rejection_reason: null,
          reviewed_by: auditor.id,
          reviewed_at: now,
        })
        .eq("issuer_id", numId);
    }

    // Update AI review results for issuer docs
    const { data: docs } = await supabaseAdmin
      .from("issuer_docs")
      .select("id")
      .eq("issuer_id", numId);

    const docIds = (docs || []).map((d) => d.id);

    if (docIds.length > 0) {
      await supabaseAdmin
        .from("ai_review_results")
        .update({
          reviewed_by: auditor.id,
          final_decision: decision,
          reviewed_at: now,
        })
        .eq("entity_type", "issuer_document_review")
        .in("entity_id", docIds);
    }

    revalidatePath("/auditor-portal");
    revalidatePath(`/auditor-portal/case/issuer/${numId}`);
    return { success: true };
  }

  // ----------------------------------------------------
  // 3. PROJECT DECISION
  // ----------------------------------------------------
  if (type === "project") {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", numId)
      .single();

    if (!project) throw new Error("Project record not found.");

    // Update project status
    const projectStatus = decision === "approved" || decision === "approve" ? "campaign_live" : decision;
    const { error: projErr } = await supabaseAdmin
      .from("projects")
      .update({ status: projectStatus })
      .eq("id", numId);

    if (projErr) throw new Error(`Failed to update project status: ${projErr.message}`);

    // Update project docs & media
    await supabaseAdmin
      .from("project_docs")
      .update({
        review_status: decision,
        rejection_reason: decision === "rejected" ? rejectionReason : null,
        reviewed_by: auditor.id,
        reviewed_at: now,
      })
      .eq("project_id", numId);

    await supabaseAdmin
      .from("project_media")
      .update({
        review_status: decision,
        rejection_reason: decision === "rejected" ? rejectionReason : null,
        reviewed_by: auditor.id,
        reviewed_at: now,
      })
      .eq("project_id", numId);

    // Update AI review results
    const { data: docs } = await supabaseAdmin
      .from("project_docs")
      .select("id")
      .eq("project_id", numId);

    const { data: media } = await supabaseAdmin
      .from("project_media")
      .select("id")
      .eq("project_id", numId);

    const docIds = (docs || []).map((d) => d.id);
    const mediaIds = (media || []).map((m) => m.id);

    if (docIds.length > 0) {
      await supabaseAdmin
        .from("ai_review_results")
        .update({
          reviewed_by: auditor.id,
          final_decision: decision,
          reviewed_at: now,
        })
        .eq("entity_type", "project_document_review")
        .in("entity_id", docIds);
    }

    if (mediaIds.length > 0) {
      await supabaseAdmin
        .from("ai_review_results")
        .update({
          reviewed_by: auditor.id,
          final_decision: decision,
          reviewed_at: now,
        })
        .eq("entity_type", "project_media_review")
        .in("entity_id", mediaIds);
    }

    await supabaseAdmin
      .from("ai_review_results")
      .update({
        reviewed_by: auditor.id,
        final_decision: decision,
        reviewed_at: now,
      })
      .eq("entity_type", "project_min_visibility_class_review")
      .eq("entity_id", numId);

    revalidatePath("/auditor-portal");
    revalidatePath(`/auditor-portal/case/project/${numId}`);
    return { success: true };
  }

  // ----------------------------------------------------
  // 4. MILESTONE DECISION
  // ----------------------------------------------------
  if (type === "milestone") {
    const { data: milestone } = await supabaseAdmin
      .from("project_milestones")
      .select("id, status")
      .eq("id", numId)
      .single();

    if (!milestone) throw new Error("Milestone record not found.");

    const updatePayload = {
      verification_status: decision,
    };

    if (decision === "approved") {
      updatePayload.status = "completed";
    }

    const { error: mErr } = await supabaseAdmin
      .from("project_milestones")
      .update(updatePayload)
      .eq("id", numId);

    if (mErr) throw new Error(`Failed to update milestone status: ${mErr.message}`);

    // Update AI review result for milestone
    await supabaseAdmin
      .from("ai_review_results")
      .update({
        reviewed_by: auditor.id,
        final_decision: decision,
        reviewed_at: now,
      })
      .eq("entity_type", "milestone_review")
      .eq("entity_id", numId);

    revalidatePath("/auditor-portal");
    revalidatePath(`/auditor-portal/case/milestone/${numId}`);
    return { success: true };
  }

  throw new Error("Invalid case type.");
}

/**
 * ====================================================================
 * STEP 1: AUDITOR PORTAL OVERHAUL SERVER ACTIONS
 * ====================================================================
 */

/**
 * Calculates pending counts across all 6 compliance review modules for the Dashboard
 */
export async function getAuditorDashboardCounts() {
  await getAuthenticatedAuditor();

  // 1. Investor Onboarding Pending Count
  const { count: investorCount } = await supabaseAdmin
    .from("investors")
    .select("id", { count: "exact", head: true })
    .in("onboarding_status", ["pending_review", "pending review"]);

  // 2. Issuer Onboarding Pending Count
  const { count: issuerCount } = await supabaseAdmin
    .from("issuers")
    .select("id", { count: "exact", head: true })
    .in("onboarding_status", ["pending_review", "pending review"]);

  // 3. Project Creation Pending Count
  const { count: projectCount } = await supabaseAdmin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending_review", "pending review"]);

  // 4. Milestone Review Pending Count
  const { count: milestoneCount } = await supabaseAdmin
    .from("project_milestones")
    .select("id", { count: "exact", head: true })
    .in("verification_status", ["pending", "pending_review"]);

  // 5. Bank Details Review Pending Count (Investors + Issuers)
  const { count: invBankCount } = await supabaseAdmin
    .from("investors")
    .select("id", { count: "exact", head: true })
    .eq("bank_verification_status", "pending");

  const { count: issBankCount } = await supabaseAdmin
    .from("issuers")
    .select("id", { count: "exact", head: true })
    .eq("bank_verification_status", "pending");

  return {
    investorOnboarding: investorCount || 0,
    issuerOnboarding: issuerCount || 0,
    projectCreation: projectCount || 0,
    milestoneReview: milestoneCount || 0,
    bankReview: (invBankCount || 0) + (issBankCount || 0),
  };
}

/**
 * Fetches all investors currently pending onboarding review
 */
export async function getInvestorOnboardingQueue() {
  await getAuthenticatedAuditor();

  const { data: investors, error } = await supabaseAdmin
    .from("investors")
    .select("*")
    .in("onboarding_status", ["pending_review", "pending review"])
    .order("created_at", { ascending: false });

  if (error) {
    return { investors: [], error: error.message };
  }

  return { investors: investors || [], error: null };
}

/**
 * Fetches complete investor onboarding details, decrypted identity fields, signed document URLs, AI review data, and representatives.
 */
export async function getInvestorOnboardingDetails(investorId) {
  await getAuthenticatedAuditor();

  // 1. Query Investor
  const { data: investor, error: invErr } = await supabaseAdmin
    .from("investors")
    .select("*")
    .eq("id", investorId)
    .maybeSingle();

  if (invErr || !investor) {
    return { error: invErr?.message || "Investor record not found." };
  }

  // Decrypt sensitive fields
  if (investor.id_number) {
    investor.id_number = decrypt(investor.id_number) || investor.id_number;
  }
  if (investor.trade_license_number) {
    investor.trade_license_number = decrypt(investor.trade_license_number) || investor.trade_license_number;
  }
  if (investor.bank_details) {
    let bankObj = investor.bank_details;
    if (typeof bankObj === "string") {
      try {
        bankObj = JSON.parse(bankObj);
      } catch (e) {}
    }
    if (bankObj && typeof bankObj === "object") {
      if (bankObj.iban) bankObj.iban = decrypt(bankObj.iban) || bankObj.iban;
      if (bankObj.account_number) bankObj.account_number = decrypt(bankObj.account_number) || bankObj.account_number;
      investor.bank_details = bankObj;
    }
  }

  // 2. Query investor_docs
  const { data: docs } = await supabaseAdmin
    .from("investor_docs")
    .select("*")
    .eq("investor_id", investor.id)
    .order("uploaded_at", { ascending: false });

  const processedDocs = await Promise.all(
    (docs || []).map(async (doc) => {
      const signedUrl = await getSignedUrl("investor_docs", doc.url);

      // Query ai_review_results for this doc: entity_type = 'investor_document_review' & entity_id = doc.id
      const { data: aiResultList } = await supabaseAdmin
        .from("ai_review_results")
        .select("*")
        .eq("entity_type", "investor_document_review")
        .eq("entity_id", doc.id)
        .order("created_at", { ascending: false });

      const aiResult = (aiResultList || [])[0] || null;

      return {
        ...doc,
        signedUrl,
        aiReview: aiResult
          ? {
              ...aiResult,
              flags: normalizeFlags(aiResult.flags),
            }
          : null,
      };
    })
  );

  // 3. Query investor_reps
  const { data: reps } = await supabaseAdmin
    .from("investor_reps")
    .select("*")
    .eq("investor_id", investor.id);

  const processedReps = await Promise.all(
    (reps || []).map(async (rep) => {
      const decryptedIdNumber = rep.id_number ? decrypt(rep.id_number) || rep.id_number : null;
      const signedIdUrl = rep.id_url ? await getSignedUrl("investor_reps", rep.id_url) : null;
      return {
        ...rep,
        id_number: decryptedIdNumber,
        signedIdUrl,
      };
    })
  );

  // 4. Query investor_onboarding AI Review Result for Investor Class suggestion
  const { data: classAiResultList } = await supabaseAdmin
    .from("ai_review_results")
    .select("*")
    .eq("entity_type", "investor_onboarding")
    .eq("entity_id", investor.id)
    .order("created_at", { ascending: false });

  const classAiReview = (classAiResultList || [])[0]
    ? {
        ...(classAiResultList[0]),
        flags: normalizeFlags(classAiResultList[0].flags),
      }
    : null;

  return {
    investor,
    documents: processedDocs,
    representatives: processedReps,
    classAiReview,
    error: null,
  };
}

/**
 * Updates a single investor document review status (Approve or Reject with reason)
 */
export async function updateInvestorDocumentDecision({ docId, decision, rejectionReason }) {
  const auditor = await getAuthenticatedAuditor();

  const now = new Date().toISOString();
  const updatePayload = {
    status: decision,
    rejection_reason: decision === "rejected" ? rejectionReason : null,
    reviewed_by: auditor.id,
    reviewed_at: now,
  };

  if (decision === "rejected") {
    const { data: currentDoc } = await supabaseAdmin
      .from("investor_docs")
      .select("url")
      .eq("id", docId)
      .maybeSingle();

    if (currentDoc?.url) {
      await deleteStorageFile("investor_docs", currentDoc.url);
    }
    updatePayload.url = null;
  }

  const { data: doc, error: updateErr } = await supabaseAdmin
    .from("investor_docs")
    .update(updatePayload)
    .eq("id", docId)
    .select("id, investor_id")
    .single();

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Also update ai_review_results if present for this doc
  await supabaseAdmin
    .from("ai_review_results")
    .update({
      reviewed_by: auditor.id,
      final_decision: decision,
      reviewed_at: now,
    })
    .eq("entity_type", "investor_document_review")
    .eq("entity_id", docId);

  if (doc?.investor_id) {
    revalidatePath(`/auditor-portal/investor-onboarding/${doc.investor_id}`);
  }

  return { success: true };
}

/**
 * Updates an investor's bank details verification status (Approved or Rejected)
 */
export async function updateInvestorBankDecision({ investorId, decision }) {
  await getAuthenticatedAuditor();

  const { error } = await supabaseAdmin
    .from("investors")
    .update({
      bank_verification_status: decision,
    })
    .eq("id", investorId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/auditor-portal/investor-onboarding/${investorId}`);
  return { success: true };
}

/**
 * Sets and confirms/approves an investor's assigned investor_class (1–10)
 */
export async function updateInvestorClassDecision({ investorId, selectedClass }) {
  const auditor = await getAuthenticatedAuditor();
  const classNum = Number(selectedClass);

  if (isNaN(classNum) || classNum < 1 || classNum > 10) {
    return { success: false, error: "Invalid investor class level. Must be between 1 and 10." };
  }

  // Update investors table
  const { error: invErr } = await supabaseAdmin
    .from("investors")
    .update({
      investor_class: classNum,
    })
    .eq("id", investorId);

  if (invErr) {
    return { success: false, error: invErr.message };
  }

  const now = new Date().toISOString();

  // Upsert / update ai_review_results for investor_onboarding
  const { data: existingAiList } = await supabaseAdmin
    .from("ai_review_results")
    .select("id")
    .eq("entity_type", "investor_onboarding")
    .eq("entity_id", investorId)
    .order("created_at", { ascending: false });

  const existingAi = (existingAiList || [])[0] || null;

  if (existingAi) {
    await supabaseAdmin
      .from("ai_review_results")
      .update({
        reviewed_by: auditor.id,
        final_decision: String(classNum),
        reviewed_at: now,
      })
      .eq("id", existingAi.id);
  } else {
    await supabaseAdmin
      .from("ai_review_results")
      .insert([
        {
          entity_type: "investor_onboarding",
          entity_id: investorId,
          suggested_class: classNum,
          reviewed_by: auditor.id,
          final_decision: String(classNum),
          reviewed_at: now,
        },
      ]);
  }

  revalidatePath(`/auditor-portal/investor-onboarding/${investorId}`);
  return { success: true };
}

/**
 * Finalizes the overall onboarding submission for an investor (Approve, Send Back, or Reject)
 */
export async function submitInvestorFinalOnboardingDecision({ investorId, decision, reviewNotes }) {
  await getAuthenticatedAuditor();

  // 1. Verify all docs are decided (none pending)
  const { data: docs } = await supabaseAdmin
    .from("investor_docs")
    .select("id, status")
    .eq("investor_id", investorId);

  const pendingDocs = (docs || []).filter((d) => d.status === "pending");
  if (pendingDocs.length > 0) {
    return {
      success: false,
      error: "Cannot finalize submission: All documents must be approved or rejected before completing the review.",
    };
  }

  // 2. Verify bank details are decided (not pending)
  const { data: inv } = await supabaseAdmin
    .from("investors")
    .select("id, bank_verification_status, investor_class")
    .eq("id", investorId)
    .single();

  if (!inv || inv.bank_verification_status === "pending") {
    return {
      success: false,
      error: "Cannot finalize submission: Bank details verification status must be approved or rejected first.",
    };
  }

  // 3. Verify investor class has been approved/confirmed by auditor
  const { data: classAiList } = await supabaseAdmin
    .from("ai_review_results")
    .select("id, reviewed_by, final_decision")
    .eq("entity_type", "investor_onboarding")
    .eq("entity_id", investorId)
    .order("created_at", { ascending: false });

  const classAi = (classAiList || [])[0] || null;

  if (!classAi || !classAi.reviewed_by) {
    return {
      success: false,
      error: "Cannot finalize submission: Auditor must select and confirm/approve the Investor Class assignment first.",
    };
  }

  let onboardingStatus = "completed";
  let finalNotes = null;

  if (decision === "approve") {
    onboardingStatus = "completed";
    finalNotes = null;
  } else if (decision === "send_back") {
    onboardingStatus = "incomplete";
    finalNotes = reviewNotes || "Additional documentation or corrections required.";
  } else if (decision === "reject") {
    onboardingStatus = "rejected";
    finalNotes = reviewNotes || "Onboarding application rejected.";
  } else {
    return { success: false, error: "Invalid decision option." };
  }

  const { error } = await supabaseAdmin
    .from("investors")
    .update({
      onboarding_status: onboardingStatus,
      review_notes: finalNotes,
    })
    .eq("id", investorId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/auditor-portal/investor-onboarding");
  revalidatePath(`/auditor-portal/investor-onboarding/${investorId}`);
  return { success: true };
}

/**
 * ====================================================================
 * ISSUER ONBOARDING AUDITOR SERVER ACTIONS
 * ====================================================================
 */

/**
 * Fetches all issuers currently pending onboarding review
 */
export async function getIssuerOnboardingQueue() {
  await getAuthenticatedAuditor();

  const { data: issuers, error } = await supabaseAdmin
    .from("issuers")
    .select("*")
    .in("onboarding_status", ["pending_review", "pending review"])
    .order("created_at", { ascending: false });

  if (error) {
    return { issuers: [], error: error.message };
  }

  return { issuers: issuers || [], error: null };
}

/**
 * Fetches complete issuer onboarding details, decrypted trade license & bank fields, signed document URLs, AI review data, and representatives.
 */
export async function getIssuerOnboardingDetails(issuerId) {
  await getAuthenticatedAuditor();

  const numId = !isNaN(Number(issuerId)) ? Number(issuerId) : issuerId;

  // 1. Query Issuer
  const { data: issuer, error: issErr } = await supabaseAdmin
    .from("issuers")
    .select("*")
    .eq("id", numId)
    .maybeSingle();

  if (issErr || !issuer) {
    return { error: issErr?.message || "Issuer record not found." };
  }

  // Decrypt sensitive fields
  if (issuer.trade_license_number) {
    issuer.trade_license_number = decrypt(issuer.trade_license_number) || issuer.trade_license_number;
  }
  if (issuer.bank_details) {
    let bankObj = issuer.bank_details;
    if (typeof bankObj === "string") {
      try {
        bankObj = JSON.parse(bankObj);
      } catch (e) {}
    }
    if (bankObj && typeof bankObj === "object") {
      if (bankObj.iban) bankObj.iban = decrypt(bankObj.iban) || bankObj.iban;
      if (bankObj.account_number) bankObj.account_number = decrypt(bankObj.account_number) || bankObj.account_number;
      issuer.bank_details = bankObj;
    }
  }

  // 2. Query issuer_docs
  const { data: docs } = await supabaseAdmin
    .from("issuer_docs")
    .select("*")
    .eq("issuer_id", issuer.id)
    .order("uploaded_at", { ascending: false });

  const processedDocs = await Promise.all(
    (docs || []).map(async (doc) => {
      const signedUrl = await getSignedUrl("issuer_docs", doc.url);

      // Query ai_review_results for this doc: entity_type = 'issuer_document_review' & entity_id = doc.id
      const { data: aiResultList } = await supabaseAdmin
        .from("ai_review_results")
        .select("*")
        .eq("entity_type", "issuer_document_review")
        .eq("entity_id", doc.id)
        .order("created_at", { ascending: false });

      const aiResult = (aiResultList || [])[0] || null;

      return {
        ...doc,
        signedUrl,
        aiReview: aiResult
          ? {
              ...aiResult,
              flags: normalizeFlags(aiResult.flags),
            }
          : null,
      };
    })
  );

  // 3. Query issuer_reps
  const { data: reps } = await supabaseAdmin
    .from("issuer_reps")
    .select("*")
    .eq("issuer_id", issuer.id);

  const processedReps = await Promise.all(
    (reps || []).map(async (rep) => {
      const decryptedIdNumber = rep.id_number ? decrypt(rep.id_number) || rep.id_number : null;
      const signedIdUrl = rep.id_url ? await getSignedUrl("issuer_reps", rep.id_url) : null;
      return {
        ...rep,
        id_number: decryptedIdNumber,
        signedIdUrl,
      };
    })
  );

  return {
    issuer,
    documents: processedDocs,
    representatives: processedReps,
    error: null,
  };
}

/**
 * Updates a single issuer document review status (Approve or Reject with reason)
 */
export async function updateIssuerDocumentDecision({ docId, decision, rejectionReason }) {
  const auditor = await getAuthenticatedAuditor();

  const { data: doc } = await supabaseAdmin
    .from("issuer_docs")
    .select("id, issuer_id, url")
    .eq("id", docId)
    .single();

  if (!doc) {
    return { success: false, error: "Document not found." };
  }

  const now = new Date().toISOString();

  if (decision === "rejected") {
    if (doc.url) {
      await deleteStorageFile("issuer_docs", doc.url);
    }
    const { error: updateErr } = await supabaseAdmin
      .from("issuer_docs")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
        reviewed_by: auditor.id,
        reviewed_at: now,
        url: null,
      })
      .eq("id", docId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }
  } else {
    const { error: updateErr } = await supabaseAdmin
      .from("issuer_docs")
      .update({
        status: "approved",
        rejection_reason: null,
        reviewed_by: auditor.id,
        reviewed_at: now,
      })
      .eq("id", docId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }
  }

  // Also update ai_review_results if present for this doc
  const { data: existingAiList } = await supabaseAdmin
    .from("ai_review_results")
    .select("id")
    .eq("entity_type", "issuer_document_review")
    .eq("entity_id", docId)
    .order("created_at", { ascending: false });

  const existingAi = (existingAiList || [])[0] || null;

  if (existingAi) {
    await supabaseAdmin
      .from("ai_review_results")
      .update({
        reviewed_by: auditor.id,
        final_decision: decision,
        reviewed_at: now,
      })
      .eq("id", existingAi.id);
  }

  revalidatePath("/auditor-portal/issuer-onboarding");
  revalidatePath(`/auditor-portal/issuer-onboarding/${doc.issuer_id}`);
  return { success: true };
}

/**
 * Updates bank details verification status for an issuer (approved or rejected)
 */
export async function updateIssuerBankDecision({ issuerId, decision }) {
  await getAuthenticatedAuditor();

  const { error } = await supabaseAdmin
    .from("issuers")
    .update({ bank_verification_status: decision })
    .eq("id", issuerId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/auditor-portal/issuer-onboarding");
  revalidatePath(`/auditor-portal/issuer-onboarding/${issuerId}`);
  return { success: true };
}

/**
 * Finalizes the overall onboarding submission for an issuer (Approve, Send Back, or Reject)
 */
export async function submitIssuerFinalOnboardingDecision({ issuerId, decision, reviewNotes }) {
  await getAuthenticatedAuditor();

  // 1. Verify all docs are decided (none pending)
  const { data: docs } = await supabaseAdmin
    .from("issuer_docs")
    .select("id, status")
    .eq("issuer_id", issuerId);

  const pendingDocs = (docs || []).filter((d) => d.status === "pending");
  if (pendingDocs.length > 0) {
    return {
      success: false,
      error: "Cannot finalize submission: All documents must be approved or rejected before completing the review.",
    };
  }

  // 2. Verify bank details are decided (not pending)
  const { data: iss } = await supabaseAdmin
    .from("issuers")
    .select("id, bank_verification_status")
    .eq("id", issuerId)
    .single();

  if (!iss || iss.bank_verification_status === "pending") {
    return {
      success: false,
      error: "Cannot finalize submission: Bank details verification status must be approved or rejected first.",
    };
  }

  let onboardingStatus = "completed";
  let finalNotes = null;

  if (decision === "approve") {
    onboardingStatus = "completed";
    finalNotes = null;
  } else if (decision === "send_back") {
    onboardingStatus = "incomplete";
    finalNotes = reviewNotes || "Additional documentation or corrections required.";
  } else if (decision === "reject") {
    onboardingStatus = "rejected";
    finalNotes = reviewNotes || "Onboarding application rejected.";
  } else {
    return { success: false, error: "Invalid decision option." };
  }

  const { error } = await supabaseAdmin
    .from("issuers")
    .update({
      onboarding_status: onboardingStatus,
      review_notes: finalNotes,
    })
    .eq("id", issuerId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/auditor-portal/issuer-onboarding");
  revalidatePath(`/auditor-portal/issuer-onboarding/${issuerId}`);
  return { success: true };
}

/**
 * ====================================================================
 * BANK DETAILS REVIEW AUDITOR SERVER ACTIONS
 * ====================================================================
 */

/**
 * Fetches all investor and issuer pending bank verification submissions for the Bank Review Queue
 */
export async function getBankReviewQueue() {
  await getAuthenticatedAuditor();

  // 1. Fetch pending bank verification investors
  const { data: investors, error: invErr } = await supabaseAdmin
    .from("investors")
    .select("*")
    .eq("bank_verification_status", "pending")
    .order("created_at", { ascending: false });

  // 2. Fetch pending bank verification issuers
  const { data: issuers, error: issErr } = await supabaseAdmin
    .from("issuers")
    .select("*")
    .eq("bank_verification_status", "pending")
    .order("created_at", { ascending: false });

  if (invErr || issErr) {
    const errMsg = invErr?.message || issErr?.message;
    return { items: [], error: `Failed to fetch bank queue: ${errMsg}` };
  }

  const items = [];

  (investors || []).forEach((inv) => {
    const isInstitutional = inv.type === "institutional";
    const displayName = isInstitutional
      ? inv.legal_entity_name || `Institutional Investor #${inv.id}`
      : inv.full_name || `Investor #${inv.id}`;

    items.push({
      id: inv.id,
      entityType: "investor",
      investorCategory: isInstitutional ? "institutional" : "individual",
      name: displayName,
      title: `${displayName} Bank Details`,
      email: inv.email,
      country: inv.country,
      submittedAt: inv.consent_timestamp || inv.created_at,
    });
  });

  (issuers || []).forEach((iss) => {
    const displayName = iss.legal_entity_name || `Issuer #${iss.id}`;

    items.push({
      id: iss.id,
      entityType: "issuer",
      investorCategory: "corporate",
      name: displayName,
      title: `${displayName} Bank Details`,
      email: iss.business_email,
      country: iss.country,
      submittedAt: iss.consent_timestamp || iss.created_at,
    });
  });

  // Sort combined queue by submission date DESC
  items.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

  return { items, error: null };
}

/**
 * Fetches complete bank review details for a specific investor or issuer including decrypted fields and bank verification letter
 */
export async function getBankReviewDetails({ entityType, entityId }) {
  await getAuthenticatedAuditor();

  const numId = !isNaN(Number(entityId)) ? Number(entityId) : entityId;

  if (entityType === "investor") {
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("id", numId)
      .maybeSingle();

    if (invErr || !inv) {
      return { error: invErr?.message || "Investor record not found." };
    }

    // Decrypt sensitive fields
    const decryptedIdNumber = inv.id_number ? decrypt(inv.id_number) || inv.id_number : null;
    const decryptedTradeLicense = inv.trade_license_number ? decrypt(inv.trade_license_number) || inv.trade_license_number : null;

    let bankObj = inv.bank_details;
    if (typeof bankObj === "string") {
      try {
        bankObj = JSON.parse(bankObj);
      } catch (e) {}
    }
    if (bankObj && typeof bankObj === "object") {
      if (bankObj.iban) bankObj.iban = decrypt(bankObj.iban) || bankObj.iban;
      if (bankObj.account_number) bankObj.account_number = decrypt(bankObj.account_number) || bankObj.account_number;
    }

    // Look up bank_verification_letter in investor_docs
    const { data: doc } = await supabaseAdmin
      .from("investor_docs")
      .select("*")
      .eq("investor_id", numId)
      .eq("doc_type", "bank_verification_letter")
      .order("uploaded_at", { ascending: false })
      .maybeSingle();

    let letterDoc = null;
    if (doc) {
      const signedUrl = doc.url ? await getSignedUrl("investor_docs", doc.url) : null;
      letterDoc = { ...doc, signedUrl };
    }

    return {
      entityType: "investor",
      entity: {
        ...inv,
        id_number: decryptedIdNumber,
        trade_license_number: decryptedTradeLicense,
        bank_details: bankObj,
      },
      letterDoc,
      error: null,
    };
  } else if (entityType === "issuer") {
    const { data: iss, error: issErr } = await supabaseAdmin
      .from("issuers")
      .select("*")
      .eq("id", numId)
      .maybeSingle();

    if (issErr || !iss) {
      return { error: issErr?.message || "Issuer record not found." };
    }

    // Decrypt sensitive fields
    const decryptedTradeLicense = iss.trade_license_number ? decrypt(iss.trade_license_number) || iss.trade_license_number : null;

    let bankObj = iss.bank_details;
    if (typeof bankObj === "string") {
      try {
        bankObj = JSON.parse(bankObj);
      } catch (e) {}
    }
    if (bankObj && typeof bankObj === "object") {
      if (bankObj.iban) bankObj.iban = decrypt(bankObj.iban) || bankObj.iban;
      if (bankObj.account_number) bankObj.account_number = decrypt(bankObj.account_number) || bankObj.account_number;
    }

    // Look up bank_verification_letter in issuer_docs
    const { data: doc } = await supabaseAdmin
      .from("issuer_docs")
      .select("*")
      .eq("issuer_id", numId)
      .eq("doc_type", "bank_verification_letter")
      .order("uploaded_at", { ascending: false })
      .maybeSingle();

    let letterDoc = null;
    if (doc) {
      const signedUrl = doc.url ? await getSignedUrl("issuer_docs", doc.url) : null;
      letterDoc = { ...doc, signedUrl };
    }

    return {
      entityType: "issuer",
      entity: {
        ...iss,
        trade_license_number: decryptedTradeLicense,
        bank_details: bankObj,
      },
      letterDoc,
      error: null,
    };
  }

  return { error: "Invalid entity type." };
}

/**
 * Submits auditor decision for bank verification (approved or rejected with reason)
 */
export async function updateBankVerificationDecision({ entityType, entityId, decision, rejectionReason }) {
  await getAuthenticatedAuditor();

  const numId = !isNaN(Number(entityId)) ? Number(entityId) : entityId;

  if (!["approved", "rejected"].includes(decision)) {
    return { success: false, error: "Invalid decision value." };
  }

  const updatePayload = {
    bank_verification_status: decision,
    bank_verification_rejection_reason: decision === "rejected" ? rejectionReason : null,
  };

  const targetTable = entityType === "investor" ? "investors" : "issuers";

  const { error } = await supabaseAdmin
    .from(targetTable)
    .update(updatePayload)
    .eq("id", numId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/auditor-portal/bank-review");
  revalidatePath("/auditor-portal/investor-onboarding");
  revalidatePath("/auditor-portal/issuer-onboarding");
  return { success: true };
}

/**
 * ====================================================================
 * PROJECT CREATION & MILESTONE AUDITING AUDITOR SERVER ACTIONS
 * ====================================================================
 */

/**
 * Fetches all projects currently pending auditor review
 */
export async function getProjectCreationQueue() {
  await getAuthenticatedAuditor();

  const { data: projects, error } = await supabaseAdmin
    .from("projects")
    .select("*, spv_details(*), issuers(id, legal_entity_name, business_email, country)")
    .in("status", ["pending_review", "pending review"])
    .order("created_at", { ascending: false });

  if (error) {
    return { projects: [], error: error.message };
  }

  // Fetch pending milestone counts per project
  const projectIds = (projects || []).map((p) => p.id);
  const { data: milestones } = projectIds.length > 0
    ? await supabaseAdmin
        .from("project_milestones")
        .select("id, project_id, verification_status")
        .in("project_id", projectIds)
    : { data: [] };

  const processedProjects = (projects || []).map((p) => {
    const projMilestones = (milestones || []).filter((m) => m.project_id === p.id);
    const pendingMilestoneCount = projMilestones.filter((m) => m.verification_status === "pending").length;
    return {
      ...p,
      totalMilestoneCount: projMilestones.length,
      pendingMilestoneCount,
    };
  });

  return { projects: processedProjects, error: null };
}

/**
 * Fetches all project milestones currently pending auditor review
 */
export async function getMilestoneQueue() {
  await getAuthenticatedAuditor();

  const { data: milestones, error } = await supabaseAdmin
    .from("project_milestones")
    .select("*, projects(id, title, status, issuer_id, issuers(id, legal_entity_name, business_email))")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return { milestones: [], error: error.message };
  }

  return { milestones: milestones || [], error: null };
}

/**
 * Fetches complete project creation & milestone review details including SPV data, signed document/media URLs, AI review data, and milestones.
 */
export async function getProjectCreationDetails(projectId) {
  await getAuthenticatedAuditor();

  const numId = !isNaN(Number(projectId)) ? Number(projectId) : projectId;

  // 1. Fetch Project with SPV details and Issuer profile
  const { data: project, error: projErr } = await supabaseAdmin
    .from("projects")
    .select("*, spv_details(*), issuers(id, legal_entity_name, business_email, country, business_phone_number)")
    .eq("id", numId)
    .maybeSingle();

  if (projErr || !project) {
    return { error: projErr?.message || "Project record not found." };
  }

  // Fallback query for spv_details if join was empty or array
  let spvObj = Array.isArray(project.spv_details)
    ? project.spv_details[0] || null
    : project.spv_details || null;

  if (!spvObj) {
    const { data: spvFromDb } = await supabaseAdmin
      .from("spv_details")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle();
    if (spvFromDb) spvObj = spvFromDb;
  }

  // Generate signed URL for Shariah compliance certificate if attached
  const shariahDocRawUrl = project.shariah_certificate_doc_url || project.shariah_compliance_doc_url || null;
  let signedShariahDocUrl = null;
  if (shariahDocRawUrl) {
    signedShariahDocUrl = await getSignedUrl("shariah_compliance_docs", shariahDocRawUrl);
  }
  project.signedShariahDocUrl = signedShariahDocUrl;

  // 2. Query project_docs
  const { data: docs } = await supabaseAdmin
    .from("project_docs")
    .select("*")
    .eq("project_id", project.id)
    .order("uploaded_at", { ascending: false });

  const processedDocs = await Promise.all(
    (docs || []).map(async (doc) => {
      const rawUrl = doc.file_url || doc.url;
      const signedUrl = rawUrl ? await getSignedUrl("project_docs", rawUrl) : null;

      const { data: aiResultList } = await supabaseAdmin
        .from("ai_review_results")
        .select("*")
        .eq("entity_type", "project_document_review")
        .eq("entity_id", doc.id)
        .order("created_at", { ascending: false });

      const aiResult = (aiResultList || [])[0] || null;

      return {
        ...doc,
        signedUrl,
        aiReview: aiResult
          ? {
              ...aiResult,
              flags: normalizeFlags(aiResult.flags),
            }
          : null,
      };
    })
  );

  // 3. Query project_media
  const { data: media } = await supabaseAdmin
    .from("project_media")
    .select("*")
    .eq("project_id", project.id)
    .order("display_order", { ascending: true });

  const processedMedia = await Promise.all(
    (media || []).map(async (m) => {
      const rawUrl = m.url || m.file_url || m.media_url;
      const signedUrl = rawUrl ? await getSignedUrl("project_media", rawUrl) : null;

      const { data: aiResultList } = await supabaseAdmin
        .from("ai_review_results")
        .select("*")
        .eq("entity_type", "project_media_review")
        .eq("entity_id", m.id)
        .order("created_at", { ascending: false });

      const aiResult = (aiResultList || [])[0] || null;

      return {
        ...m,
        signedUrl,
        aiReview: aiResult
          ? {
              ...aiResult,
              flags: normalizeFlags(aiResult.flags),
            }
          : null,
      };
    })
  );

  // 4. Query AI Minimum Visibility Class Review
  const { data: minVisAiList } = await supabaseAdmin
    .from("ai_review_results")
    .select("*")
    .eq("entity_type", "project_min_visibility_class_review")
    .eq("entity_id", project.id)
    .order("created_at", { ascending: false });

  const minVisClassAiReview = (minVisAiList || [])[0]
    ? {
        ...(minVisAiList[0]),
        flags: normalizeFlags(minVisAiList[0].flags),
      }
    : null;

  // 5. Query project_milestones & milestone AI reviews
  const { data: milestones } = await supabaseAdmin
    .from("project_milestones")
    .select("*")
    .eq("project_id", project.id)
    .order("target_date", { ascending: true });

  const processedMilestones = await Promise.all(
    (milestones || []).map(async (m) => {
      let signedProofUrl = null;
      if (m.proof_document_url || m.proof_url) {
        const fileUrl = m.proof_document_url || m.proof_url;
        signedProofUrl = await getSignedUrl("project_docs", fileUrl);
      }

      const { data: aiResultList } = await supabaseAdmin
        .from("ai_review_results")
        .select("*")
        .eq("entity_type", "milestone_review")
        .eq("entity_id", m.id)
        .order("created_at", { ascending: false });

      const aiResult = (aiResultList || [])[0] || null;

      return {
        ...m,
        signedProofUrl,
        aiReview: aiResult
          ? {
              ...aiResult,
              flags: normalizeFlags(aiResult.flags),
            }
          : null,
      };
    })
  );

  return {
    project,
    spvDetails: spvObj,
    issuer: project.issuers || null,
    documents: processedDocs,
    media: processedMedia,
    minVisClassAiReview,
    milestones: processedMilestones,
    error: null,
  };
}

// Postgres "undefined_column" / PostgREST "column not in schema cache"
const MISSING_COLUMN_CODES = new Set(["42703", "PGRST204"]);

/**
 * Best-effort write of audit metadata columns (rejection_reason, reviewed_by, ...)
 * that may not exist on every table yet. Each column is written separately so a
 * missing column never blocks the others or the core status update.
 */
async function applyOptionalColumns(table, id, fields) {
  for (const [column, value] of Object.entries(fields)) {
    const { error } = await supabaseAdmin
      .from(table)
      .update({ [column]: value })
      .eq("id", id);
    if (error && !MISSING_COLUMN_CODES.has(error.code)) {
      console.warn(`[auditor] Failed to set ${table}.${column} for id=${id}:`, error.message);
    }
  }
}

/**
 * Updates a single project document review status (Approve or Reject with reason)
 */
export async function updateProjectDocumentDecision({ docId, decision, rejectionReason }) {
  const auditor = await getAuthenticatedAuditor();

  const { data: doc, error: docErr } = await supabaseAdmin
    .from("project_docs")
    .select("id, project_id, file_url")
    .eq("id", docId)
    .maybeSingle();

  if (docErr) {
    return { success: false, error: docErr.message };
  }
  if (!doc) {
    return { success: false, error: "Document not found." };
  }

  const now = new Date().toISOString();
  const isRejected = decision === "rejected";

  const { error: updateErr } = await supabaseAdmin
    .from("project_docs")
    .update(
      isRejected
        ? { review_status: "rejected", file_url: null }
        : { review_status: "approved" },
    )
    .eq("id", docId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Only remove the stored file once the DB row is safely updated
  if (isRejected && doc.file_url) {
    await deleteStorageFile("project_docs", doc.file_url);
  }

  await applyOptionalColumns("project_docs", docId, {
    rejection_reason: isRejected ? rejectionReason || null : null,
    reviewed_by: auditor.id,
    reviewed_at: now,
  });

  // Update corresponding ai_review_results entry
  const { data: existingAiList } = await supabaseAdmin
    .from("ai_review_results")
    .select("id")
    .eq("entity_type", "project_document_review")
    .eq("entity_id", docId)
    .order("created_at", { ascending: false });

  const existingAi = (existingAiList || [])[0] || null;

  if (existingAi) {
    await supabaseAdmin
      .from("ai_review_results")
      .update({
        reviewed_by: auditor.id,
        final_decision: decision,
        reviewed_at: now,
      })
      .eq("id", existingAi.id);
  }

  revalidatePath("/auditor-portal/project-creation");
  revalidatePath(`/auditor-portal/project-creation/${doc.project_id}`);
  return { success: true };
}

/**
 * Updates a single project media file review status (Approve or Reject with reason)
 */
export async function updateProjectMediaDecision({ mediaId, decision, rejectionReason }) {
  const auditor = await getAuthenticatedAuditor();

  const { data: mediaItem, error: mediaErr } = await supabaseAdmin
    .from("project_media")
    .select("id, project_id, url")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaErr) {
    return { success: false, error: mediaErr.message };
  }
  if (!mediaItem) {
    return { success: false, error: "Media file not found." };
  }

  const now = new Date().toISOString();
  const isRejected = decision === "rejected";

  const { error: updateErr } = await supabaseAdmin
    .from("project_media")
    .update(
      isRejected
        ? { review_status: "rejected", reviewed_by: auditor.id, reviewed_at: now, url: null }
        : { review_status: "approved", reviewed_by: auditor.id, reviewed_at: now },
    )
    .eq("id", mediaId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Only remove the stored file once the DB row is safely updated
  if (isRejected && mediaItem.url) {
    await deleteStorageFile("project_media", mediaItem.url);
  }

  await applyOptionalColumns("project_media", mediaId, {
    rejection_reason: isRejected ? rejectionReason || null : null,
  });

  // Update corresponding ai_review_results entry
  const { data: existingAiList } = await supabaseAdmin
    .from("ai_review_results")
    .select("id")
    .eq("entity_type", "project_media_review")
    .eq("entity_id", mediaId)
    .order("created_at", { ascending: false });

  const existingAi = (existingAiList || [])[0] || null;

  if (existingAi) {
    await supabaseAdmin
      .from("ai_review_results")
      .update({
        reviewed_by: auditor.id,
        final_decision: decision,
        reviewed_at: now,
      })
      .eq("id", existingAi.id);
  }

  revalidatePath("/auditor-portal/project-creation");
  revalidatePath(`/auditor-portal/project-creation/${mediaItem.project_id}`);
  return { success: true };
}

/**
 * Sets and confirms/approves a project's assigned minimum investor class (min_eligible_investor_class)
 */
export async function updateProjectMinClassDecision({ projectId, selectedClass }) {
  const auditor = await getAuthenticatedAuditor();
  const classNum = selectedClass !== null && selectedClass !== undefined && selectedClass !== "" ? Number(selectedClass) : null;

  if (classNum !== null && (isNaN(classNum) || classNum < 1 || classNum > 10)) {
    return { success: false, error: "Invalid investor class level. Must be between 1 and 10 or null." };
  }

  // Update projects table
  const { error: projErr } = await supabaseAdmin
    .from("projects")
    .update({
      min_eligible_investor_class: classNum,
    })
    .eq("id", projectId);

  if (projErr) {
    return { success: false, error: projErr.message };
  }

  const now = new Date().toISOString();

  // Upsert / update ai_review_results for project_min_visibility_class_review
  const { data: existingAiList } = await supabaseAdmin
    .from("ai_review_results")
    .select("id")
    .eq("entity_type", "project_min_visibility_class_review")
    .eq("entity_id", projectId)
    .order("created_at", { ascending: false });

  const existingAi = (existingAiList || [])[0] || null;

  if (existingAi) {
    await supabaseAdmin
      .from("ai_review_results")
      .update({
        reviewed_by: auditor.id,
        final_decision: classNum !== null ? String(classNum) : "none",
        reviewed_at: now,
      })
      .eq("id", existingAi.id);
  } else {
    await supabaseAdmin
      .from("ai_review_results")
      .insert([
        {
          entity_type: "project_min_visibility_class_review",
          entity_id: projectId,
          suggested_class: classNum,
          reviewed_by: auditor.id,
          final_decision: classNum !== null ? String(classNum) : "none",
          reviewed_at: now,
        },
      ]);
  }

  revalidatePath(`/auditor-portal/project-creation/${projectId}`);
  return { success: true };
}

/**
 * Updates a single project milestone review status (Approve or Reject with reason)
 */
export async function updateMilestoneDecision({ milestoneId, decision, rejectionReason }) {
  const auditor = await getAuthenticatedAuditor();

  const { data: milestone } = await supabaseAdmin
    .from("project_milestones")
    .select("id, project_id, status")
    .eq("id", milestoneId)
    .single();

  if (!milestone) {
    return { success: false, error: "Milestone not found." };
  }

  const now = new Date().toISOString();

  const updatePayload = {
    verification_status: decision,
  };

  if (decision === "approved") {
    updatePayload.status = "completed";
  }

  const { error: updateErr } = await supabaseAdmin
    .from("project_milestones")
    .update(updatePayload)
    .eq("id", milestoneId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  await applyOptionalColumns("project_milestones", milestoneId, {
    rejection_reason: decision === "rejected" ? rejectionReason || null : null,
  });

  // Also update ai_review_results if present for this milestone
  const { data: existingAiList } = await supabaseAdmin
    .from("ai_review_results")
    .select("id")
    .eq("entity_type", "milestone_review")
    .eq("entity_id", milestoneId)
    .order("created_at", { ascending: false });

  const existingAi = (existingAiList || [])[0] || null;

  if (existingAi) {
    await supabaseAdmin
      .from("ai_review_results")
      .update({
        reviewed_by: auditor.id,
        final_decision: decision,
        reviewed_at: now,
      })
      .eq("id", existingAi.id);
  }

  revalidatePath("/auditor-portal/milestone-review");
  revalidatePath("/auditor-portal/project-creation");
  revalidatePath(`/auditor-portal/project-creation/${milestone.project_id}`);
  return { success: true };
}

/**
 * Finalizes the overall project creation submission (Approve, Send Back, or Reject)
 */
export async function submitProjectFinalDecision({ projectId, decision, reviewNotes }) {
  await getAuthenticatedAuditor();

  let targetStatus = "campaign_live";
  let finalNotes = null;

  if (decision === "approve" || decision === "approved") {
    targetStatus = "campaign_live";
    finalNotes = null;
  } else if (decision === "send_back") {
    targetStatus = "draft";
    finalNotes = reviewNotes || "Additional project information or document corrections required.";
  } else if (decision === "reject") {
    targetStatus = "rejected";
    finalNotes = reviewNotes || "Project creation proposal rejected.";
  } else {
    return { success: false, error: "Invalid decision option." };
  }

  const { error } = await supabaseAdmin
    .from("projects")
    .update({
      status: targetStatus,
    })
    .eq("id", projectId);

  if (error) {
    return { success: false, error: error.message };
  }

  await applyOptionalColumns("projects", projectId, {
    review_notes: finalNotes,
  });

  revalidatePath("/auditor-portal/project-creation");
  revalidatePath("/auditor-portal/milestone-review");
  revalidatePath(`/auditor-portal/project-creation/${projectId}`);
  return { success: true };
}

/**
 * Updates a project's Shariah compliance status and uploads certificate to shariah_compliance_docs storage bucket
 */
export async function updateProjectShariahCompliance(formData) {
  await getAuthenticatedAuditor();

  const projectId = formData.get("projectId");
  const decision = formData.get("decision") || "approved";
  const file = formData.get("certificateFile");

  if (!projectId) {
    return { success: false, error: "Project ID is required." };
  }

  const numId = !isNaN(Number(projectId)) ? Number(projectId) : projectId;

  let publicUrl = null;

  if (decision === "approved") {
    // Upload certificate file if provided
    if (file && typeof file !== "string" && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = file.name || "shariah_certificate.pdf";
      const ext = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "pdf";
      const filePath = `shariah_certificate_${numId}_${crypto.randomUUID()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("shariah_compliance_docs")
        .upload(filePath, buffer, {
          contentType: file.type || "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("[auditor] Shariah certificate storage upload error:", uploadError);
        return { success: false, error: `Failed to upload certificate to storage: ${uploadError.message}` };
      }

      let { data: { publicUrl: url } } = supabaseAdmin.storage
        .from("shariah_compliance_docs")
        .getPublicUrl(filePath);

      if (url && url.includes("/object/public/")) {
        url = url.replace("/object/public/", "/object/authenticated/");
      }

      publicUrl = url;
    } else {
      // Use existing certificate URL if already present
      const { data: existingProj } = await supabaseAdmin
        .from("projects")
        .select("shariah_certificate_doc_url, shariah_compliance_doc_url")
        .eq("id", numId)
        .maybeSingle();

      publicUrl = existingProj?.shariah_certificate_doc_url || existingProj?.shariah_compliance_doc_url || null;

      if (!publicUrl) {
        return {
          success: false,
          error: "Please select and upload a Shariah compliance certificate document before approving.",
        };
      }
    }
  }

  // Update projects table
  const updatePayload = {
    shariah_compliance_status: decision,
  };
  if (publicUrl) {
    updatePayload.shariah_certificate_doc_url = publicUrl;
  }

  const { error: updateError } = await supabaseAdmin
    .from("projects")
    .update(updatePayload)
    .eq("id", numId);

  if (updateError) {
    console.error("[auditor] Error updating project Shariah status:", updateError);
    return { success: false, error: updateError.message };
  }

  // Best-effort write to shariah_compliance_doc_url if column exists
  if (publicUrl) {
    await applyOptionalColumns("projects", numId, {
      shariah_compliance_doc_url: publicUrl,
    });
  }

  revalidatePath("/auditor-portal/project-creation");
  revalidatePath(`/auditor-portal/project-creation/${numId}`);

  const signedDocUrl = publicUrl ? await getSignedUrl("shariah_compliance_docs", publicUrl) : null;

  return {
    success: true,
    shariah_compliance_status: decision,
    shariah_certificate_doc_url: publicUrl,
    signedShariahDocUrl: signedDocUrl,
  };
}

/**
 * Updates a project's cover_image_review_status ('approved' or 'rejected')
 */
export async function updateProjectCoverImageDecision({ projectId, decision }) {
  await getAuthenticatedAuditor();

  const numId = Number(projectId);
  if (!numId || isNaN(numId)) {
    return { success: false, error: "Invalid project ID." };
  }

  if (!["approved", "rejected"].includes(decision)) {
    return { success: false, error: "Invalid decision option." };
  }

  const { error: updateError } = await supabaseAdmin
    .from("projects")
    .update({ cover_image_review_status: decision })
    .eq("id", numId);

  if (updateError) {
    console.error("[auditor] Error updating project cover_image_review_status:", updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath("/auditor-portal/project-creation");
  revalidatePath(`/auditor-portal/project-creation/${numId}`);

  return {
    success: true,
    cover_image_review_status: decision,
  };
}






