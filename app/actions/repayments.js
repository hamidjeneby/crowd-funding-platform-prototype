"use server";

/**
 * FILE: app/actions/repayments.js
 * PURPOSE:
 *   Server actions for the Repayment Simulation Engine:
 *     - reportPeriod (Mudarabah profit / Ijara third-party sale proceeds)
 *     - declareDividend (SPV Equity)
 *     - recordExit (SPV Equity)
 *     - payPeriod (executes simulation payment via apply_payout_period RPC)
 *     - getProjectRepaymentPeriods (issuer portal data loader)
 *     - previewPeriodPayout (server-side pre-confirmation calculation)
 */

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { decrypt } from "@/app/utils/crypto";
import {
  round2,
  mudarabahPayout,
  equityPayout,
  ijaraThirdPartyPayout,
} from "@/lib/repayments/calc";

/**
 * Helper to get internal issuer ID by Clerk orgId.
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
 * Validates issuer ownership and active status for a project.
 */
async function verifyIssuerProjectOwnership(projectId) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  const issuer = await getIssuerByOrgId(orgId);

  const { data: project, error: pErr } = await supabaseAdmin
    .from("projects")
    .select("*, spv_details(*)")
    .eq("id", projectId)
    .maybeSingle();

  if (pErr || !project) {
    throw new Error(`Project ${projectId} not found.`);
  }

  if (project.issuer_id !== issuer.id) {
    throw new Error("Access denied: You do not own this project.");
  }

  return { userId, issuer, project };
}

/**
 * Server action: Fetches all payout periods and repayment summary for the issuer management page.
 * Strictly returns aggregates only — no per-investor data.
 */
export async function getProjectRepaymentPeriods(projectId) {
  try {
    const { project } = await verifyIssuerProjectOwnership(projectId);

    const { data: periods, error: perErr } = await supabaseAdmin
      .from("payout_periods")
      .select("*")
      .eq("project_id", project.id)
      .order("period_no", { ascending: true });

    if (perErr) {
      throw perErr;
    }

    // Read repayment aggregates per period without exposing individual investor rows
    const { data: repayments, error: repErr } = await supabaseAdmin
      .from("repayments")
      .select("payout_period_id, amount, status")
      .in(
        "payout_period_id",
        (periods || []).map((p) => p.id)
      );

    if (repErr) {
      throw repErr;
    }

    // Build period aggregates
    const repaymentsByPeriod = new Map();
    for (const r of repayments || []) {
      if (!repaymentsByPeriod.has(r.payout_period_id)) {
        repaymentsByPeriod.set(r.payout_period_id, {
          paidCount: 0,
          failedCount: 0,
          scheduledCount: 0,
          totalPaid: 0,
          totalScheduled: 0,
        });
      }
      const agg = repaymentsByPeriod.get(r.payout_period_id);
      const amt = Number(r.amount) || 0;
      if (r.status === "paid") {
        agg.paidCount += 1;
        agg.totalPaid = round2(agg.totalPaid + amt);
      } else if (r.status === "failed") {
        agg.failedCount += 1;
      } else {
        agg.scheduledCount += 1;
        agg.totalScheduled = round2(agg.totalScheduled + amt);
      }
    }

    const periodsWithAggs = (periods || []).map((p) => {
      const agg = repaymentsByPeriod.get(p.id) || {
        paidCount: 0,
        failedCount: 0,
        scheduledCount: 0,
        totalPaid: 0,
        totalScheduled: 0,
      };

      return {
        id: p.id,
        period_no: p.period_no,
        kind: p.kind,
        due_date: p.due_date,
        status: p.status,
        is_final: p.is_final,
        reported_amount: p.reported_amount != null ? Number(p.reported_amount) : null,
        capital_return_percent: p.capital_return_percent != null ? Number(p.capital_return_percent) : null,
        notes: p.notes,
        total_paid: p.total_paid != null ? Number(p.total_paid) : agg.totalPaid,
        total_scheduled: agg.totalScheduled,
        paid_at: p.paid_at,
        paid_count: agg.paidCount,
        failed_count: agg.failedCount,
        scheduled_count: agg.scheduledCount,
      };
    });

    return {
      success: true,
      project_status: project.status,
      sharia_contract_type: project.sharia_contract_type,
      currency: project.currency || "AED",
      funds_released_at: project.funds_released_at,
      periods: periodsWithAggs,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Previews a period payout before the issuer confirms payment.
 * Returns aggregate numbers only (total amount, recipient count, failure count).
 */
export async function previewPeriodPayout(periodId) {
  try {
    const { data: period, error: perErr } = await supabaseAdmin
      .from("payout_periods")
      .select("*, projects(*)")
      .eq("id", periodId)
      .maybeSingle();

    if (perErr || !period) {
      throw new Error(`Period ${periodId} not found.`);
    }

    await verifyIssuerProjectOwnership(period.project_id);

    // Compute candidate lines
    const { candidateRows } = await preparePeriodPaymentRows(period);

    const paidRows = candidateRows.filter((r) => r.status === "paid");
    const failedRows = candidateRows.filter((r) => r.status === "failed");
    const totalAmount = round2(paidRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0));
    const uniqueInvestorCount = new Set(paidRows.map((r) => r.investor_id)).size;
    const failedInvestorCount = new Set(failedRows.map((r) => r.investor_id)).size;

    return {
      success: true,
      period_no: period.period_no,
      kind: period.kind,
      total_amount: totalAmount,
      investor_count: uniqueInvestorCount,
      failed_count: failedInvestorCount,
      is_final: period.is_final,
      currency: period.projects?.currency || "AED",
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Helper to compute candidate rows and verify investor bank accounts server-side.
 */
async function preparePeriodPaymentRows(period) {
  const project = period.projects;
  const contractType = project.sharia_contract_type;

  // 1. Fetch active holdings with investor bank details
  const { data: holdings, error: hErr } = await supabaseAdmin
    .from("pledges")
    .select("id, investor_id, allocated_amount, allocated_units, status, investors(id, bank_details)")
    .eq("project_id", project.id)
    .in("status", ["allocated", "active", "completed"]);

  if (hErr) {
    throw new Error(`Failed to load project holdings: ${hErr.message}`);
  }

  // 2. Load existing repayments for this period to avoid double-processing already paid rows
  const { data: existingRepayments, error: rErr } = await supabaseAdmin
    .from("repayments")
    .select("*")
    .eq("payout_period_id", period.id);

  if (rErr) {
    throw new Error(`Failed to load existing repayments: ${rErr.message}`);
  }

  const paidKeys = new Set(
    (existingRepayments || [])
      .filter((r) => r.status === "paid")
      .map((r) => `${r.pledge_id}:${r.type}`)
  );

  // 3. Determine payout line items based on contract type
  let rawLineItems = [];

  if (contractType === "murabaha" || contractType === "ijara") {
    // For fixed schedules, read the pre-generated scheduled rows from DB
    rawLineItems = (existingRepayments || []).map((r) => ({
      pledge_id: r.pledge_id,
      investor_id: r.investor_id,
      type: r.type,
      amount: Number(r.amount) || 0,
    }));

    // If Ijara third-party final period, sale_proceeds is dynamically computed from reported_amount
    if (contractType === "ijara" && period.is_final) {
      let terms = project.contract_terms;
      if (typeof terms === "string") {
        try { terms = JSON.parse(terms); } catch {}
      }
      if (terms?.end_of_term === "sale_to_third_party") {
        const thirdPartyProceeds = ijaraThirdPartyPayout(period, holdings || []);
        // Replace or add sale_proceeds lines
        rawLineItems = rawLineItems.filter((r) => r.type !== "sale_proceeds").concat(thirdPartyProceeds);
      }
    }
  } else if (contractType === "mudarabah") {
    rawLineItems = mudarabahPayout(period, holdings || [], project);
  } else if (contractType === "spv_equity") {
    rawLineItems = equityPayout(period, holdings || []);
  }

  // Map holdings and investors for bank account inspection
  const investorMap = new Map();
  for (const h of holdings || []) {
    if (h.investors) {
      investorMap.set(h.investor_id, h.investors);
    }
  }

  // 4. Construct candidate rows, decrypting bank accounts server-side
  const candidateRows = [];

  for (const item of rawLineItems) {
    const key = `${item.pledge_id}:${item.type}`;
    if (paidKeys.has(key)) {
      // Already paid row from a previous partial run — skip
      continue;
    }

    const inv = investorMap.get(item.investor_id);
    let bankRaw = inv?.bank_details;
    if (typeof bankRaw === "string") {
      try {
        bankRaw = JSON.parse(bankRaw);
      } catch {}
    }

    let bankLast4 = null;
    const encryptedIban = bankRaw?.iban;
    const accountNumber = bankRaw?.account_number;

    if (encryptedIban) {
      const decrypted = decrypt(encryptedIban);
      if (decrypted && decrypted.length >= 4) {
        bankLast4 = decrypted.slice(-4);
      }
    } else if (accountNumber && String(accountNumber).length >= 4) {
      bankLast4 = String(accountNumber).slice(-4);
    }

    if (!bankLast4) {
      candidateRows.push({
        pledge_id: item.pledge_id,
        investor_id: item.investor_id,
        type: item.type,
        amount: item.amount,
        status: "failed",
        failure_reason: "No bank account on file",
        bank_last4: null,
        payment_reference: null,
      });
    } else {
      const refCode = `SIM-${String(period.id).padStart(4, "0")}-${String(item.pledge_id).padStart(4, "0")}-${String(item.type).slice(0, 3).toUpperCase()}`;
      candidateRows.push({
        pledge_id: item.pledge_id,
        investor_id: item.investor_id,
        type: item.type,
        amount: item.amount,
        status: "paid",
        failure_reason: null,
        bank_last4: bankLast4,
        payment_reference: refCode,
      });
    }
  }

  return { candidateRows, holdings };
}

/**
 * Server action: Reports profit / sale proceeds for a due period.
 */
export async function reportPeriod(periodId, amount, notes = "", capitalReturnPercent = null) {
  try {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return { success: false, error: "Reported amount must be a number greater than or equal to 0." };
    }

    const { data: period, error: perErr } = await supabaseAdmin
      .from("payout_periods")
      .select("*, projects(*)")
      .eq("id", periodId)
      .maybeSingle();

    if (perErr || !period) {
      return { success: false, error: `Period ${periodId} not found.` };
    }

    const { userId, project } = await verifyIssuerProjectOwnership(period.project_id);

    if (project.status !== "active") {
      return { success: false, error: `Cannot report period: project status is '${project.status}' (must be 'active').` };
    }

    if (period.status === "paid") {
      return { success: false, error: "Period is already paid and cannot be edited." };
    }

    if (period.status === "reported") {
      return { success: false, error: "Period has already been reported." };
    }

    // Preconditions: period must be due (due_date <= now), all earlier periods paid
    if (period.due_date && new Date(period.due_date) > new Date()) {
      return { success: false, error: "Period is not due yet." };
    }

    // Check contract type permissions
    const contractType = project.sharia_contract_type;
    let terms = project.contract_terms;
    if (typeof terms === "string") {
      try {
        terms = JSON.parse(terms);
      } catch {}
    }
    const isMudarabah = contractType === "mudarabah";
    const isIjaraThirdParty =
      contractType === "ijara" && period.is_final && terms?.end_of_term === "sale_to_third_party";

    if (!isMudarabah && !isIjaraThirdParty) {
      return {
        success: false,
        error: "Reporting is only allowed for Mudarabah periods or Ijara final periods with sale to third party.",
      };
    }

    const { data: earlierPeriods } = await supabaseAdmin
      .from("payout_periods")
      .select("id, period_no, status, reported_amount, total_paid")
      .eq("project_id", project.id)
      .lt("period_no", period.period_no);

    const unpaidEarlier = (earlierPeriods || []).find((p) => p.status !== "paid");
    if (unpaidEarlier) {
      return {
        success: false,
        error: `Period #${unpaidEarlier.period_no} must be paid before Period #${period.period_no} can be reported.`,
      };
    }

    // Capital return validation on final period (Mudarabah)
    let finalCapReturn = null;
    if (period.is_final && isMudarabah) {
      finalCapReturn = capitalReturnPercent != null ? Number(capitalReturnPercent) : 100;
      if (isNaN(finalCapReturn) || finalCapReturn < 0 || finalCapReturn > 100) {
        return { success: false, error: "Capital return percentage must be between 0 and 100." };
      }

      // Check if all earlier periods reported profits (> 0)
      const allEarlierProfitable =
        (earlierPeriods || []).length > 0 &&
        (earlierPeriods || []).every((p) => {
          const amt = Number(p.reported_amount ?? p.total_paid ?? 0);
          return amt > 0;
        });

      if (allEarlierProfitable && numericAmount > 0 && finalCapReturn !== 100) {
        return {
          success: false,
          error: "Capital return percentage must be 100% when profits (> 0) are reported and all previous quarters were profitable. Set profit to 0 to declare a capital loss.",
        };
      }
    }

    const nowIso = new Date().toISOString();
    const { error: upErr } = await supabaseAdmin
      .from("payout_periods")
      .update({
        reported_amount: numericAmount,
        notes: notes ? String(notes).trim() : null,
        capital_return_percent: finalCapReturn,
        reported_at: nowIso,
        reported_by: userId,
        status: "reported",
      })
      .eq("id", period.id);

    if (upErr) {
      return { success: false, error: `Failed to save profit report: ${upErr.message}` };
    }

    revalidatePath(`/issuer-portal/projects/${project.slug || project.id}/manage`);
    return { success: true, reported_amount: numericAmount, period_no: period.period_no };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Declares an SPV Equity dividend.
 * Creates the next period (kind 'dividend', reported, due now).
 */
export async function declareDividend(projectId, totalAmount, notes = "") {
  try {
    const numericAmount = Number(totalAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { success: false, error: "Dividend amount must be greater than 0." };
    }

    const { userId, project } = await verifyIssuerProjectOwnership(projectId);

    if (project.status !== "active") {
      return { success: false, error: `Cannot declare dividend: project status is '${project.status}'.` };
    }

    // Check earlier periods are paid
    const { data: existingPeriods } = await supabaseAdmin
      .from("payout_periods")
      .select("period_no, status, is_final")
      .eq("project_id", project.id)
      .order("period_no", { ascending: true });

    if ((existingPeriods || []).some((p) => p.is_final && p.status === "paid")) {
      return { success: false, error: "Cannot declare dividend: project exit has already occurred." };
    }

    const unpaidEarlier = (existingPeriods || []).find((p) => p.status !== "paid");
    if (unpaidEarlier) {
      return {
        success: false,
        error: `Period #${unpaidEarlier.period_no} must be paid before declaring a new dividend.`,
      };
    }

    const maxPeriodNo = (existingPeriods || []).reduce((max, p) => Math.max(max, p.period_no), 0);
    const nextPeriodNo = maxPeriodNo + 1;
    const nowIso = new Date().toISOString();

    const { data: newPeriod, error: insErr } = await supabaseAdmin
      .from("payout_periods")
      .insert({
        project_id: project.id,
        period_no: nextPeriodNo,
        kind: "dividend",
        due_date: nowIso,
        status: "reported",
        is_final: false,
        reported_amount: numericAmount,
        notes: notes ? String(notes).trim() : null,
        reported_at: nowIso,
        reported_by: userId,
      })
      .select()
      .single();

    if (insErr) {
      return { success: false, error: `Failed to create dividend period: ${insErr.message}` };
    }

    revalidatePath(`/issuer-portal/projects/${project.slug || project.id}/manage`);
    return { success: true, period: newPeriod };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Records an SPV Equity exit event.
 * Creates the final period (kind 'exit', is_final, reported, due now).
 */
export async function recordExit(projectId, proceeds, notes = "") {
  try {
    const numericProceeds = Number(proceeds);
    if (!Number.isFinite(numericProceeds) || numericProceeds <= 0) {
      return { success: false, error: "Exit proceeds must be greater than 0." };
    }

    const { userId, project } = await verifyIssuerProjectOwnership(projectId);

    if (project.status !== "active") {
      return { success: false, error: `Cannot record exit: project status is '${project.status}'.` };
    }

    const { data: existingPeriods } = await supabaseAdmin
      .from("payout_periods")
      .select("period_no, status, is_final")
      .eq("project_id", project.id)
      .order("period_no", { ascending: true });

    if ((existingPeriods || []).some((p) => p.is_final)) {
      return { success: false, error: "An exit period has already been created for this project." };
    }

    const unpaidEarlier = (existingPeriods || []).find((p) => p.status !== "paid");
    if (unpaidEarlier) {
      return {
        success: false,
        error: `Period #${unpaidEarlier.period_no} must be paid before recording exit.`,
      };
    }

    const maxPeriodNo = (existingPeriods || []).reduce((max, p) => Math.max(max, p.period_no), 0);
    const nextPeriodNo = maxPeriodNo + 1;
    const nowIso = new Date().toISOString();

    const { data: newPeriod, error: insErr } = await supabaseAdmin
      .from("payout_periods")
      .insert({
        project_id: project.id,
        period_no: nextPeriodNo,
        kind: "exit",
        due_date: nowIso,
        status: "reported",
        is_final: true,
        reported_amount: numericProceeds,
        notes: notes ? String(notes).trim() : null,
        reported_at: nowIso,
        reported_by: userId,
      })
      .select()
      .single();

    if (insErr) {
      return { success: false, error: `Failed to create exit period: ${insErr.message}` };
    }

    revalidatePath(`/issuer-portal/projects/${project.slug || project.id}/manage`);
    return { success: true, period: newPeriod };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Executes payment for a payout period.
 * Builds payment rows, checks bank accounts, calls apply_payout_period RPC,
 * and sends investor notifications.
 */
export async function payPeriod(periodId) {
  try {
    const { data: period, error: perErr } = await supabaseAdmin
      .from("payout_periods")
      .select("*, projects(*)")
      .eq("id", periodId)
      .maybeSingle();

    if (perErr || !period) {
      return { success: false, error: `Period ${periodId} not found.` };
    }

    const { project } = await verifyIssuerProjectOwnership(period.project_id);

    if (project.status !== "active" && project.status !== "completed") {
      return { success: false, error: `Cannot pay period: project status is '${project.status}'.` };
    }

    // Idempotency check: if period is already paid, return safely
    if (period.status === "paid") {
      return {
        success: true,
        already_paid: true,
        period_id: period.id,
        period_no: period.period_no,
        message: "This period has already been paid.",
      };
    }

    // Check earlier periods
    const { data: earlierPeriods } = await supabaseAdmin
      .from("payout_periods")
      .select("id, period_no, status")
      .eq("project_id", project.id)
      .lt("period_no", period.period_no);

    const unpaidEarlier = (earlierPeriods || []).find((p) => p.status !== "paid");
    if (unpaidEarlier) {
      return {
        success: false,
        error: `Period #${unpaidEarlier.period_no} must be paid before Period #${period.period_no} can be paid.`,
      };
    }

    // Check due date & reported status
    const reportRequiredKinds = ["profit_share", "dividend", "exit"];
    const isReportRequired =
      reportRequiredKinds.includes(period.kind) ||
      (project.sharia_contract_type === "ijara" && period.is_final);

    if (isReportRequired) {
      if (period.status !== "reported") {
        return { success: false, error: "This period must be reported before payment can be executed." };
      }
    } else {
      if (period.due_date && new Date(period.due_date) > new Date()) {
        return { success: false, error: "This period is not due yet." };
      }
    }

    // 1. Prepare payment rows (with decrypted bank last4 and failure reasons)
    const { candidateRows } = await preparePeriodPaymentRows(period);

    // 2. Call apply_payout_period RPC
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("apply_payout_period", {
      p_period_id: period.id,
      p_rows: candidateRows,
    });

    if (rpcErr) {
      return { success: false, error: `apply_payout_period failed: ${rpcErr.message}` };
    }

    // 3. Post-transaction: Send bulk notifications to paid investors (never block response)
    const paidCandidates = candidateRows.filter((r) => r.status === "paid");
    if (paidCandidates.length > 0) {
      try {
        const currency = project.currency || "AED";
        const notifPayload = paidCandidates.map((r) => ({
          investor_id: r.investor_id,
          project_id: project.id,
          type: "repayment",
          title: `Payment received: ${project.title}`,
          message: `Payment received: ${currency} ${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for "${project.title}".`,
          read_status: false,
        }));

        await supabaseAdmin.from("notifications").insert(notifPayload);
      } catch (notifErr) {
        console.error("[payPeriod] Post-payment notification dispatch error:", notifErr);
      }
    }

    revalidatePath(`/issuer-portal/projects/${project.slug || project.id}/manage`);
    revalidatePath("/investor-portal/portfolio");
    revalidatePath("/investor-portal/investments");

    const failedCount = Number(rpcRes.failed_count) || 0;
    const paidCount = Number(rpcRes.paid_count) || 0;
    const totalPaid = Number(rpcRes.total_paid) || 0;

    let message = `Successfully paid ${project.currency || "AED"} ${totalPaid.toLocaleString()} to ${paidCount} investor positions.`;
    if (failedCount > 0) {
      message += ` ${failedCount} investors could not be paid (no bank account on file), retry later.`;
    }

    return {
      success: true,
      already_paid: Boolean(rpcRes.already_paid),
      period_id: period.id,
      period_no: period.period_no,
      period_status: rpcRes.period_status,
      paid_count: paidCount,
      failed_count: failedCount,
      total_paid: totalPaid,
      final: Boolean(rpcRes.final),
      message,
      simulated_notice: "Simulated payment, no money moves",
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
