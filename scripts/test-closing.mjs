import test from "node:test";
import assert from "node:assert/strict";
import { allocatePledges } from "../lib/closing/allocate.js";
import { allocateConversionPool } from "../lib/closing/conversion.js";
import { computeRefunds } from "../lib/closing/refunds.js";

function runPurePipeline(project, pledges) {
  const allocationOut = allocatePledges(project, pledges);
  const convOut = allocateConversionPool(
    project,
    allocationOut.pledges,
    allocationOut.status
  );
  const finalResults = computeRefunds(convOut.pledges, allocationOut.status);

  return {
    ...allocationOut,
    outcome: allocationOut.outcome,
    failureReason: allocationOut.failure_reason,
    allocatedTotal: allocationOut.allocated_total,
    subscribedTotalAtClose: allocationOut.subscribed_total_at_close,
    pledgeResults: finalResults,
    conversionPool: {
      enabled: convOut.conversion_active,
      poolUnitsTotal: convOut.pool_units_total,
      poolUnitsAllocated: convOut.pool_units_allocated,
      poolUnitsRemaining: convOut.pool_units_remaining,
    },
  };
}

const BASE_MURABAHA_PROJECT = {
  id: 1001,
  title: "Murabaha Test Campaign",
  sharia_contract_type: "murabaha",
  is_spv: true,
  currency: "AED",
  target_goal: 100000,
  soft_cap: 50000,
  hard_cap: 100000,
  unit_price: 1000,
  min_investment_floor: 5000,
  campaign_end_date: "2026-06-01T12:00:00Z",
  spv_details: {
    conversion_enabled: false,
    total_shares_authorized: 0,
    conversion_ratio_shares: 1,
  },
  contract_terms: {},
};

// S1: Exact target
test("S1: Exact target — all pledges allocated in full, project funded", () => {
  const project = { ...BASE_MURABAHA_PROJECT };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 2,
      pledged_amount: 60000,
      fee_amount: 600,
      pledged_at: "2026-05-10T10:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 5,
      pledged_amount: 40000,
      fee_amount: 800,
      pledged_at: "2026-05-11T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  assert.equal(out.outcome, "funded");
  assert.equal(out.failureReason, null);
  assert.equal(out.allocatedTotal, 100000);
  assert.equal(out.subscribedTotalAtClose, 100000);

  const p1 = out.pledgeResults.find((r) => r.pledge_id === 1);
  const p2 = out.pledgeResults.find((r) => r.pledge_id === 2);

  assert.equal(p1.status, "allocated");
  assert.equal(p1.allocated_amount, 60000);
  assert.equal(p1.allocated_units, 60);
  assert.equal(p1.allocation_rank, 1);
  assert.equal(p1.refunded_amount, 0);

  assert.equal(p2.status, "allocated");
  assert.equal(p2.allocated_amount, 40000);
  assert.equal(p2.allocated_units, 40);
  assert.equal(p2.allocation_rank, 2);
  assert.equal(p2.refunded_amount, 0);
});

// S2: Soft cap met below target
test("S2: Soft cap met below target — funded when allocated_total >= soft_cap", () => {
  const project = { ...BASE_MURABAHA_PROJECT, soft_cap: 50000, target_goal: 100000, hard_cap: 100000 };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 3,
      pledged_amount: 55000,
      fee_amount: 550,
      pledged_at: "2026-05-10T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  assert.equal(out.outcome, "funded");
  assert.equal(out.failureReason, null);
  assert.equal(out.allocatedTotal, 55000);
  assert.equal(out.pledgeResults[0].status, "allocated");
  assert.equal(out.pledgeResults[0].allocated_units, 55);
  assert.equal(out.pledgeResults[0].refunded_amount, 0);
});

// S3: Oversubscribed with partial fill and rejections
test("S3: Oversubscribed with partial fill and rejections — partial keeps fee, rejected refunds fee", () => {
  const project = { ...BASE_MURABAHA_PROJECT, hard_cap: 100000 };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 1,
      pledged_amount: 70000,
      fee_amount: 350,
      pledged_at: "2026-05-10T10:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 2,
      pledged_amount: 50000,
      fee_amount: 500,
      pledged_at: "2026-05-11T10:00:00Z",
      status: "pending",
    },
    {
      id: 3,
      investor_id: 103,
      investor_class_at_pledge: 4,
      pledged_amount: 20000,
      fee_amount: 300,
      pledged_at: "2026-05-12T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  assert.equal(out.outcome, "funded");
  assert.equal(out.allocatedTotal, 100000);
  assert.equal(out.subscribedTotalAtClose, 140000);

  const p1 = out.pledgeResults.find((r) => r.pledge_id === 1);
  const p2 = out.pledgeResults.find((r) => r.pledge_id === 2);
  const p3 = out.pledgeResults.find((r) => r.pledge_id === 3);

  // Full fill
  assert.equal(p1.status, "allocated");
  assert.equal(p1.allocated_amount, 70000);
  assert.equal(p1.allocated_units, 70);
  assert.equal(p1.refunded_amount, 0);
  assert.equal(p1.allocation_rank, 1);

  // Partial fill: 30,000 allocated, 20,000 unallocated principal refunded (fee NOT refunded)
  assert.equal(p2.status, "allocated");
  assert.equal(p2.allocated_amount, 30000);
  assert.equal(p2.allocated_units, 30);
  assert.equal(p2.refunded_amount, 20000);
  assert.equal(p2.allocation_rank, 2);

  // Rejected oversubscribed: 0 allocated, full refund including fee (20,000 + 300 = 20,300)
  assert.equal(p3.status, "rejected_oversubscribed");
  assert.equal(p3.allocated_amount, 0);
  assert.equal(p3.allocated_units, 0);
  assert.equal(p3.refunded_amount, 20300);
  assert.equal(p3.allocation_rank, 3);
});

// S4: Class priority beating size
test("S4: Class priority beats pledge size (Class 1 smaller pledge ranks ahead of Class 5 larger pledge)", () => {
  const project = { ...BASE_MURABAHA_PROJECT, hard_cap: 100000 };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 5,
      pledged_amount: 90000,
      fee_amount: 1800,
      pledged_at: "2026-05-01T10:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 1,
      pledged_amount: 30000,
      fee_amount: 150,
      pledged_at: "2026-05-20T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  const pClass1 = out.pledgeResults.find((r) => r.pledge_id === 2);
  const pClass5 = out.pledgeResults.find((r) => r.pledge_id === 1);

  assert.equal(pClass1.allocation_rank, 1);
  assert.equal(pClass1.allocated_amount, 30000);
  assert.equal(pClass1.refunded_amount, 0);

  assert.equal(pClass5.allocation_rank, 2);
  assert.equal(pClass5.allocated_amount, 70000);
  assert.equal(pClass5.refunded_amount, 20000);
});

// S5: Size tie-break within same class
test("S5: Size tie-break — within same class, larger pledge ranks first", () => {
  const project = { ...BASE_MURABAHA_PROJECT, hard_cap: 100000 };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 3,
      pledged_amount: 40000,
      fee_amount: 400,
      pledged_at: "2026-05-01T10:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 3,
      pledged_amount: 80000,
      fee_amount: 800,
      pledged_at: "2026-05-15T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  const pLarger = out.pledgeResults.find((r) => r.pledge_id === 2);
  const pSmaller = out.pledgeResults.find((r) => r.pledge_id === 1);

  assert.equal(pLarger.allocation_rank, 1);
  assert.equal(pLarger.allocated_amount, 80000);
  assert.equal(pLarger.refunded_amount, 0);

  assert.equal(pSmaller.allocation_rank, 2);
  assert.equal(pSmaller.allocated_amount, 20000);
  assert.equal(pSmaller.refunded_amount, 20000);
});

// S6: Timestamp tie-break within same class and same size
test("S6: Timestamp tie-break — within same class and size, earlier pledged_at ranks first", () => {
  const project = { ...BASE_MURABAHA_PROJECT, hard_cap: 60000, soft_cap: 50000 };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 2,
      pledged_amount: 60000,
      fee_amount: 600,
      pledged_at: "2026-05-10T12:00:05Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 2,
      pledged_amount: 60000,
      fee_amount: 600,
      pledged_at: "2026-05-10T12:00:01Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  const pEarlier = out.pledgeResults.find((r) => r.pledge_id === 2);
  const pLater = out.pledgeResults.find((r) => r.pledge_id === 1);

  assert.equal(pEarlier.allocation_rank, 1);
  assert.equal(pEarlier.status, "allocated");
  assert.equal(pEarlier.allocated_amount, 60000);
  assert.equal(pEarlier.refunded_amount, 0);

  assert.equal(pLater.allocation_rank, 2);
  assert.equal(pLater.status, "rejected_oversubscribed");
  assert.equal(pLater.allocated_amount, 0);
  assert.equal(pLater.refunded_amount, 60600);
});

// S7: Rounding down to whole units
test("S7: Allocation rounds down to whole units; rounding remainder is refunded like a partial fill (fee kept)", () => {
  const project = {
    ...BASE_MURABAHA_PROJECT,
    unit_price: 1000,
    min_investment_floor: 5000,
    soft_cap: 10000,
    hard_cap: 50000,
  };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 1,
      pledged_amount: 12750, // 12.75 units -> rounds down to 12 units (12,000), remainder 750
      fee_amount: 127.5,
      pledged_at: "2026-05-10T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  assert.equal(out.outcome, "funded");
  assert.equal(out.allocatedTotal, 12000);

  const p1 = out.pledgeResults[0];
  assert.equal(p1.status, "allocated");
  assert.equal(p1.allocated_amount, 12000);
  assert.equal(p1.allocated_units, 12);
  // Only the rounding remainder (750) is refunded; the fee (127.5) is kept
  assert.equal(p1.refunded_amount, 750);
});

// S8: Remainder below min_investment_floor skipped and next smaller pledge (or floor rule) tested
test("S8: Fill below min_investment_floor gets 0 and loop continues", () => {
  // Suppose capacity is 100,000, min_investment_floor is 10,000, unit_price is 1,000.
  //Wait: if remaining capacity is 8,000 (< min_investment_floor 10,000), or if a pledge has a rounded fill < min_investment_floor:
  // Let's test where remaining capacity is 10,000, Pledge 2 pledges 10,500 on a unit_price of 6,000 (rounds to 6,000 < floor 10,000 -> skipped!)
  // and Pledge 3 pledges 12,000 on capacity 12,000 -> gets 12,000!
  const project = {
    ...BASE_MURABAHA_PROJECT,
    unit_price: 6000,
    min_investment_floor: 10000, // requires at least 2 units (12,000)
    soft_cap: 50000,
    hard_cap: 72000,
  };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 1,
      pledged_amount: 60000, // 10 units = 60,000, leaves 12,000 remaining
      fee_amount: 300,
      pledged_at: "2026-05-01T10:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 2,
      pledged_amount: 11000, // min(11000, 12000) = 11000 -> rounds down to 1 unit = 6000 < floor 10000 -> gets 0!
      fee_amount: 110,
      pledged_at: "2026-05-02T10:00:00Z",
      status: "pending",
    },
    {
      id: 3,
      investor_id: 103,
      investor_class_at_pledge: 3,
      pledged_amount: 12000, // min(12000, 12000) = 12000 -> 2 units = 12000 >= floor 10000 -> gets 12,000!
      fee_amount: 120,
      pledged_at: "2026-05-03T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  assert.equal(out.outcome, "funded");
  assert.equal(out.allocatedTotal, 72000);

  const p1 = out.pledgeResults.find((r) => r.pledge_id === 1);
  const p2 = out.pledgeResults.find((r) => r.pledge_id === 2);
  const p3 = out.pledgeResults.find((r) => r.pledge_id === 3);

  assert.equal(p1.status, "allocated");
  assert.equal(p1.allocated_amount, 60000);

  // Skipped because rounded fill (6,000) < min_investment_floor (10,000)
  assert.equal(p2.status, "rejected_oversubscribed");
  assert.equal(p2.allocated_amount, 0);
  assert.equal(p2.refunded_amount, 11110); // full refund with fee

  // Loop continued and filled Pledge 3 with the remaining 12,000!
  assert.equal(p3.status, "allocated");
  assert.equal(p3.allocated_amount, 12000);
  assert.equal(p3.allocated_units, 2);
  assert.equal(p3.refunded_amount, 0);
});

// S9: Below soft cap fails
test("S9: Below soft cap fails with soft_cap_not_met and refunds everyone in full (including fee)", () => {
  const project = { ...BASE_MURABAHA_PROJECT, soft_cap: 50000 };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 1,
      pledged_amount: 20000,
      fee_amount: 100,
      pledged_at: "2026-05-10T10:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 2,
      pledged_amount: 15000,
      fee_amount: 150,
      pledged_at: "2026-05-11T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  assert.equal(out.outcome, "failed");
  assert.equal(out.failureReason, "soft_cap_not_met");
  assert.equal(out.allocatedTotal, 0);
  assert.equal(out.subscribedTotalAtClose, 35000);

  for (const r of out.pledgeResults) {
    assert.equal(r.status, "refunded");
    assert.equal(r.allocated_amount, 0);
    assert.equal(r.allocated_units, 0);
    assert.equal(r.allocation_rank, null);
    assert.equal(r.conversion_eligible_units, null);
  }

  const p1 = out.pledgeResults.find((r) => r.pledge_id === 1);
  const p2 = out.pledgeResults.find((r) => r.pledge_id === 2);
  assert.equal(p1.refunded_amount, 20100);
  assert.equal(p2.refunded_amount, 15150);
});

// S10: Zero pledges fails with no_pledges
test("S10: Zero pledges fails with failure_reason = no_pledges", () => {
  const project = { ...BASE_MURABAHA_PROJECT };
  const out = runPurePipeline(project, []);

  assert.equal(out.outcome, "failed");
  assert.equal(out.failureReason, "no_pledges");
  assert.equal(out.allocatedTotal, 0);
  assert.equal(out.subscribedTotalAtClose, 0);
  assert.equal(out.pledgeResults.length, 0);
});

// S11: Conversion pool exhausted
test("S11: Conversion pool exhausted — allocated in rank order to Class 1-4 only, Class 5+ gets 0", () => {
  const project = {
    ...BASE_MURABAHA_PROJECT,
    spv_details: {
      conversion_enabled: true,
      total_shares_authorized: 100, // with ratio 2 => pool_units = floor(100 / 2) = 50 units
      conversion_ratio_shares: 2,
    },
  };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 1,
      pledged_amount: 40000, // 40 units
      requested_conversion_units: 35,
      fee_amount: 200,
      pledged_at: "2026-05-10T10:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 3,
      pledged_amount: 30000, // 30 units
      requested_conversion_units: 25, // only 15 left in pool!
      fee_amount: 300,
      pledged_at: "2026-05-11T10:00:00Z",
      status: "pending",
    },
    {
      id: 3,
      investor_id: 103,
      investor_class_at_pledge: 5, // Class 5 is ineligible even if requested_conversion_units > 0
      pledged_amount: 20000, // 20 units
      requested_conversion_units: 10,
      fee_amount: 400,
      pledged_at: "2026-05-12T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  assert.equal(out.outcome, "funded");
  assert.equal(out.conversionPool.poolUnitsTotal, 50);
  assert.equal(out.conversionPool.poolUnitsAllocated, 50);
  assert.equal(out.conversionPool.poolUnitsRemaining, 0);

  const p1 = out.pledgeResults.find((r) => r.pledge_id === 1);
  const p2 = out.pledgeResults.find((r) => r.pledge_id === 2);
  const p3 = out.pledgeResults.find((r) => r.pledge_id === 3);

  assert.equal(p1.conversion_eligible_units, 35);
  assert.equal(p2.conversion_eligible_units, 15); // capped by remaining pool
  assert.equal(p3.conversion_eligible_units, 0); // Class 5 ineligible
});

// S12: Partial fill shrinks conversion below requested
test("S12: Partial fill shrinks conversion_eligible_units to allocated_units when allocated_units < requested_conversion_units", () => {
  const project = {
    ...BASE_MURABAHA_PROJECT,
    hard_cap: 80000,
    spv_details: {
      conversion_enabled: true,
      total_shares_authorized: 200, // ratio 1 => 200 pool units
      conversion_ratio_shares: 1,
    },
  };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 1,
      pledged_amount: 60000, // gets 60 units
      requested_conversion_units: 60,
      fee_amount: 300,
      pledged_at: "2026-05-10T10:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 2,
      pledged_amount: 50000, // requested 50 units, but only 20,000 (20 units) remaining in hard_cap!
      requested_conversion_units: 45,
      fee_amount: 500,
      pledged_at: "2026-05-11T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  const p2 = out.pledgeResults.find((r) => r.pledge_id === 2);

  assert.equal(p2.status, "allocated");
  assert.equal(p2.allocated_units, 20);
  // Shrunk from 45 requested down to 20 allocated_units!
  assert.equal(p2.conversion_eligible_units, 20);
  assert.equal(p2.refunded_amount, 30000);
});

// S13: SPV equity capacity and ownership_percentage
test("S13: SPV equity capacity = total_shares_authorized * unit_price, conversionPass = false, ownership_percentage computed", () => {
  const project = {
    id: 2001,
    title: "SPV Equity Venture",
    sharia_contract_type: "spv_equity",
    is_spv: true,
    currency: "AED",
    target_goal: 200000,
    soft_cap: 100000,
    hard_cap: 500000, // should be ignored in favor of total_shares_authorized * unit_price
    unit_price: 100,
    min_investment_floor: 1000,
    campaign_end_date: "2026-06-01T12:00:00Z",
    spv_details: {
      total_shares_authorized: 2000, // capacity = 2000 * 100 = 200,000
      conversion_enabled: true, // even if true in DB, spv_equity hook has conversionPass = false
    },
    contract_terms: {
      existing_shares_outstanding: 8000, // total post-close shares if 2000 allocated = 10,000
    },
  };

  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 1,
      pledged_amount: 150000, // 1500 shares
      requested_conversion_units: 500,
      fee_amount: 750,
      pledged_at: "2026-05-10T10:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 2,
      pledged_amount: 80000, // only 50,000 (500 shares) left in 200,000 capacity
      requested_conversion_units: 200,
      fee_amount: 800,
      pledged_at: "2026-05-11T10:00:00Z",
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  assert.equal(out.outcome, "funded");
  assert.equal(out.capacity, 200000);
  assert.equal(out.allocatedTotal, 200000);
  assert.equal(out.conversionPool.enabled, false);

  const p1 = out.pledgeResults.find((r) => r.pledge_id === 1);
  const p2 = out.pledgeResults.find((r) => r.pledge_id === 2);

  // 1500 / (8000 + 2000) * 100 = 15%
  assert.equal(p1.allocated_units, 1500);
  assert.equal(p1.ownership_percentage, 15);
  assert.equal(p1.conversion_eligible_units, null);

  // 500 / (8000 + 2000) * 100 = 5%
  assert.equal(p2.allocated_units, 500);
  assert.equal(p2.ownership_percentage, 5);
  assert.equal(p2.refunded_amount, 30000);
  assert.equal(p2.conversion_eligible_units, null);
});

// S14 / Late pledges test
test("S14: Late pledges (pledged_at > campaign_end_date) are excluded from allocation and refunded in full with fee", () => {
  const project = { ...BASE_MURABAHA_PROJECT, soft_cap: 50000, hard_cap: 100000 };
  const pledges = [
    {
      id: 1,
      investor_id: 101,
      investor_class_at_pledge: 3,
      pledged_amount: 60000,
      fee_amount: 600,
      pledged_at: "2026-06-01T11:59:59Z", // On time
      status: "pending",
    },
    {
      id: 2,
      investor_id: 102,
      investor_class_at_pledge: 1, // Higher priority class, but late!
      pledged_amount: 80000,
      fee_amount: 400,
      pledged_at: "2026-06-01T12:00:01Z", // 1 second after campaign_end_date
      status: "pending",
    },
  ];

  const out = runPurePipeline(project, pledges);
  assert.equal(out.outcome, "funded");
  assert.equal(out.allocatedTotal, 60000);
  assert.equal(out.subscribedTotalAtClose, 60000); // Late pledge excluded from subscribed_total_at_close

  const pOnTime = out.pledgeResults.find((r) => r.pledge_id === 1);
  const pLate = out.pledgeResults.find((r) => r.pledge_id === 2);

  assert.equal(pOnTime.status, "allocated");
  assert.equal(pOnTime.allocated_amount, 60000);
  assert.equal(pOnTime.allocation_rank, 1);
  assert.equal(pOnTime.refunded_amount, 0);

  assert.equal(pLate.status, "refunded");
  assert.equal(pLate.allocated_amount, 0);
  assert.equal(pLate.allocated_units, 0);
  assert.equal(pLate.allocation_rank, null);
  assert.equal(pLate.conversion_eligible_units, null);
  assert.equal(pLate.refunded_amount, 80400); // pledged_amount + fee_amount
});

// Invalid unit_price test
test("Throws clear error when unit_price is 0 or negative", () => {
  const project = { ...BASE_MURABAHA_PROJECT, unit_price: 0 };
  assert.throws(
    () => runPurePipeline(project, []),
    /Invalid unit_price \(0\)/
  );
});
