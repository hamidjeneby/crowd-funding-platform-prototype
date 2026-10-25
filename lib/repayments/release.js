/**
 * FILE: lib/repayments/release.js
 * PURPOSE:
 *   Fund release workflow for campaign-funded projects.
 *   Transitioning projects and holdings from 'funded'/'allocated' to 'active'.
 *   Populates initial payout_periods and scheduled repayments according to contract type.
 */

import { supabaseAdmin, getSupabaseAdmin } from "../supabase.js";
import { addMonths, monthsPerPeriod, buildSchedule } from "./calc.js";

function resolveContractTerms(project) {
  if (!project?.contract_terms) return {};
  if (typeof project.contract_terms === "string") {
    try {
      return JSON.parse(project.contract_terms);
    } catch {
      return {};
    }
  }
  return project.contract_terms;
}

/**
 * Releases funds to issuer for a funded project, generates initial schedules,
 * and activates project & pledges.
 *
 * @param {number|string} projectId - Internal integer project ID
 * @returns {Promise<object>} Outcome summary
 */
export async function releaseFunds(projectId) {
  const numericProjectId = Number(projectId);
  if (!Number.isFinite(numericProjectId) || numericProjectId <= 0) {
    throw new Error(`Invalid projectId: ${projectId}`);
  }

  const client = (typeof getSupabaseAdmin === "function" ? getSupabaseAdmin() : null) || supabaseAdmin;
  if (!client) {
    throw new Error("Supabase admin client is not initialized. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set.");
  }

  // 1. Fetch project with spv_details
  const { data: project, error: pErr } = await client
    .from("projects")
    .select("*, spv_details(*)")
    .eq("id", numericProjectId)
    .maybeSingle();

  if (pErr || !project) {
    throw new Error(`Project ${numericProjectId} not found: ${pErr?.message || ""}`);
  }

  // Idempotency: already released
  if (project.funds_released_at && project.status === "active") {
    return {
      success: true,
      already_released: true,
      project_id: numericProjectId,
      status: project.status,
      funds_released_at: project.funds_released_at,
    };
  }

  // Require status 'funded' and funds_released_at null
  if (project.status !== "funded") {
    throw new Error(
      `Cannot release funds for project ${numericProjectId}: status must be 'funded' (current: '${project.status}').`
    );
  }

  if (project.funds_released_at) {
    throw new Error(
      `Cannot release funds for project ${numericProjectId}: funds_released_at is already set.`
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const contractType = project.sharia_contract_type;
  const terms = resolveContractTerms(project);
  const tenorMonths = Number(project.tenor_months || project.tenure_months || terms?.tenor_months || 12);

  // 2. Fetch allocated pledges for the project
  const { data: pledges, error: plErr } = await client
    .from("pledges")
    .select("*")
    .eq("project_id", numericProjectId)
    .eq("status", "allocated");

  if (plErr) {
    throw new Error(`Failed to load allocated pledges: ${plErr.message}`);
  }

  const holdings = pledges || [];

  // Delete any partial or existing payout_periods for this project (clean slate for release)
  const { error: delErr } = await client
    .from("payout_periods")
    .delete()
    .eq("project_id", numericProjectId);

  if (delErr) {
    throw new Error(`Failed to clear partial payout_periods: ${delErr.message}`);
  }

  let createdPeriods = [];
  let createdRepaymentsCount = 0;

  // Build schedules by contract type
  if (contractType === "murabaha" || contractType === "ijara") {
    const { periods: schedPeriods, repayments: schedRepayments } = buildSchedule(
      project,
      holdings,
      nowIso
    );

    // Insert payout_periods
    const periodInsertPayload = schedPeriods.map((p) => ({
      project_id: numericProjectId,
      period_no: p.period_no,
      kind: p.kind,
      due_date: p.due_date,
      status: "scheduled",
      is_final: p.is_final,
    }));

    const { data: insertedPeriods, error: pInsErr } = await client
      .from("payout_periods")
      .insert(periodInsertPayload)
      .select("id, period_no");

    if (pInsErr || !insertedPeriods) {
      throw new Error(`Failed to insert payout_periods: ${pInsErr?.message || ""}`);
    }

    createdPeriods = insertedPeriods;
    const periodIdMap = new Map(insertedPeriods.map((ip) => [ip.period_no, ip.id]));

    // Insert repayments
    if (schedRepayments.length > 0) {
      const repaymentPayload = schedRepayments.map((r) => ({
        payout_period_id: periodIdMap.get(r.period_no),
        pledge_id: r.pledge_id,
        investor_id: r.investor_id,
        type: r.type,
        amount: r.amount,
        status: "scheduled",
      }));

      const { error: rInsErr } = await client
        .from("repayments")
        .insert(repaymentPayload);

      if (rInsErr) {
        throw new Error(`Failed to insert scheduled repayments: ${rInsErr.message}`);
      }

      createdRepaymentsCount = repaymentPayload.length;
    }
  } else if (contractType === "mudarabah") {
    // Mudarabah: one period per profit_reporting_frequency across term
    const frequency = terms?.profit_reporting_frequency || "quarterly";
    const mPerPeriod = monthsPerPeriod(frequency, tenorMonths);
    const numPeriods = Math.max(1, Math.floor(tenorMonths / mPerPeriod));

    const periodPayload = [];
    for (let k = 1; k <= numPeriods; k++) {
      const isFinal = k === numPeriods;
      const dueDate = addMonths(nowIso, k * mPerPeriod).toISOString();

      periodPayload.push({
        project_id: numericProjectId,
        period_no: k,
        kind: "profit_share",
        due_date: dueDate,
        status: "scheduled",
        is_final: isFinal,
        capital_return_percent: null,
      });
    }

    const { data: insertedPeriods, error: mInsErr } = await client
      .from("payout_periods")
      .insert(periodPayload)
      .select("id, period_no");

    if (mInsErr || !insertedPeriods) {
      throw new Error(`Failed to insert mudarabah payout_periods: ${mInsErr?.message || ""}`);
    }

    createdPeriods = insertedPeriods;
  } else if (contractType === "spv_equity") {
    // Equity: no periods created yet (created on declareDividend or recordExit)
    createdPeriods = [];
  }

  // 3. Last: Commit project status and activate pledges
  const maturityDateStr =
    contractType === "spv_equity"
      ? null
      : addMonths(nowIso, tenorMonths).toISOString().split("T")[0];

  const { error: projUpErr } = await client
    .from("projects")
    .update({
      funds_released_at: nowIso,
      maturity_date: maturityDateStr,
      status: "active",
    })
    .eq("id", numericProjectId)
    .eq("status", "funded");

  if (projUpErr) {
    throw new Error(`Failed to update project status to 'active': ${projUpErr.message}`);
  }

  if (holdings.length > 0) {
    const { error: plUpErr } = await client
      .from("pledges")
      .update({ status: "active" })
      .eq("project_id", numericProjectId)
      .eq("status", "allocated");

    if (plUpErr) {
      throw new Error(`Failed to transition pledges to 'active': ${plUpErr.message}`);
    }
  }

  return {
    success: true,
    project_id: numericProjectId,
    status: "active",
    funds_released_at: nowIso,
    maturity_date: maturityDateStr,
    periods_count: createdPeriods.length,
    repayments_count: createdRepaymentsCount,
    holdings_activated: holdings.length,
  };
}
