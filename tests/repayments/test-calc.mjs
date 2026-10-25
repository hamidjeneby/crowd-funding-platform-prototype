import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  round2,
  addMonths,
  monthsPerPeriod,
  splitAmountOverPeriods,
  distributeProRata,
  buildSchedule,
  mudarabahPayout,
  equityPayout,
  ijaraThirdPartyPayout,
  receivedToDate,
  expectedRemaining,
  nextPayment,
} from "../../lib/repayments/calc.js";

describe("Pure Repayment Calculation Engine (lib/repayments/calc.js)", () => {
  describe("1. UTC Date & Month Clamping (addMonths)", () => {
    test("Clamps 31 Jan to 28 Feb in non-leap year (2026)", () => {
      const d = addMonths("2026-01-31T12:00:00Z", 1);
      assert.equal(d.getUTCFullYear(), 2026);
      assert.equal(d.getUTCMonth(), 1); // Feb
      assert.equal(d.getUTCDate(), 28);
      assert.equal(d.getUTCHours(), 12);
    });

    test("Clamps 31 Jan to 29 Feb in leap year (2028)", () => {
      const d = addMonths("2028-01-31T15:30:00Z", 1);
      assert.equal(d.getUTCFullYear(), 2028);
      assert.equal(d.getUTCMonth(), 1); // Feb
      assert.equal(d.getUTCDate(), 29);
      assert.equal(d.getUTCHours(), 15);
    });

    test("Clamps 31 May to 30 June", () => {
      const d = addMonths("2026-05-31T00:00:00Z", 1);
      assert.equal(d.getUTCMonth(), 5); // June
      assert.equal(d.getUTCDate(), 30);
    });

    test("Clamps 31 Aug to 30 Sept", () => {
      const d = addMonths("2026-08-31T08:00:00Z", 1);
      assert.equal(d.getUTCMonth(), 8); // Sept
      assert.equal(d.getUTCDate(), 30);
    });

    test("Regular addition when month has enough days (31 Jan + 2 months = 31 Mar)", () => {
      const d = addMonths("2026-01-31T00:00:00Z", 2);
      assert.equal(d.getUTCMonth(), 2); // March
      assert.equal(d.getUTCDate(), 31);
    });
  });

  describe("2. Rounding & Remainder Allocation", () => {
    test("splitAmountOverPeriods puts rounding remainder in the last period", () => {
      const splits = splitAmountOverPeriods(100, 3);
      assert.deepEqual(splits, [33.33, 33.33, 33.34]);
      assert.equal(round2(splits.reduce((a, b) => a + b, 0)), 100);
    });

    test("distributeProRata puts rounding remainder in the last holding", () => {
      const holdings = [
        { id: 1, allocated_amount: 10 },
        { id: 2, allocated_amount: 10 },
        { id: 3, allocated_amount: 10 },
      ];
      const splits = distributeProRata(100, holdings, "allocated_amount");
      assert.deepEqual(splits, [33.33, 33.33, 33.34]);
      assert.equal(round2(splits.reduce((a, b) => a + b, 0)), 100);
    });
  });

  describe("3. Block 1: Murabaha (ROI 8%, Principal at Maturity & Instalments)", () => {
    const holdings = [
      { id: 1, investor_id: 101, allocated_amount: 100000 },
      { id: 2, investor_id: 102, allocated_amount: 50000 },
      { id: 3, investor_id: 103, allocated_amount: 10000 },
    ];

    test("Murabaha at_maturity: 4 quarterly periods, profit 3,200/period, principal in period 4", () => {
      const project = {
        sharia_contract_type: "murabaha",
        expected_roi_percent: 8,
        tenor_months: 12,
        contract_terms: {
          payment_frequency: "quarterly",
          principal_repayment: "at_maturity",
        },
      };

      const { periods, repayments } = buildSchedule(project, holdings, "2026-01-01T00:00:00Z");

      assert.equal(periods.length, 4);
      assert.equal(periods[3].is_final, true);

      // Check period 1 profit
      const p1Rows = repayments.filter((r) => r.period_number === 1);
      assert.equal(p1Rows.length, 3); // profit only for A, B, C
      assert.equal(p1Rows.find((r) => r.pledge_id === 1).amount, 2000);
      assert.equal(p1Rows.find((r) => r.pledge_id === 2).amount, 1000);
      assert.equal(p1Rows.find((r) => r.pledge_id === 3).amount, 200);
      assert.equal(round2(p1Rows.reduce((s, r) => s + r.amount, 0)), 3200);

      // Check periods 2 and 3 profit
      for (const k of [2, 3]) {
        const pkRows = repayments.filter((r) => r.period_number === k);
        assert.equal(round2(pkRows.reduce((s, r) => s + r.amount, 0)), 3200);
      }

      // Check period 4: profit (3,200) + principal (160,000) = 163,200
      const p4Rows = repayments.filter((r) => r.period_number === 4);
      assert.equal(p4Rows.length, 6); // 3 profit + 3 principal
      const p4Total = round2(p4Rows.reduce((s, r) => s + r.amount, 0));
      assert.equal(p4Total, 163200);

      // Verify total payouts per holding
      const totalA = round2(repayments.filter((r) => r.pledge_id === 1).reduce((s, r) => s + r.amount, 0));
      const totalB = round2(repayments.filter((r) => r.pledge_id === 2).reduce((s, r) => s + r.amount, 0));
      const totalC = round2(repayments.filter((r) => r.pledge_id === 3).reduce((s, r) => s + r.amount, 0));

      assert.equal(totalA, 108000);
      assert.equal(totalB, 54000);
      assert.equal(totalC, 10800);
    });

    test("Murabaha with_instalments: each period total 43,200, same final totals", () => {
      const project = {
        sharia_contract_type: "murabaha",
        expected_roi_percent: 8,
        tenor_months: 12,
        contract_terms: {
          payment_frequency: "quarterly",
          principal_repayment: "with_instalments",
        },
      };

      const { periods, repayments } = buildSchedule(project, holdings, "2026-01-01T00:00:00Z");

      assert.equal(periods.length, 4);

      for (let k = 1; k <= 4; k++) {
        const pkRows = repayments.filter((r) => r.period_number === k);
        const pkTotal = round2(pkRows.reduce((s, r) => s + r.amount, 0));
        assert.equal(pkTotal, 43200);
      }

      const totalA = round2(repayments.filter((r) => r.pledge_id === 1).reduce((s, r) => s + r.amount, 0));
      const totalB = round2(repayments.filter((r) => r.pledge_id === 2).reduce((s, r) => s + r.amount, 0));
      const totalC = round2(repayments.filter((r) => r.pledge_id === 3).reduce((s, r) => s + r.amount, 0));

      assert.equal(totalA, 108000);
      assert.equal(totalB, 54000);
      assert.equal(totalC, 10800);
    });
  });

  describe("4. Block 2: Ijara (Yield 6%, sale_to_issuer, sale_to_third_party, return_asset)", () => {
    const holdings = [
      { id: 1, investor_id: 101, allocated_amount: 100000 },
      { id: 2, investor_id: 102, allocated_amount: 50000 },
      { id: 3, investor_id: 103, allocated_amount: 10000 },
    ];

    test("Ijara sale_to_issuer: 4 periods rent (2,400 each), final period adds sale proceeds 176,000", () => {
      const project = {
        sharia_contract_type: "ijara",
        expected_roi_percent: 6,
        tenor_months: 12,
        contract_terms: {
          payment_frequency: "quarterly",
          end_of_term: "sale_to_issuer",
          end_of_term_price: 176000,
        },
      };

      const { periods, repayments } = buildSchedule(project, holdings, "2026-01-01T00:00:00Z");

      assert.equal(periods.length, 4);

      // Rent per period: A=1,500, B=750, C=150 (total 2,400)
      for (let k = 1; k <= 3; k++) {
        const pkRows = repayments.filter((r) => r.period_number === k);
        assert.equal(pkRows.length, 3);
        assert.equal(pkRows.find((r) => r.pledge_id === 1).amount, 1500);
        assert.equal(pkRows.find((r) => r.pledge_id === 2).amount, 750);
        assert.equal(pkRows.find((r) => r.pledge_id === 3).amount, 150);
      }

      // Period 4 has rent + sale_proceeds
      const p4SaleRows = repayments.filter((r) => r.period_number === 4 && r.type === "sale_proceeds");
      assert.equal(p4SaleRows.length, 3);
      assert.equal(p4SaleRows.find((r) => r.pledge_id === 1).amount, 110000);
      assert.equal(p4SaleRows.find((r) => r.pledge_id === 2).amount, 55000);
      assert.equal(p4SaleRows.find((r) => r.pledge_id === 3).amount, 11000);

      // Final totals: A=116,000, B=58,000, C=11,600
      const totalA = round2(repayments.filter((r) => r.pledge_id === 1).reduce((s, r) => s + r.amount, 0));
      const totalB = round2(repayments.filter((r) => r.pledge_id === 2).reduce((s, r) => s + r.amount, 0));
      const totalC = round2(repayments.filter((r) => r.pledge_id === 3).reduce((s, r) => s + r.amount, 0));

      assert.equal(totalA, 116000);
      assert.equal(totalB, 58000);
      assert.equal(totalC, 11600);
    });

    test("Ijara sale_to_third_party: no proceeds until reported, then distributed pro-rata", () => {
      const project = {
        sharia_contract_type: "ijara",
        expected_roi_percent: 6,
        tenor_months: 12,
        contract_terms: {
          payment_frequency: "quarterly",
          end_of_term: "sale_to_third_party",
        },
      };

      const { repayments } = buildSchedule(project, holdings, "2026-01-01T00:00:00Z");
      // Initially no sale_proceeds scheduled
      assert.equal(repayments.filter((r) => r.type === "sale_proceeds").length, 0);

      // When proceeds are reported (e.g. 176,000)
      const period = { id: 4, period_number: 4, is_final: true, reported_amount: 176000 };
      const proceeds = ijaraThirdPartyPayout(period, holdings, 160000);
      assert.equal(proceeds.find((r) => r.pledge_id === 1).amount, 110000);
      assert.equal(proceeds.find((r) => r.pledge_id === 2).amount, 55000);
      assert.equal(proceeds.find((r) => r.pledge_id === 3).amount, 11000);
    });

    test("Ijara return_asset: rent only, no cash line at end of term", () => {
      const project = {
        sharia_contract_type: "ijara",
        expected_roi_percent: 6,
        tenor_months: 12,
        contract_terms: {
          payment_frequency: "quarterly",
          end_of_term: "return_asset",
        },
      };

      const { repayments } = buildSchedule(project, holdings, "2026-01-01T00:00:00Z");
      assert.equal(repayments.filter((r) => r.type === "sale_proceeds").length, 0);
      assert.equal(repayments.every((r) => r.type === "rent"), true);
    });
  });

  describe("5. Block 3: Mudarabah (Investor Share 70%)", () => {
    const holdings = [
      { id: 1, investor_id: 101, allocated_amount: 100000 },
      { id: 2, investor_id: 102, allocated_amount: 50000 },
      { id: 3, investor_id: 103, allocated_amount: 10000 },
    ];
    const project = {
      sharia_contract_type: "mudarabah",
      investor_profit_share_percent: 70,
    };

    test("Period 1: Reported 40,000 -> Pool 28,000 (A 17,500, B 8,750, C 1,750)", () => {
      const period = { period_number: 1, reported_amount: 40000, is_final: false };
      const payouts = mudarabahPayout(period, holdings, project, 160000);

      assert.equal(payouts.find((p) => p.pledge_id === 1).amount, 17500);
      assert.equal(payouts.find((p) => p.pledge_id === 2).amount, 8750);
      assert.equal(payouts.find((p) => p.pledge_id === 3).amount, 1750);
      assert.equal(round2(payouts.reduce((s, p) => s + p.amount, 0)), 28000);
    });

    test("Period 2: Reported 0 -> Pool 0, empty rows", () => {
      const period = { period_number: 2, reported_amount: 0, is_final: false };
      const payouts = mudarabahPayout(period, holdings, project, 160000);
      assert.equal(payouts.length, 0);
    });

    test("Period 3: Reported 8,000 -> Pool 5,600 (A 3,500, B 1,750, C 350)", () => {
      const period = { period_number: 3, reported_amount: 8000, is_final: false };
      const payouts = mudarabahPayout(period, holdings, project, 160000);

      assert.equal(payouts.find((p) => p.pledge_id === 1).amount, 3500);
      assert.equal(payouts.find((p) => p.pledge_id === 2).amount, 1750);
      assert.equal(payouts.find((p) => p.pledge_id === 3).amount, 350);
      assert.equal(round2(payouts.reduce((s, p) => s + p.amount, 0)), 5600);
    });

    test("Period 4 (final): Reported 16,000 + 100% Capital Return", () => {
      const period = {
        period_number: 4,
        reported_amount: 16000,
        is_final: true,
        capital_return_percent: 100,
      };
      const payouts = mudarabahPayout(period, holdings, project, 160000);

      const profitRows = payouts.filter((p) => p.type === "profit");
      const capRows = payouts.filter((p) => p.type === "capital_return");

      assert.equal(profitRows.find((p) => p.pledge_id === 1).amount, 7000);
      assert.equal(profitRows.find((p) => p.pledge_id === 2).amount, 3500);
      assert.equal(profitRows.find((p) => p.pledge_id === 3).amount, 700);

      assert.equal(capRows.find((p) => p.pledge_id === 1).amount, 100000);
      assert.equal(capRows.find((p) => p.pledge_id === 2).amount, 50000);
      assert.equal(capRows.find((p) => p.pledge_id === 3).amount, 10000);
    });

    test("Period 4 Loss Variant: Capital return at 80%", () => {
      const period = {
        period_number: 4,
        reported_amount: 16000,
        is_final: true,
        capital_return_percent: 80,
      };
      const payouts = mudarabahPayout(period, holdings, project, 160000);
      const capRows = payouts.filter((p) => p.type === "capital_return");

      assert.equal(capRows.find((p) => p.pledge_id === 1).amount, 80000);
      assert.equal(capRows.find((p) => p.pledge_id === 2).amount, 40000);
      assert.equal(capRows.find((p) => p.pledge_id === 3).amount, 8000);
    });
  });

  describe("6. Block 4: SPV Equity Payouts (Dividends & Exit)", () => {
    const holdings = [
      { id: 1, investor_id: 101, allocated_units: 1000 },
      { id: 2, investor_id: 102, allocated_units: 500 },
      { id: 3, investor_id: 103, allocated_units: 100 },
    ]; // Total = 1600 units

    test("Declare dividend 16,000: A 10,000, B 5,000, C 1,000", () => {
      const period = { period_number: 1, period_kind: "dividend", reported_amount: 16000 };
      const payouts = equityPayout(period, holdings);

      assert.equal(payouts.find((p) => p.pledge_id === 1).amount, 10000);
      assert.equal(payouts.find((p) => p.pledge_id === 2).amount, 5000);
      assert.equal(payouts.find((p) => p.pledge_id === 3).amount, 1000);
      assert.equal(payouts.every((p) => p.type === "dividend"), true);
    });

    test("Declare dividend 1,000: A 625.00, B 312.50, C 62.50", () => {
      const period = { period_number: 2, period_kind: "dividend", reported_amount: 1000 };
      const payouts = equityPayout(period, holdings);

      assert.equal(payouts.find((p) => p.pledge_id === 1).amount, 625);
      assert.equal(payouts.find((p) => p.pledge_id === 2).amount, 312.5);
      assert.equal(payouts.find((p) => p.pledge_id === 3).amount, 62.5);
    });

    test("Record exit 320,000: A 200,000, B 100,000, C 20,000 with type 'sale_proceeds'", () => {
      const period = { period_number: 3, period_kind: "exit", reported_amount: 320000 };
      const payouts = equityPayout(period, holdings);

      assert.equal(payouts.find((p) => p.pledge_id === 1).amount, 200000);
      assert.equal(payouts.find((p) => p.pledge_id === 2).amount, 100000);
      assert.equal(payouts.find((p) => p.pledge_id === 3).amount, 20000);
      assert.equal(payouts.every((p) => p.type === "sale_proceeds"), true);
    });
  });

  describe("7. UI Pure Aggregation Helpers", () => {
    const sampleRepayments = [
      { id: 1, period_number: 1, amount: 2000, status: "paid" },
      { id: 2, period_number: 1, amount: 1000, status: "paid" },
      { id: 3, period_number: 2, amount: 2000, status: "scheduled" },
      { id: 4, period_number: 2, amount: 1000, status: "scheduled" },
      { id: 5, period_number: 3, amount: 500, status: "failed" },
    ];

    test("receivedToDate sums only status='paid'", () => {
      assert.equal(receivedToDate(sampleRepayments), 3000);
    });

    test("expectedRemaining sums scheduled/unpaid (excludes paid & failed)", () => {
      assert.equal(expectedRemaining(sampleRepayments), 3000);
    });

    test("nextPayment identifies the next unpaid period", () => {
      const periods = [
        { id: 1, period_number: 1, due_date: "2026-04-01T00:00:00Z", status: "paid" },
        { id: 2, period_number: 2, due_date: "2026-07-01T00:00:00Z", status: "scheduled" },
        { id: 3, period_number: 3, due_date: "2026-10-01T00:00:00Z", status: "scheduled" },
      ];

      const next = nextPayment(periods, sampleRepayments);
      assert.equal(next.periodNumber, 2);
      assert.equal(next.dueDate, "2026-07-01T00:00:00Z");
      assert.equal(next.amount, 3000);
    });
  });
});
