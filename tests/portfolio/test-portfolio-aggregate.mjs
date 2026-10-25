/**
 * FILE: tests/portfolio/test-portfolio-aggregate.mjs
 * PURPOSE:
 *   Pure `node:test` unit tests for `lib/portfolio/aggregate.js` using hand-computed fixtures:
 *     1. buildSummary: partial fill, pending pledge, refunded, rejected, largest holding share
 *     2. byContractType: grouping and 1-decimal percentage calculations
 *     3. byProject: top 8 ordering, tie breaking, and "Other" grouping
 *     4. byMonth: continuous UTC axis with filled zero gaps and fallback from allocated_at to pledged_at
 *     5. outcomes: fully allocated, partly allocated, not allocated, refunded, excluding cancelled
 *     6. conversionExposure: only holdings with conversion_eligible_units > 0
 *     7. Mixed currency detection and segregation
 *
 * HOW TO RUN:
 *   node --test tests/portfolio/test-portfolio-aggregate.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSummary,
  byContractType,
  byProject,
  byMonth,
  outcomes,
  conversionExposure,
  formatContractTypeLabel,
} from "../../lib/portfolio/aggregate.js";

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const FIXTURES_BASIC = [
  // 1. Fully allocated Murabaha
  {
    id: 1,
    project_id: 101,
    status: "allocated",
    pledged_amount: 50000,
    allocated_amount: 50000,
    allocated_units: 50,
    pledged_at: "2026-01-10T12:00:00Z",
    allocated_at: "2026-01-20T12:00:00Z",
    conversion_eligible_units: 0,
    projects: {
      id: 101,
      title: "Solar Grid Alpha",
      slug: "solar-grid-alpha",
      sharia_contract_type: "murabaha",
      currency: "AED",
      unit_price: 1000,
    },
  },
  // 2. Partial fill Ijara (pledged 40k, allocated 30k)
  {
    id: 2,
    project_id: 102,
    status: "allocated",
    pledged_amount: 40000,
    allocated_amount: 30000,
    allocated_units: 30,
    pledged_at: "2026-01-15T10:00:00Z",
    allocated_at: "2026-01-25T10:00:00Z",
    conversion_eligible_units: 25,
    projects: {
      id: 102,
      title: "Logistics Hub Beta",
      slug: "logistics-hub-beta",
      sharia_contract_type: "ijara",
      currency: "AED",
      unit_price: 1000,
    },
  },
  // 3. Pending pledge (awaiting allocation: 20k)
  {
    id: 3,
    project_id: 103,
    status: "pending",
    pledged_amount: 20000,
    allocated_amount: null,
    pledged_at: "2026-02-01T08:00:00Z",
    allocated_at: null,
    conversion_eligible_units: null,
    projects: {
      id: 103,
      title: "Wind Park Gamma",
      slug: "wind-park-gamma",
      sharia_contract_type: "mudarabah",
      currency: "AED",
      unit_price: 1000,
    },
  },
  // 4. Rejected oversubscribed (15k)
  {
    id: 4,
    project_id: 104,
    status: "rejected_oversubscribed",
    pledged_amount: 15000,
    allocated_amount: 0,
    pledged_at: "2026-01-05T09:00:00Z",
    allocated_at: null,
    conversion_eligible_units: null,
    projects: {
      id: 104,
      title: "Tech Campus Delta",
      slug: "tech-campus-delta",
      sharia_contract_type: "spv_equity",
      currency: "AED",
      unit_price: 500,
    },
  },
  // 5. Refunded pledge (10k)
  {
    id: 5,
    project_id: 105,
    status: "refunded",
    pledged_amount: 10000,
    allocated_amount: 0,
    pledged_at: "2026-01-08T11:00:00Z",
    allocated_at: null,
    conversion_eligible_units: null,
    projects: {
      id: 105,
      title: "Retail Complex Epsilon",
      slug: "retail-complex-epsilon",
      sharia_contract_type: "murabaha",
      currency: "AED",
      unit_price: 1000,
    },
  },
  // 6. Cancelled pledge (5k - ignored everywhere)
  {
    id: 6,
    project_id: 106,
    status: "cancelled",
    pledged_amount: 5000,
    allocated_amount: 0,
    pledged_at: "2026-01-02T10:00:00Z",
    allocated_at: null,
    conversion_eligible_units: null,
    projects: {
      id: 106,
      title: "Old Project Zeta",
      slug: "old-project-zeta",
      sharia_contract_type: "murabaha",
      currency: "AED",
    },
  },
  // 7. Holding in April 2026 with null allocated_at (falls back to pledged_at)
  {
    id: 7,
    project_id: 107,
    status: "active",
    pledged_amount: 20000,
    allocated_amount: 20000,
    allocated_units: 20,
    pledged_at: "2026-04-10T14:00:00Z",
    allocated_at: null, // Test fallback to pledged_at
    conversion_eligible_units: 10,
    projects: {
      id: 107,
      title: "Water Desalination Eta",
      slug: "water-desalination-eta",
      sharia_contract_type: "spv_equity",
      currency: "AED",
      unit_price: 1000,
    },
  },
];

// -----------------------------------------------------------------------------
// Unit Tests
// -----------------------------------------------------------------------------

test("1. buildSummary computes correct 4 strip metrics and largest holding share", () => {
  const summary = buildSummary(FIXTURES_BASIC);

  // Total invested = 50,000 (id 1) + 30,000 (id 2) + 20,000 (id 7) = 100,000
  assert.equal(summary.totalInvested, 100000);

  // Awaiting allocation = 20,000 (id 3 pending)
  assert.equal(summary.awaitingAllocation, 20000);

  // Holdings count = 3 (id 1, 2, 7)
  assert.equal(summary.holdingsCount, 3);
  assert.equal(summary.pendingCount, 1);

  // Largest holding = 50,000 / 100,000 = 50.0%
  assert.equal(summary.largestHoldingAmount, 50000);
  assert.equal(summary.largestHoldingPercent, 50.0);

  // Single currency AED
  assert.equal(summary.hasMixedCurrencies, false);
  assert.equal(summary.primaryCurrency, "AED");
});

test("2. byContractType aggregates amounts and percentages with friendly labels", () => {
  const res = byContractType(FIXTURES_BASIC);

  // Murabaha: 50,000 (50.0%)
  // Ijara: 30,000 (30.0%)
  // SPV Equity: 20,000 (20.0%)
  assert.equal(res.total, 100000);
  assert.deepEqual(res.labels, ["Murabaha", "Ijara", "SPV Equity"]);
  assert.deepEqual(res.data, [50000, 30000, 20000]);
  assert.deepEqual(res.percentages, [50.0, 30.0, 20.0]);
});

test("3. byProject sorts by allocated_amount, breaks ties by title, and groups top 8 + Other", () => {
  // Test with 10 holdings to verify top 8 + Other
  const tenHoldings = [
    { id: 1, status: "allocated", allocated_amount: 10000, projects: { id: 1, title: "Proj A" } },
    { id: 2, status: "allocated", allocated_amount: 9000, projects: { id: 2, title: "Proj B" } },
    { id: 3, status: "allocated", allocated_amount: 8000, projects: { id: 3, title: "Proj C" } },
    { id: 4, status: "allocated", allocated_amount: 7000, projects: { id: 4, title: "Proj D" } },
    { id: 5, status: "allocated", allocated_amount: 6000, projects: { id: 5, title: "Proj E" } },
    // Tie at 5000: Proj F vs Proj G -> Proj F first by title
    { id: 6, status: "allocated", allocated_amount: 5000, projects: { id: 6, title: "Proj G" } },
    { id: 7, status: "allocated", allocated_amount: 5000, projects: { id: 7, title: "Proj F" } },
    { id: 8, status: "allocated", allocated_amount: 4000, projects: { id: 8, title: "Proj H" } },
    // 9th and 10th should be grouped into Other: 3000 + 2000 = 5000
    { id: 9, status: "allocated", allocated_amount: 3000, projects: { id: 9, title: "Proj I" } },
    { id: 10, status: "allocated", allocated_amount: 2000, projects: { id: 10, title: "Proj J" } },
  ];

  const res = byProject(tenHoldings, 8);
  assert.equal(res.items.length, 9); // Top 8 + Other
  assert.equal(res.labels[0], "Proj A");
  assert.equal(res.labels[5], "Proj F"); // Alphabetical tiebreak
  assert.equal(res.labels[6], "Proj G");
  assert.equal(res.labels[7], "Proj H");
  assert.equal(res.labels[8], "Other");
  assert.equal(res.data[8], 5000); // 3000 + 2000

  // Total should equal exact sum of all 10 holdings
  assert.equal(res.total, 59000);
  const sumOfData = res.data.reduce((a, b) => a + b, 0);
  assert.equal(sumOfData, 59000);
});

test("4. byMonth produces continuous UTC axis including filled zero months for gaps", () => {
  // FIXTURES_BASIC has holdings in Jan 2026 (id 1, 2: 80k) and Apr 2026 (id 7: 20k, null allocated_at falls back to pledged_at)
  // Feb 2026 and Mar 2026 should be generated as 0
  const res = byMonth(FIXTURES_BASIC);

  assert.equal(res.total, 100000);
  assert.deepEqual(res.keys, ["2026-01", "2026-02", "2026-03", "2026-04"]);
  assert.deepEqual(res.labels, [
    "Jan 2026 (UTC)",
    "Feb 2026 (UTC)",
    "Mar 2026 (UTC)",
    "Apr 2026 (UTC)",
  ]);
  assert.deepEqual(res.data, [80000, 0, 0, 20000]);
});

test("5. outcomes categorizes fully allocated, partly allocated, not allocated, and refunded", () => {
  const res = outcomes(FIXTURES_BASIC);

  assert.equal(res.hasOutcomes, true);
  assert.equal(res.totalCount, 5); // 2 fully allocated (id 1, 7), 1 partly (id 2), 1 rejected (id 4), 1 refunded (id 5)

  // Fully allocated (id 1: 50k, id 7: 20k)
  assert.equal(res.fullyAllocated.count, 2);
  assert.equal(res.fullyAllocated.allocatedAmount, 70000);

  // Partly allocated (id 2: pledged 40k, allocated 30k)
  assert.equal(res.partlyAllocated.count, 1);
  assert.equal(res.partlyAllocated.pledgedAmount, 40000);
  assert.equal(res.partlyAllocated.allocatedAmount, 30000);
  assert.equal(res.partlyAllocated.unallocatedAmount, 10000);

  // Not allocated (id 4: 15k)
  assert.equal(res.notAllocated.count, 1);
  assert.equal(res.notAllocated.pledgedAmount, 15000);

  // Refunded (id 5: 10k)
  assert.equal(res.refunded.count, 1);
  assert.equal(res.refunded.pledgedAmount, 10000);
});

test("6. conversionExposure aggregates only holdings with conversion_eligible_units > 0", () => {
  const res = conversionExposure(FIXTURES_BASIC);

  // id 2 has 25 units, id 7 has 10 units
  assert.equal(res.hasExposure, true);
  assert.equal(res.totalReservedUnits, 35);
  assert.equal(res.items.length, 2);
  assert.equal(res.items[0].projectTitle, "Logistics Hub Beta");
  assert.equal(res.items[0].conversionEligibleUnits, 25);
  assert.equal(res.items[1].projectTitle, "Water Desalination Eta");
  assert.equal(res.items[1].conversionEligibleUnits, 10);
});

test("7. Mixed currencies are detected and segregated without un-denominated addition", () => {
  const multiCurrencyPledges = [
    {
      id: 1,
      status: "allocated",
      allocated_amount: 50000,
      projects: { currency: "AED" },
    },
    {
      id: 2,
      status: "allocated",
      allocated_amount: 20000,
      projects: { currency: "USD" },
    },
    {
      id: 3,
      status: "pending",
      pledged_amount: 5000,
      projects: { currency: "USD" },
    },
  ];

  const summary = buildSummary(multiCurrencyPledges);
  assert.equal(summary.hasMixedCurrencies, true);
  assert.deepEqual(summary.currencies, ["AED", "USD"]);
  assert.equal(summary.byCurrency.AED.totalInvested, 50000);
  assert.equal(summary.byCurrency.USD.totalInvested, 20000);
  assert.equal(summary.byCurrency.USD.awaitingAllocation, 5000);
});

test("8. Empty pledges return safe zeroed structures without throwing", () => {
  const summary = buildSummary([]);
  assert.equal(summary.totalInvested, 0);
  assert.equal(summary.awaitingAllocation, 0);
  assert.equal(summary.holdingsCount, 0);
  assert.equal(summary.largestHoldingPercent, 0);

  const contract = byContractType([]);
  assert.equal(contract.total, 0);
  assert.equal(contract.labels.length, 0);

  const proj = byProject([]);
  assert.equal(proj.total, 0);
  assert.equal(proj.items.length, 0);

  const month = byMonth([]);
  assert.equal(month.total, 0);
  assert.equal(month.labels.length, 0);

  const out = outcomes([]);
  assert.equal(out.hasOutcomes, false);
  assert.equal(out.totalCount, 0);

  const conv = conversionExposure([]);
  assert.equal(conv.hasExposure, false);
  assert.equal(conv.totalReservedUnits, 0);
});
