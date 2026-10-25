#!/usr/bin/env node

/**
 * FILE: scripts/simulation/advance.js
 * USAGE:
 *   ALLOW_SIM=true node --env-file=.env.local scripts/simulation/advance.js --project=12 [--yes]
 */

import { guardSimulation, getProjectIdArg } from "./helper.js";
import { supabaseAdmin, getSupabaseAdmin } from "../../lib/supabase.js";

async function main() {
  const projectId = getProjectIdArg();
  if (!projectId) {
    console.error("Error: Missing --project=ID parameter.");
    console.error("Usage: ALLOW_SIM=true node scripts/simulation/advance.js --project=<ID>");
    process.exit(1);
  }

  await guardSimulation(`advance next unpaid period for Project ${projectId}`);

  const client = getSupabaseAdmin() || supabaseAdmin;

  // Fetch next unpaid period
  const { data: nextPeriod, error: fetchErr } = await client
    .from("payout_periods")
    .select("*")
    .eq("project_id", projectId)
    .neq("status", "paid")
    .order("period_no", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    console.error("Failed to query payout_periods:", fetchErr.message);
    process.exit(1);
  }

  if (!nextPeriod) {
    console.log(`No unpaid payout periods found for Project ${projectId}. (All periods are paid or none created).`);
    process.exit(0);
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateErr } = await client
    .from("payout_periods")
    .update({ due_date: nowIso })
    .eq("id", nextPeriod.id)
    .select()
    .single();

  if (updateErr) {
    console.error("Failed to update due_date:", updateErr.message);
    process.exit(1);
  }

  console.log(`\nAdvanced Period #${updated.period_no} (ID: ${updated.id}):`);
  console.log(`- Previous Due Date: ${nextPeriod.due_date}`);
  console.log(`- New Due Date:      ${updated.due_date} (NOW)`);
  console.log(`- Status:            ${updated.status}`);
  console.log(`- Kind:              ${updated.kind}`);
}

main();
