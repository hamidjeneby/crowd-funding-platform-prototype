#!/usr/bin/env node

/**
 * FILE: scripts/simulation/status.js
 * USAGE:
 *   ALLOW_SIM=true node --env-file=.env.local scripts/simulation/status.js --project=12 [--yes]
 */

import { guardSimulation, getProjectIdArg } from "./helper.js";
import { supabaseAdmin, getSupabaseAdmin } from "../../lib/supabase.js";

async function main() {
  const projectId = getProjectIdArg();
  if (!projectId) {
    console.error("Error: Missing --project=ID parameter.");
    console.error("Usage: ALLOW_SIM=true node scripts/simulation/status.js --project=<ID>");
    process.exit(1);
  }

  await guardSimulation(`status inspection for Project ${projectId}`);

  const client = getSupabaseAdmin() || supabaseAdmin;

  // Fetch project
  const { data: project, error: pErr } = await client
    .from("projects")
    .select("id, title, status, sharia_contract_type, currency, funds_released_at, maturity_date")
    .eq("id", projectId)
    .maybeSingle();

  if (pErr || !project) {
    console.error("Project not found:", pErr?.message || "");
    process.exit(1);
  }

  const currency = project.currency || "AED";

  // Fetch periods
  const { data: periods, error: perErr } = await client
    .from("payout_periods")
    .select("*")
    .eq("project_id", projectId)
    .order("period_no", { ascending: true });

  if (perErr) {
    console.error("Failed to load payout_periods:", perErr.message);
    process.exit(1);
  }

  // Fetch repayments
  const { data: repayments, error: repErr } = await client
    .from("repayments")
    .select("*, payout_periods!inner(project_id)")
    .eq("payout_periods.project_id", projectId);

  if (repErr) {
    console.error("Failed to load repayments:", repErr.message);
    process.exit(1);
  }

  console.log("\n=======================================================");
  console.log(` PROJECT SIMULATION STATUS: #${project.id} - ${project.title}`);
  console.log("=======================================================");
  console.log(`Status:            ${project.status}`);
  console.log(`Contract Type:     ${project.sharia_contract_type}`);
  console.log(`Funds Released At: ${project.funds_released_at || "None (Not released)"}`);
  console.log(`Maturity Date:     ${project.maturity_date || "N/A"}`);
  console.log(`Total Periods:     ${(periods || []).length}`);
  console.log(`Total Repayments:  ${(repayments || []).length}`);
  console.log("-------------------------------------------------------");

  if (!periods || periods.length === 0) {
    console.log("No payout periods generated yet.");
    process.exit(0);
  }

  console.log(
    "Period".padEnd(8) +
    "Kind".padEnd(16) +
    "Due Date (UTC)".padEnd(24) +
    "Status".padEnd(12) +
    "Reported".padEnd(14) +
    "Total Paid".padEnd(14) +
    "Final"
  );
  console.log("-".repeat(95));

  for (const p of periods) {
    const pRepayments = (repayments || []).filter((r) => r.payout_period_id === p.id);
    const paidSum = pRepayments.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);
    const reportedStr = p.reported_amount != null ? `${currency} ${Number(p.reported_amount).toLocaleString()}` : "—";
    const paidStr = p.total_paid != null ? `${currency} ${Number(p.total_paid).toLocaleString()}` : (paidSum > 0 ? `${currency} ${paidSum.toLocaleString()}` : "0");

    console.log(
      `#${p.period_no}`.padEnd(8) +
      p.kind.padEnd(16) +
      (p.due_date ? p.due_date.substring(0, 19).replace("T", " ") : "—").padEnd(24) +
      p.status.padEnd(12) +
      reportedStr.padEnd(14) +
      paidStr.padEnd(14) +
      (p.is_final ? "YES" : "NO")
    );
  }

  const allPaidTotal = (repayments || [])
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const allScheduledTotal = (repayments || [])
    .filter((r) => r.status === "scheduled")
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const allFailedTotal = (repayments || [])
    .filter((r) => r.status === "failed")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  console.log("-".repeat(95));
  console.log(`Aggregate Total Paid:      ${currency} ${allPaidTotal.toLocaleString()}`);
  console.log(`Aggregate Total Scheduled: ${currency} ${allScheduledTotal.toLocaleString()}`);
  if (allFailedTotal > 0) {
    console.log(`Aggregate Total Failed:    ${currency} ${allFailedTotal.toLocaleString()}`);
  }
  console.log("=======================================================\n");
}

main();
