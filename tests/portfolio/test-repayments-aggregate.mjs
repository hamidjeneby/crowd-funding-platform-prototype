import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildRepaymentsSummary,
  byMonthReceived,
  cumulativeReceivedVsExpected,
} from "../../lib/portfolio/repaymentsAggregate.js";

describe("Portfolio Repayments Aggregation (lib/portfolio/repaymentsAggregate.js)", () => {
  const sampleRepayments = [
    {
      id: 1,
      sharia_contract_type: "murabaha",
      amount: 2000,
      status: "paid",
      due_date: "2026-04-01T00:00:00Z",
      paid_at: "2026-04-01T10:00:00Z",
    },
    {
      id: 2,
      sharia_contract_type: "murabaha",
      amount: 2000,
      status: "paid",
      due_date: "2026-07-01T00:00:00Z",
      paid_at: "2026-07-01T10:00:00Z",
    },
    {
      id: 3,
      sharia_contract_type: "murabaha",
      amount: 2000,
      status: "scheduled",
      due_date: "2026-10-01T00:00:00Z",
    },
    {
      id: 4,
      sharia_contract_type: "murabaha",
      amount: 102000,
      status: "scheduled",
      due_date: "2027-01-01T00:00:00Z",
    },
    {
      id: 5,
      sharia_contract_type: "murabaha",
      amount: 500,
      status: "failed",
      due_date: "2026-07-01T00:00:00Z",
    },
  ];

  const holdings = [{ id: 10, sharia_contract_type: "murabaha" }];

  test("buildRepaymentsSummary calculates received, remaining, and next payment", () => {
    const summary = buildRepaymentsSummary(sampleRepayments, [], holdings);

    assert.equal(summary.totalReceived, 4000);
    assert.equal(summary.remainingExpected, 104000); // 2000 + 102000
    assert.equal(summary.hasFixedContract, true);
    assert.equal(summary.nextPaymentInfo?.amount, 2000);
    assert.equal(summary.nextPaymentInfo?.formattedDate, "1 Oct 2026");
  });

  test("byMonthReceived aggregates paid amounts by UTC month (excludes failed/scheduled)", () => {
    const chart = byMonthReceived(sampleRepayments);

    assert.deepEqual(chart.labels, ["Apr 2026", "Jul 2026"]);
    assert.deepEqual(chart.data, [2000, 2000]);
    assert.equal(chart.total, 4000);
  });

  test("cumulativeReceivedVsExpected calculates running expected vs received", () => {
    const lineChart = cumulativeReceivedVsExpected(sampleRepayments);

    assert.equal(lineChart.hasFixedContract, true);
    assert.deepEqual(lineChart.labels, ["Apr 2026", "Jul 2026", "Oct 2026", "Jan 2027"]);
    // Expected running sum: 2000, 4000, 6000, 108000
    assert.deepEqual(lineChart.expectedData, [2000, 4000, 6000, 108000]);
    // Received running sum: 2000, 4000, 4000, 4000
    assert.deepEqual(lineChart.receivedData, [2000, 4000, 4000, 4000]);
  });

  test("Empty repayments state returns zeros and empty arrays", () => {
    const summary = buildRepaymentsSummary([], [], []);
    assert.equal(summary.totalReceived, 0);
    assert.equal(summary.remainingExpected, null);
    assert.equal(summary.nextPaymentInfo, null);
    assert.equal(summary.hasData, false);

    const bar = byMonthReceived([]);
    assert.deepEqual(bar.data, []);

    const line = cumulativeReceivedVsExpected([]);
    assert.equal(line.hasFixedContract, false);
  });
});
