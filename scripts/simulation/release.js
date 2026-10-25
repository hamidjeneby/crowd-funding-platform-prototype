#!/usr/bin/env node

/**
 * FILE: scripts/simulation/release.js
 * USAGE:
 *   ALLOW_SIM=true node --env-file=.env.local scripts/simulation/release.js --project=12 [--yes]
 */

import { guardSimulation, getProjectIdArg } from "./helper.js";
import { releaseFunds } from "../../lib/repayments/release.js";

async function main() {
  const projectId = getProjectIdArg();
  if (!projectId) {
    console.error("Error: Missing --project=ID parameter.");
    console.error("Usage: ALLOW_SIM=true node scripts/simulation/release.js --project=<ID>");
    process.exit(1);
  }

  await guardSimulation(`releaseFunds for Project ${projectId}`);

  console.log(`\nReleasing funds for Project ${projectId}...`);
  try {
    const result = await releaseFunds(projectId);
    console.log("Release Success:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Release Failed:", err.message);
    process.exit(1);
  }
}

main();
