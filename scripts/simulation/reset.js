#!/usr/bin/env node

/**
 * FILE: scripts/simulation/reset.js
 * USAGE:
 *   ALLOW_SIM=true node --env-file=.env.local scripts/simulation/reset.js --project=12 [--yes]
 */

import { guardSimulation, getProjectIdArg } from "./helper.js";
import { supabaseAdmin, getSupabaseAdmin } from "../../lib/supabase.js";

async function main() {
  const projectId = getProjectIdArg();
  if (!projectId) {
    console.error("Error: Missing --project=ID parameter.");
    console.error("Usage: ALLOW_SIM=true node scripts/simulation/reset.js --project=<ID>");
    process.exit(1);
  }

  await guardSimulation(`reset simulation for Project ${projectId}`);

  const client = getSupabaseAdmin() || supabaseAdmin;

  console.log(`\nResetting Project ${projectId} back to 'funded'...`);

  // 1. Delete all payout_periods (cascades to repayments)
  const { error: delErr } = await client
    .from("payout_periods")
    .delete()
    .eq("project_id", projectId);

  if (delErr) {
    console.error("Failed to delete payout_periods:", delErr.message);
    process.exit(1);
  }

  // 2. Put project back to 'funded' with null funds_released_at and maturity_date
  const { error: projErr } = await client
    .from("projects")
    .update({
      status: "funded",
      funds_released_at: null,
      maturity_date: null,
    })
    .eq("id", projectId);

  if (projErr) {
    console.error("Failed to reset project status:", projErr.message);
    process.exit(1);
  }

  // 3. Put pledges back to 'allocated' with null redeemed_at
  const { error: plErr } = await client
    .from("pledges")
    .update({
      status: "allocated",
      redeemed_at: null,
    })
    .eq("project_id", projectId)
    .in("status", ["active", "completed"]);

  if (plErr) {
    console.error("Failed to reset pledge statuses:", plErr.message);
    process.exit(1);
  }

  console.log(`Reset Complete for Project ${projectId}:`);
  console.log("- Deleted all periods and repayments.");
  console.log("- Project status reset to 'funded' (funds_released_at = null, maturity_date = null).");
  console.log("- Pledges reset back to 'allocated' (redeemed_at = null).");
}

main();
