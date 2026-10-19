import { supabaseAdmin } from "@/lib/supabase";
import { sendProjectCloseErrorWebhook } from "@/lib/webhook";
import { allocatePledges } from "./allocate.js";
import { allocateConversionPool } from "./conversion.js";
import { computeRefunds } from "./refunds.js";
import { sendCloseNotificationsAndWebhooks } from "./notify.js";

/**
 * Pure pipeline runner combining allocation, conversion pass, and refund computation.
 * Used by both dry-run and live execution, and directly testable with plain objects.
 */
export function runClosingCalculations(project, pendingPledges = []) {
  const allocationResult = allocatePledges(project, pendingPledges);
  const conversionResult = allocateConversionPool(
    project,
    allocationResult.pledges,
    allocationResult.status
  );
  const finalPledges = computeRefunds(conversionResult.pledges, allocationResult.status);

  const projectUpdate = {
    status: allocationResult.status,
    allocated_total: allocationResult.allocated_total,
    subscribed_total_at_close: allocationResult.subscribed_total_at_close,
    failure_reason: allocationResult.failure_reason,
  };

  const totalRefundedAmount = finalPledges.reduce(
    (sum, p) => sum + (Number(p.refunded_amount) || 0),
    0
  );

  const summary = {
    project_id: project.id,
    outcome: allocationResult.outcome,
    status: allocationResult.status,
    failure_reason: allocationResult.failure_reason,
    capacity: allocationResult.capacity,
    subscribed_total_at_close: allocationResult.subscribed_total_at_close,
    allocated_total: allocationResult.allocated_total,
    eligible_pledge_count: allocationResult.eligible.length,
    late_pledge_count: allocationResult.late.length,
    allocated_pledge_count: finalPledges.filter((p) => p.status === "allocated").length,
    rejected_pledge_count: finalPledges.filter(
      (p) => p.status === "rejected_oversubscribed"
    ).length,
    refunded_pledge_count: finalPledges.filter((p) => p.status === "refunded").length,
    total_refunded_amount: Math.round(totalRefundedAmount * 100) / 100,
    conversion_active: conversionResult.conversion_active,
    conversion_pool_total: conversionResult.pool_units_total,
    conversion_pool_allocated: conversionResult.pool_units_allocated,
  };

  return {
    projectOutcome: allocationResult.outcome,
    projectUpdate,
    pledgeResults: finalPledges,
    summary,
  };
}

/**
 * Atomically claims a single overdue campaign_live project or stale closing project (>15m).
 * Never claims a project whose campaign_end_date has not passed.
 */
export async function claimSingleProjectForClosing(projectId) {
  const nowIso = new Date().toISOString();
  const staleCutoffIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  // Read current state first to verify deadline and whether it was just claimed by cron
  const { data: current, error: readErr } = await supabaseAdmin
    .from("projects")
    .select(
      "id, status, allocation_status, campaign_end_date, closed_at, close_attempts, close_notifications_sent_at"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (readErr || !current) {
    return { claimed: false, reason: "not_found", project: null };
  }

  if (current.allocation_status === "complete") {
    return { claimed: false, reason: "already_complete", project: current };
  }

  if (current.status === "campaign_live") {
    if (!current.campaign_end_date || new Date(current.campaign_end_date) > new Date()) {
      return { claimed: false, reason: "not_overdue", project: current };
    }
  } else if (current.status === "closing") {
    const isStale =
      !current.closed_at || new Date(current.closed_at) <= new Date(staleCutoffIso);

    if (!isStale) {
      // Already claimed recently (e.g. by cron milliseconds ago); load full project and proceed
      const { data: fullClosing } = await supabaseAdmin
        .from("projects")
        .select("*, spv_details(*)")
        .eq("id", projectId)
        .maybeSingle();

      return { claimed: true, reason: "already_closing", project: fullClosing };
    }
  } else {
    return { claimed: false, reason: `invalid_status_${current.status}`, project: current };
  }

  // Execute atomic SQL claim via RPC
  const { data: rpcClaimed, error: rpcErr } = await supabaseAdmin.rpc(
    "claim_single_project_for_closing",
    { p_project_id: projectId }
  );

  if (!rpcErr && Array.isArray(rpcClaimed) && rpcClaimed.length > 0) {
    const { data: fullProject } = await supabaseAdmin
      .from("projects")
      .select("*, spv_details(*)")
      .eq("id", projectId)
      .maybeSingle();

    return {
      claimed: true,
      reason:
        current.status === "campaign_live"
          ? "claimed_from_live"
          : "reclaimed_stale_closing",
      project: fullProject,
    };
  }

  // Fallback if RPC is not available
  if (rpcErr) {
    const nextAttempts = (Number(current.close_attempts) || 0) + 1;
    const { data: updated, error: claimErr } = await supabaseAdmin
      .from("projects")
      .update({
        status: "closing",
        closed_at: nowIso,
        close_attempts: nextAttempts,
      })
      .eq("id", projectId)
      .neq("allocation_status", "complete")
      .select("*, spv_details(*)")
      .maybeSingle();

    if (!claimErr && updated) {
      return { claimed: true, reason: "claimed_fallback", project: updated };
    }
  }

  return { claimed: false, reason: "claim_race_lost", project: current };
}

/**
 * Orchestrates the full closing pipeline for a single project.
 *
 * @param {number|string} projectId - Internal integer project ID
 * @param {object} options
 * @param {boolean} [options.dryRun=false] - When true, computes outcome without DB writes or notifications
 */
export async function closeProject(projectId, { dryRun = false } = {}) {
  const numericProjectId = Number(projectId);
  if (!Number.isFinite(numericProjectId) || numericProjectId <= 0) {
    throw new Error(`Invalid projectId: ${projectId}`);
  }

  // 1. Load project with spv_details
  const { data: initialProject, error: loadErr } = await supabaseAdmin
    .from("projects")
    .select("*, spv_details(*)")
    .eq("id", numericProjectId)
    .maybeSingle();

  if (loadErr || !initialProject) {
    throw new Error(`Project ${numericProjectId} not found`);
  }

  // ---------------------------------------------------------------------------
  // DRY RUN MODE: no writes, no status change, no notifications
  // ---------------------------------------------------------------------------
  if (dryRun) {
    if (!["campaign_live", "closing"].includes(initialProject.status)) {
      return {
        ok: false,
        dryRun: true,
        project_id: numericProjectId,
        status: initialProject.status,
        error: `Dry run requires project status 'campaign_live' or 'closing' (current: '${initialProject.status}').`,
      };
    }

    const { data: pendingPledges, error: pledgesErr } = await supabaseAdmin
      .from("pledges")
      .select("*")
      .eq("project_id", numericProjectId)
      .eq("status", "pending");

    if (pledgesErr) {
      throw new Error(`Failed to load pending pledges for dry run: ${pledgesErr.message}`);
    }

    const calc = runClosingCalculations(initialProject, pendingPledges || []);

    return {
      ok: true,
      dryRun: true,
      project_id: numericProjectId,
      outcome: calc.projectOutcome,
      project: calc.projectUpdate,
      results: calc.pledgeResults,
      summary: calc.summary,
    };
  }

  // ---------------------------------------------------------------------------
  // LIVE MODE
  // ---------------------------------------------------------------------------
  // Check if allocation is already complete
  if (initialProject.allocation_status === "complete") {
    // If notifications were missed on an earlier run where the transaction committed,
    // send them now if close_notifications_sent_at is still null; otherwise pure no-op.
    if (!initialProject.close_notifications_sent_at) {
      try {
        const { data: closedPledges } = await supabaseAdmin
          .from("pledges")
          .select("*")
          .eq("project_id", numericProjectId)
          .in("status", ["allocated", "rejected_oversubscribed", "refunded"]);

        const withFeeFlag = computeRefunds(closedPledges || [], initialProject.status);
        await sendCloseNotificationsAndWebhooks({
          project: initialProject,
          pledgeResults: withFeeFlag,
          projectOutcome: initialProject.status === "funded" ? "funded" : "failed",
          allocatedTotal: Number(initialProject.allocated_total) || 0,
          subscribedTotalAtClose: Number(initialProject.subscribed_total_at_close) || 0,
          failureReason: initialProject.failure_reason || null,
        });
      } catch (notifRetryErr) {
        console.error(
          `[closeProject] Notification retry error on completed project ${numericProjectId}:`,
          notifRetryErr
        );
      }
    }

    return {
      ok: true,
      noop: true,
      already_complete: true,
      project_id: numericProjectId,
      status: initialProject.status,
      allocation_status: initialProject.allocation_status,
    };
  }

  // Claim project if campaign_live & overdue, or verify it is in 'closing'
  const claimResult = await claimSingleProjectForClosing(numericProjectId);
  if (!claimResult.claimed) {
    if (claimResult.reason === "already_complete") {
      return {
        ok: true,
        noop: true,
        already_complete: true,
        project_id: numericProjectId,
        status: claimResult.project?.status,
        allocation_status: "complete",
      };
    }

    return {
      ok: false,
      skipped: true,
      reason: claimResult.reason,
      project_id: numericProjectId,
      status: claimResult.project?.status,
    };
  }

  const project = claimResult.project;
  const startedAt = new Date().toISOString();

  try {
    // Mark allocation_status = 'running'
    await supabaseAdmin
      .from("projects")
      .update({ allocation_status: "running" })
      .eq("id", numericProjectId)
      .neq("allocation_status", "complete");

    // 1. Load pending pledges
    const { data: pendingPledges, error: pledgesErr } = await supabaseAdmin
      .from("pledges")
      .select("*")
      .eq("project_id", numericProjectId)
      .eq("status", "pending");

    if (pledgesErr) {
      throw new Error(`Failed to fetch pending pledges: ${pledgesErr.message}`);
    }

    // 2-6. Run pure calculation pipeline (sort, allocate, soft cap, conversion pass, refunds)
    const calc = runClosingCalculations(project, pendingPledges || []);

    // 7. Apply everything atomically in one transaction via apply_project_close RPC
    const { data: rpcSummary, error: rpcErr } = await supabaseAdmin.rpc(
      "apply_project_close",
      {
        p_project_id: numericProjectId,
        p_results: calc.pledgeResults,
        p_project: calc.projectUpdate,
      }
    );

    if (rpcErr) {
      throw new Error(`apply_project_close RPC failed: ${rpcErr.message}`);
    }

    if (rpcSummary?.already_complete) {
      return {
        ok: true,
        noop: true,
        already_complete: true,
        project_id: numericProjectId,
        rpc_summary: rpcSummary,
      };
    }

    // 8. After transaction commits: notify & send Make webhook (never undo money on notification failure)
    let notificationSummary = null;
    let notificationError = null;
    try {
      notificationSummary = await sendCloseNotificationsAndWebhooks({
        project,
        pledgeResults: calc.pledgeResults,
        projectOutcome: calc.projectOutcome,
        allocatedTotal: calc.projectUpdate.allocated_total,
        subscribedTotalAtClose: calc.projectUpdate.subscribed_total_at_close,
        failureReason: calc.projectUpdate.failure_reason,
      });
    } catch (notifErr) {
      notificationError = notifErr?.message || String(notifErr);
      console.error(
        `[closeProject] Post-commit notification error for project ${numericProjectId}:`,
        notifErr
      );
    }

    // Write project_close_log with outcome 'funded' or 'failed'
    const finishedAt = new Date().toISOString();
    const combinedSummary = {
      ...calc.summary,
      rpc_summary: rpcSummary,
      notifications: notificationSummary,
      notification_error: notificationError,
    };

    await supabaseAdmin.from("project_close_log").insert({
      project_id: numericProjectId,
      started_at: startedAt,
      finished_at: finishedAt,
      outcome: calc.projectOutcome,
      error: notificationError,
      summary: combinedSummary,
    });

    return {
      ok: true,
      dryRun: false,
      project_id: numericProjectId,
      outcome: calc.projectOutcome,
      project: calc.projectUpdate,
      results: calc.pledgeResults,
      summary: combinedSummary,
    };
  } catch (err) {
    const errorMessage = err?.message || String(err);
    const finishedAt = new Date().toISOString();

    console.error(`[closeProject] Error closing project ${numericProjectId}:`, err);

    // Leave project in 'closing' and reset allocation_status to 'pending' so retry can pick it up
    await supabaseAdmin
      .from("projects")
      .update({ status: "closing", allocation_status: "pending" })
      .eq("id", numericProjectId)
      .neq("allocation_status", "complete");

    // Log outcome = 'error' to project_close_log
    await supabaseAdmin.from("project_close_log").insert({
      project_id: numericProjectId,
      started_at: startedAt,
      finished_at: finishedAt,
      outcome: "error",
      error: errorMessage,
      summary: {
        project_id: numericProjectId,
        close_attempts: project.close_attempts,
      },
    });

    // If close_attempts >= 2, send alert via Make webhook convention (or log if env var not set)
    const attempts = Number(project.close_attempts) || 1;
    if (attempts >= 2) {
      await sendProjectCloseErrorWebhook({
        type: "project_close_error",
        project_id: numericProjectId,
        project_title: project.title,
        close_attempts: attempts,
        error: errorMessage,
        timestamp: finishedAt,
      });
    }

    throw err;
  }
}
