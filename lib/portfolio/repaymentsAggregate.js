/**
 * FILE: lib/portfolio/repaymentsAggregate.js
 * PURPOSE:
 *   Pure aggregation functions for investor portfolio repayments panel:
 *     - Summary strip (Received to date, Expected remaining, Next payment)
 *     - Monthly received timeline (Bar chart)
 *     - Cumulative received vs expected timeline (Line chart for fixed contracts)
 */

import { round2, receivedToDate, expectedRemaining } from "../repayments/calc.js";

/**
 * Formats a UTC date string into standard "YYYY-MM" or "DD MMM YYYY".
 */
export function formatMonthYearUtc(dateString) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return "";
  }
}

export function formatShortDateUtc(dateString) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return "";
  }
}

/**
 * Builds the top-level summary metrics for the investor portfolio repayments panel.
 *
 * @param {Array<object>} repayments - Investor's repayment rows
 * @param {Array<object>} periods - Payout periods for projects the investor holds
 * @param {Array<object>} holdings - Active/completed holdings for context
 * @returns {object}
 */
export function buildRepaymentsSummary(repayments = [], periods = [], holdings = []) {
  const totalReceived = receivedToDate(repayments);

  // Check if investor holds any fixed-income contracts (murabaha or ijara)
  const hasFixedContract = (holdings || []).some((h) => {
    const cType = h.project?.sharia_contract_type || h.sharia_contract_type;
    return cType === "murabaha" || cType === "ijara";
  });

  const hasMudarabah = (holdings || []).some((h) => {
    const cType = h.project?.sharia_contract_type || h.sharia_contract_type;
    return cType === "mudarabah";
  });

  // Expected remaining is only calculated for fixed types (murabaha, ijara)
  const remainingExpected = hasFixedContract
    ? expectedRemaining(
        repayments.filter((r) => {
          const cType = r.project?.sharia_contract_type || r.sharia_contract_type;
          return cType === "murabaha" || cType === "ijara";
        })
      )
    : null;

  // Determine next payment / event
  let nextPaymentInfo = null;

  // 1. Look for next scheduled fixed repayment
  const scheduledFixed = (repayments || [])
    .filter((r) => (r.status === "scheduled" || r.status === "unpaid") && r.amount > 0)
    .sort((a, b) => new Date(a.due_date || a.payout_periods?.due_date || 0) - new Date(b.due_date || b.payout_periods?.due_date || 0))[0];

  if (scheduledFixed) {
    const dDate = scheduledFixed.due_date || scheduledFixed.payout_periods?.due_date;
    nextPaymentInfo = {
      type: "fixed_payment",
      dueDate: dDate,
      formattedDate: formatShortDateUtc(dDate),
      amount: Number(scheduledFixed.amount),
      displayText: `${formatShortDateUtc(dDate)}`,
    };
  } else if (hasMudarabah) {
    // 2. Look for next mudarabah report due date
    const nextMudarabahPeriod = (periods || [])
      .filter((p) => p.kind === "profit_share" && p.status !== "paid")
      .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))[0];

    if (nextMudarabahPeriod) {
      nextPaymentInfo = {
        type: "profit_report",
        dueDate: nextMudarabahPeriod.due_date,
        formattedDate: formatShortDateUtc(nextMudarabahPeriod.due_date),
        amount: null,
        displayText: `Next profit report due ${formatShortDateUtc(nextMudarabahPeriod.due_date)}`,
      };
    }
  }

  const hasAnyPayments = (repayments || []).some((r) => r.status === "paid");
  const hasAnyScheduled = (repayments || []).some((r) => r.status === "scheduled" || r.status === "unpaid");

  return {
    totalReceived,
    remainingExpected,
    hasFixedContract,
    nextPaymentInfo,
    hasData: hasAnyPayments || hasAnyScheduled,
    countPaid: (repayments || []).filter((r) => r.status === "paid").length,
  };
}

/**
 * Aggregates paid repayments into monthly totals (UTC) for the bar chart.
 * Failed and scheduled rows are strictly excluded.
 *
 * @param {Array<object>} repayments
 * @returns {object} { labels, data, total, items }
 */
export function byMonthReceived(repayments = []) {
  const paidRows = (repayments || []).filter(
    (r) => r && r.status === "paid" && (r.paid_at || r.due_date)
  );

  if (paidRows.length === 0) {
    return { labels: [], data: [], total: 0, items: [] };
  }

  const monthlyTotals = new Map();

  for (const r of paidRows) {
    const rawDate = r.paid_at || r.due_date;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) continue;

    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const key = `${y}-${m}`;

    const amt = Number(r.amount) || 0;
    monthlyTotals.set(key, round2((monthlyTotals.get(key) || 0) + amt));
  }

  const sortedKeys = Array.from(monthlyTotals.keys()).sort();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const items = sortedKeys.map((key) => {
    const [y, m] = key.split("-");
    const label = `${months[parseInt(m, 10) - 1]} ${y}`;
    const amount = monthlyTotals.get(key);
    return { key, label, amount };
  });

  const total = round2(items.reduce((s, it) => s + it.amount, 0));

  return {
    labels: items.map((it) => it.label),
    data: items.map((it) => it.amount),
    total,
    items,
  };
}

/**
 * Aggregates cumulative received vs cumulative expected repayments over time
 * for fixed contracts (Murabaha and Ijara).
 *
 * @param {Array<object>} repayments
 * @returns {object} { labels, expectedData, receivedData, hasFixedContract }
 */
export function cumulativeReceivedVsExpected(repayments = []) {
  const fixedRows = (repayments || []).filter((r) => {
    const cType = r.project?.sharia_contract_type || r.sharia_contract_type;
    return (
      (cType === "murabaha" || cType === "ijara") &&
      (r.status === "paid" || r.status === "scheduled" || r.status === "unpaid")
    );
  });

  if (fixedRows.length === 0) {
    return {
      labels: [],
      expectedData: [],
      receivedData: [],
      hasFixedContract: false,
    };
  }

  // Collect all relevant monthly buckets (UTC)
  const monthSet = new Set();
  for (const r of fixedRows) {
    const dDate = r.due_date || r.paid_at;
    if (!dDate) continue;
    const d = new Date(dDate);
    if (!isNaN(d.getTime())) {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthSet.add(key);
    }
  }

  const sortedMonths = Array.from(monthSet).sort();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let cumExpected = 0;
  let cumReceived = 0;
  const labels = [];
  const expectedData = [];
  const receivedData = [];

  for (const mKey of sortedMonths) {
    const [y, m] = mKey.split("-");
    labels.push(`${months[parseInt(m, 10) - 1]} ${y}`);

    // Add expected for this month
    const thisMonthRows = fixedRows.filter((r) => {
      const dDate = r.due_date || r.paid_at;
      if (!dDate) return false;
      const d = new Date(dDate);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      return key === mKey;
    });

    for (const r of thisMonthRows) {
      cumExpected = round2(cumExpected + (Number(r.amount) || 0));
      if (r.status === "paid") {
        cumReceived = round2(cumReceived + (Number(r.amount) || 0));
      }
    }

    expectedData.push(cumExpected);
    receivedData.push(cumReceived);
  }

  return {
    labels,
    expectedData,
    receivedData,
    hasFixedContract: true,
  };
}
