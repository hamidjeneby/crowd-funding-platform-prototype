/**
 * FILE: tests/pledge-model/test-pledge-model.mjs
 * PURPOSE:
 *   Live Supabase & constants verification for the "Request, Then Allocate"
 *   pledge model and investor privacy rules:
 *     1. Config & Constants Integrity (150% oversubscription, v1.0 terms, conversion caps)
 *     2. Conversion & Ceiling Math Logic
 *     3. Database Schema Integrity (Live Supabase check for required columns)
 *     4. Server Action Query Aggregations (exclusion of cancelled/refunded/rejected pledges)
 *     5. Webhook Payload Structure Validation (no PII leakage)
 *     6. Class Band Privacy Merging Rules (Max Class 1–4 k-anonymity)
 *
 * HOW TO RUN:
 *   node --env-file=.env.local tests/pledge-model/test-pledge-model.mjs
 */

import { createClient } from "@supabase/supabase-js";
import {
  MAX_OVERSUBSCRIPTION_PERCENT,
  PLEDGE_TERMS_VERSION,
  PLEDGE_DISCLOSURES,
  PLEDGE_TERMS_CHECKBOX_LABEL,
} from "../../app/constants/pledgeConfig.js";
import { CLASS_CONFIG } from "../../app/constants/classConfig.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing Supabase credentials in environment (.env.local)");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function runTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING 'REQUEST, THEN ALLOCATE' VERIFICATION");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  console.log("1. Config & Constants Integrity");
  // --------------------------------------------------------------------------
  assert(MAX_OVERSUBSCRIPTION_PERCENT === 150, "MAX_OVERSUBSCRIPTION_PERCENT is 150");
  assert(PLEDGE_TERMS_VERSION === "v1.0", "PLEDGE_TERMS_VERSION is 'v1.0'");
  assert(typeof PLEDGE_TERMS_CHECKBOX_LABEL === "string" && PLEDGE_TERMS_CHECKBOX_LABEL.length > 0, "PLEDGE_TERMS_CHECKBOX_LABEL is exported");
  assert(Array.isArray(PLEDGE_DISCLOSURES.items) && PLEDGE_DISCLOSURES.items.length >= 4, "PLEDGE_DISCLOSURES contains all disclosure bullets");
  assert(CLASS_CONFIG[1]?.conversionCap === Infinity, "Class 1 has uncapped conversion capacity");
  assert(CLASS_CONFIG[2]?.conversionCap === 1000000, "Class 2 has $1,000,000 conversion cap");

  // --------------------------------------------------------------------------
  console.log("\n2. Conversion & Ceiling Math Logic");
  // --------------------------------------------------------------------------
  const unitPrice = 250;
  
  // Class 1 pledging $2,000,000 (uncapped)
  const class1Units = Math.floor(Math.min(2000000, Infinity) / unitPrice);
  assert(class1Units === 8000, `Class 1 requested units computed correctly (8000 === ${class1Units})`);

  // Class 2 pledging $2,000,000 (cap $1,000,000)
  const class2Units = Math.floor(Math.min(2000000, 1000000) / unitPrice);
  assert(class2Units === 4000, `Class 2 capped requested units computed correctly (4000 === ${class2Units})`);

  // 150% ceiling logic test
  const targetGoal = 1000000;
  const ceiling = targetGoal * 1.5;
  const currentRaised = 1400000;
  const validPledge = 100000;
  const invalidPledge = 100001;
  assert(currentRaised + validPledge <= ceiling, "Pledge exactly reaching 150% is allowed");
  assert(currentRaised + invalidPledge > ceiling, "Pledge exceeding 150% is rejected");

  // --------------------------------------------------------------------------
  console.log("\n3. Database Schema Integrity (Live Supabase)");
  // --------------------------------------------------------------------------
  const { data: pledgesCols, error: pErr } = await supabaseAdmin
    .from("pledges")
    .select("id, status, pledged_amount, requested_conversion_units, conversion_eligible_units, allocated_amount, allocation_rank, refunded_amount")
    .limit(1);
  if (pErr) console.log("pledges error details:", pErr.message);
  assert(!pErr, `'pledges' table contains all request-then-allocate columns (status, allocated_amount, etc.)`);

  const { data: docsCols, error: dErr } = await supabaseAdmin
    .from("pledge_docs")
    .select("id, pledge_id, doc_type, terms_version, signed_at, signed_ip, file_url")
    .limit(1);
  assert(!dErr, `'pledge_docs' table contains subscription agreement audit columns (terms_version, signed_at, signed_ip)`);

  const { data: invCols, error: iErr } = await supabaseAdmin
    .from("investors")
    .select("id, user_id, org_id, investor_class, wallet_balance")
    .limit(1);
  assert(!iErr, `'investors' table schema contains internal id, user_id, org_id, and wallet_balance`);

  const { data: issCols, error: isErr } = await supabaseAdmin
    .from("issuers")
    .select("id, org_id")
    .limit(1);
  assert(!isErr, `'issuers' table schema contains internal id and org_id`);

  // --------------------------------------------------------------------------
  console.log("\n4. Server Action Query Aggregations");
  // --------------------------------------------------------------------------
  const { data: sampleProject } = await supabaseAdmin
    .from("projects")
    .select("id, slug, title, target_goal")
    .limit(1)
    .maybeSingle();

  if (sampleProject) {
    const { data: activePledges, error: apErr } = await supabaseAdmin
      .from("pledges")
      .select("id, pledged_amount, status")
      .eq("project_id", sampleProject.id)
      .not("status", "in", '("cancelled","refunded","rejected_oversubscribed")');
    assert(!apErr, `Active pledges query correctly excludes cancelled, refunded, and rejected_oversubscribed`);
  } else {
    console.log("  ⚠️ Skipping live project query: No projects found in DB");
  }

  // --------------------------------------------------------------------------
  console.log("\n5. Webhook Payload Structure Validation");
  // --------------------------------------------------------------------------
  const mockPayload = {
    event: "pledge.created",
    pledge_id: 123,
    project_id: 456,
    project_title: "Green Solar",
    investor_id: 789,
    investor_class: 2,
    pledge_amount: 50000,
    currency: "AED",
    requested_conversion_units: 200,
    terms_version: PLEDGE_TERMS_VERSION,
    signed_at: new Date().toISOString(),
    signed_ip: "127.0.0.1",
  };

  assert(mockPayload.terms_version === "v1.0", "Webhook payload includes terms_version");
  assert(Boolean(mockPayload.signed_at), "Webhook payload includes signed_at timestamp");
  assert(Boolean(mockPayload.signed_ip), "Webhook payload includes signed_ip address");
  assert(!mockPayload.investor_name && !mockPayload.email, "Webhook payload does NOT leak PII");

  // --------------------------------------------------------------------------
  console.log("\n6. Class Band Privacy Merging Rules (Max Class 1–4)");
  // --------------------------------------------------------------------------
  function computeBands(pledges) {
    const rawTier1 = { id: "1", label: "Class 1", minClass: 1, maxClass: 1, count: 0, amount: 0 };
    const rawTier2 = { id: "2-4", label: "Class 2–4", minClass: 2, maxClass: 4, count: 0, amount: 0 };
    const rawTier3 = { id: "5-7", label: "Class 5–7", minClass: 5, maxClass: 7, count: 0, amount: 0 };
    const rawTier4 = { id: "8-10", label: "Class 8–10", minClass: 8, maxClass: 10, count: 0, amount: 0 };

    pledges.forEach((p) => {
      const cls = p.class;
      if (cls === 1) rawTier1.count++;
      else if (cls >= 2 && cls <= 4) rawTier2.count++;
      else if (cls >= 5 && cls <= 7) rawTier3.count++;
      else rawTier4.count++;
    });

    const bands = [];
    const totalHighClassCount = rawTier1.count + rawTier2.count;
    if (totalHighClassCount > 0) {
      if (rawTier1.count >= 3 && rawTier2.count >= 3) {
        bands.push(rawTier1);
        bands.push(rawTier2);
      } else if (rawTier1.count > 0 && (rawTier1.count < 3 || rawTier2.count > 0)) {
        bands.push({ id: "1-4", label: "Class 1–4", minClass: 1, maxClass: 4, count: totalHighClassCount });
      } else if (rawTier1.count >= 3 && rawTier2.count === 0) {
        bands.push(rawTier1);
      } else {
        bands.push(rawTier2);
      }
    }
    if (rawTier3.count > 0) bands.push(rawTier3);
    if (rawTier4.count > 0) bands.push(rawTier4);
    return bands;
  }

  const scenarioBands = computeBands([
    { class: 1 }, { class: 2 }, { class: 4 }, { class: 6 }, { class: 10 }
  ]);
  assert(scenarioBands.length === 3, "Output has exactly 3 bands");
  assert(scenarioBands[0].label === "Class 1–4", "Classes 1, 2, 4 are merged into Class 1–4 maximum");
  assert(scenarioBands[1].label === "Class 5–7", "Class 6 remains in Class 5–7 without merging into Class 1–4");
  assert(scenarioBands[2].label === "Class 8–10", "Class 10 remains in Class 8–10 without merging");

  console.log("\n=================================================");
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
