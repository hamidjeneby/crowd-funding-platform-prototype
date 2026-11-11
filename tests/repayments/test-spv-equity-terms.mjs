import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanContractTerms,
  validateContractTerms,
  spvEquityTermsSchema,
} from "../../lib/validation/repaymentTermsSchema.js";

test("SPV Equity Contract Terms - Voting Rights Stripped", () => {
  // Input containing voting_rights (e.g. from legacy form, mock, or DB row)
  const rawTerms = {
    existing_shares_outstanding: 50000,
    voting_rights: true,
    dividend_policy: "target_payout",
    target_exit_horizon_years: 5,
  };

  // 1. cleanContractTerms must strip voting_rights entirely
  const cleaned = cleanContractTerms("spv_equity", rawTerms);
  assert.equal("voting_rights" in cleaned, false, "voting_rights must NOT be present in cleaned object");
  assert.equal(cleaned.existing_shares_outstanding, 50000);
  assert.equal(cleaned.dividend_policy, "target_payout");
  assert.equal(cleaned.target_exit_horizon_years, 5);

  // 2. validateContractTerms must succeed and output data without voting_rights
  const validationResult = validateContractTerms("spv_equity", rawTerms);
  assert.equal(validationResult.success, true, "Validation should succeed after stripping disallowed keys");
  assert.equal("voting_rights" in validationResult.data, false, "voting_rights must NOT be in validated data");
  assert.equal(validationResult.data.existing_shares_outstanding, 50000);
  assert.equal(validationResult.data.dividend_policy, "target_payout");
});

test("SPV Equity Contract Terms - Discretionary Dividend Policy Removed", () => {
  // 1. 'discretionary' must be rejected
  const discretionaryTerms = {
    existing_shares_outstanding: 10000,
    dividend_policy: "discretionary",
  };
  const resDiscretionary = validateContractTerms("spv_equity", discretionaryTerms);
  assert.equal(resDiscretionary.success, false, "dividend_policy 'discretionary' must fail validation");

  // 2. 'none_planned' must be accepted
  const nonePlannedTerms = {
    existing_shares_outstanding: 10000,
    dividend_policy: "none_planned",
  };
  const resNonePlanned = validateContractTerms("spv_equity", nonePlannedTerms);
  assert.equal(resNonePlanned.success, true, "dividend_policy 'none_planned' must pass");
  assert.equal(resNonePlanned.data.dividend_policy, "none_planned");

  // 3. 'target_payout' must be accepted
  const targetPayoutTerms = {
    existing_shares_outstanding: 10000,
    dividend_policy: "target_payout",
  };
  const resTargetPayout = validateContractTerms("spv_equity", targetPayoutTerms);
  assert.equal(resTargetPayout.success, true, "dividend_policy 'target_payout' must pass");
  assert.equal(resTargetPayout.data.dividend_policy, "target_payout");

  // 4. Optional / omitted dividend policy must pass
  const omittedPolicyTerms = {
    existing_shares_outstanding: 10000,
  };
  const resOmitted = validateContractTerms("spv_equity", omittedPolicyTerms);
  assert.equal(resOmitted.success, true, "Omitted dividend policy must pass");
  assert.equal(resOmitted.data.dividend_policy, undefined);
});

test("SPV Equity Schema rejects voting_rights directly (strict check)", () => {
  const directParse = spvEquityTermsSchema.safeParse({
    existing_shares_outstanding: 10000,
    voting_rights: true,
  });
  assert.equal(directParse.success, false, "spvEquityTermsSchema must reject unknown field voting_rights under .strict()");
});
