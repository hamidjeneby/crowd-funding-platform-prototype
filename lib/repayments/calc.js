/**
 * FILE: lib/repayments/calc.js
 * PURPOSE:
 *   Pure repayment calculation engine for all four Sharia contract types
 *   (murabaha, ijara, mudarabah, spv_equity).
 *
 * CONSTRAINTS:
 *   - No DB queries, no network calls.
 *   - No "@/..." alias imports (usable in standard node:test runner).
 *   - Currency amounts rounded to 2 decimal places (half up).
 *   - Split amounts allocate rounding remainders to the LAST item/period.
 */

/**
 * Rounds a number to 2 decimal places using round half-up.
 * @param {number|string} value
 * @returns {number}
 */
export function round2(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Adds n months to a UTC date, clamping to the last valid day of the target month.
 * Example: 31 Jan + 1 month = 28/29 Feb.
 *
 * @param {string|Date|number} dateInput
 * @param {number} n - Number of months to add
 * @returns {Date}
 */
export function addMonths(dateInput, n) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date input: ${dateInput}`);
  }

  const monthsToAdd = Number(n) || 0;
  const currentYear = d.getUTCFullYear();
  const currentMonth = d.getUTCMonth(); // 0-indexed
  const currentDay = d.getUTCDate();
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const seconds = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();

  const totalMonths = currentMonth + monthsToAdd;
  const targetYear = currentYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  // Number of days in target month: day 0 of month (targetMonth + 1) in targetYear
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(currentDay, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay, hours, minutes, seconds, ms));
}

/**
 * Maps payment/reporting frequency string to number of months per period.
 *
 * @param {string} frequency - 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'at_maturity'
 * @param {number} [tenor] - Total tenor in months (used for 'at_maturity')
 * @returns {number}
 */
export function monthsPerPeriod(frequency, tenor = 12) {
  switch (frequency) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "semi_annual":
      return 6;
    case "annual":
      return 12;
    case "at_maturity":
      return Math.max(1, Number(tenor) || 12);
    default:
      return 3;
  }
}

/**
 * Splits an amount across N periods, putting rounding remainders into the last period.
 *
 * @param {number} totalAmount
 * @param {number} periodCount
 * @returns {number[]}
 */
export function splitAmountOverPeriods(totalAmount, periodCount) {
  const total = round2(totalAmount);
  const count = Math.max(1, Math.floor(periodCount));
  if (count === 1) return [total];

  const base = round2(Math.floor((total / count) * 100) / 100);
  const parts = [];
  let sumFirst = 0;

  for (let i = 0; i < count - 1; i++) {
    parts.push(base);
    sumFirst = round2(sumFirst + base);
  }

  const remainder = round2(total - sumFirst);
  parts.push(remainder);
  return parts;
}

/**
 * Distributes a pool amount across holdings proportionally by a key,
 * putting any rounding remainder into the last holding.
 *
 * @param {number} poolAmount
 * @param {Array<object>} holdings
 * @param {string} key - e.g. 'allocated_amount' or 'allocated_units'
 * @returns {number[]}
 */
export function distributeProRata(poolAmount, holdings, key = "allocated_amount") {
  const pool = round2(poolAmount);
  if (!holdings || holdings.length === 0 || pool === 0) {
    return (holdings || []).map(() => 0);
  }

  const totalWeight = holdings.reduce((sum, h) => sum + (Number(h[key]) || 0), 0);
  if (totalWeight <= 0) {
    return holdings.map(() => 0);
  }

  let distributed = 0;
  const result = [];

  for (let i = 0; i < holdings.length; i++) {
    if (i === holdings.length - 1) {
      // Last holding receives exact remaining pool
      result.push(round2(pool - distributed));
    } else {
      const weight = Number(holdings[i][key]) || 0;
      const share = round2((pool * weight) / totalWeight);
      result.push(share);
      distributed = round2(distributed + share);
    }
  }

  return result;
}

/**
 * Resolves contract terms object whether stored as JSON string or object.
 */
function resolveContractTerms(project) {
  if (!project?.contract_terms) return {};
  if (typeof project.contract_terms === "string") {
    try {
      return JSON.parse(project.contract_terms);
    } catch {
      return {};
    }
  }
  return project.contract_terms;
}

/**
 * Builds the static repayment schedule and period definitions for Murabaha and Ijara contracts.
 *
 * @param {object} project - Project object with contract terms, expected ROI, tenor
 * @param {Array<object>} holdings - Active/allocated pledges (each with id, investor_id, allocated_amount)
 * @param {string|Date} releasedAt - Timestamp when funds were released to issuer
 * @returns {{ periods: Array<object>, repayments: Array<object> }}
 */
export function buildSchedule(project, holdings = [], releasedAt = new Date()) {
  const contractType = project?.sharia_contract_type;
  if (contractType !== "murabaha" && contractType !== "ijara") {
    throw new Error(`buildSchedule only supports 'murabaha' and 'ijara', got '${contractType}'`);
  }

  const terms = resolveContractTerms(project);
  const tenorMonths = Number(project?.tenor_months || project?.tenure_months || terms?.tenor_months) || 12;
  const frequency = terms?.payment_frequency || "quarterly";
  const mPerPeriod = monthsPerPeriod(frequency, tenorMonths);
  const numPeriods = frequency === "at_maturity" ? 1 : Math.max(1, Math.floor(tenorMonths / mPerPeriod));

  const roiPercent = Number(
    project?.expected_roi_percent ??
    project?.expected_roi ??
    terms?.expected_roi_percent ??
    terms?.expected_roi ??
    0
  );

  const totalAllocated = holdings.reduce(
    (sum, h) => sum + (Number(h.allocated_amount) || 0),
    0
  );

  const periods = [];
  const repayments = [];

  // Generate period descriptors
  for (let k = 1; k <= numPeriods; k++) {
    const isFinal = k === numPeriods;
    const dueDate = addMonths(releasedAt, k * mPerPeriod);

    periods.push({
      period_no: k,
      period_number: k,
      kind: contractType === "ijara" ? "rent" : "profit",
      period_kind: contractType === "ijara" ? "rent" : "profit",
      due_date: dueDate.toISOString(),
      is_final: isFinal,
      status: "scheduled",
    });
  }

  // Precompute principal installment splits per holding for Murabaha 'with_instalments'
  const isMurabahaInstalments =
    contractType === "murabaha" && terms?.principal_repayment === "with_instalments";
  const principalSplitsByHolding = new Map();

  if (isMurabahaInstalments) {
    for (const holding of holdings) {
      const hId = holding.id ?? holding.pledge_id;
      const amount = Number(holding.allocated_amount) || 0;
      principalSplitsByHolding.set(hId, splitAmountOverPeriods(amount, numPeriods));
    }
  }

  // Generate holding repayments for each period
  for (let pIdx = 0; pIdx < periods.length; pIdx++) {
    const period = periods[pIdx];
    const isFinal = period.is_final;
    const k = period.period_number;

    for (const holding of holdings) {
      const hId = holding.id ?? holding.pledge_id;
      const allocatedAmount = Number(holding.allocated_amount) || 0;
      if (allocatedAmount <= 0) continue;

      if (contractType === "murabaha") {
        // 1. Murabaha Profit: flat on the original amount per period
        // profit = allocated_amount x expected_roi_percent/100 x monthsPerPeriod/12
        const profitAmount = round2(
          allocatedAmount * (roiPercent / 100) * (mPerPeriod / 12)
        );

        repayments.push({
          period_no: k,
          period_number: k,
          pledge_id: hId,
          investor_id: holding.investor_id,
          type: "profit",
          amount: profitAmount,
          due_date: period.due_date,
          status: "scheduled",
        });

        // 2. Murabaha Principal
        let principalAmount = 0;
        if (isMurabahaInstalments) {
          const splits = principalSplitsByHolding.get(hId) || [];
          principalAmount = splits[pIdx] || 0;
        } else {
          // 'at_maturity' - full amount only in final period
          if (isFinal) {
            principalAmount = round2(allocatedAmount);
          }
        }

        if (principalAmount > 0) {
          repayments.push({
            period_no: k,
            period_number: k,
            pledge_id: hId,
            investor_id: holding.investor_id,
            type: "principal",
            amount: principalAmount,
            due_date: period.due_date,
            status: "scheduled",
          });
        }
      } else if (contractType === "ijara") {
        // 1. Ijara Rent: rent = allocated_amount x expected_roi_percent/100 x monthsPerPeriod/12
        const rentAmount = round2(
          allocatedAmount * (roiPercent / 100) * (mPerPeriod / 12)
        );

        repayments.push({
          period_no: k,
          period_number: k,
          pledge_id: hId,
          investor_id: holding.investor_id,
          type: "rent",
          amount: rentAmount,
          due_date: period.due_date,
          status: "scheduled",
        });

        // 2. Ijara End of Term (final period only)
        if (isFinal) {
          const endOfTerm = terms?.end_of_term || "sale_to_issuer";
          if (endOfTerm === "sale_to_issuer") {
            const endPrice = Number(terms?.end_of_term_price) || 0;
            // sale_proceeds = end_of_term_price x allocated_amount / total allocated
            const proceedsShare = totalAllocated > 0
              ? round2((endPrice * allocatedAmount) / totalAllocated)
              : 0;

            repayments.push({
              period_no: k,
              period_number: k,
              pledge_id: hId,
              investor_id: holding.investor_id,
              type: "sale_proceeds",
              amount: proceedsShare,
              due_date: period.due_date,
              status: "scheduled",
            });
          }
          // Note: for 'sale_to_third_party', sale_proceeds is generated upon issuer reporting.
          // For 'return_asset', rent only (no cash line).
        }
      }
    }
  }

  return { periods, repayments };
}

/**
 * Calculates payout rows for a reported Mudarabah period.
 *
 * @param {object} period - Period descriptor (period_number, reported_amount, is_final, etc.)
 * @param {Array<object>} holdings - Active holdings
 * @param {object} project - Project with contract terms
 * @param {number} [totalAllocatedAmount] - Precomputed total allocated capital
 * @param {number} [capitalReturnPercent=100] - Capital return % on final period (0 to 100)
 * @returns {Array<object>} Array of repayment line items
 */
export function mudarabahPayout(
  period,
  holdings = [],
  project = {},
  totalAllocatedAmount = null,
  capitalReturnPercent = 100
) {
  const terms = resolveContractTerms(project);
  const investorSharePercent = Number(
    terms?.investor_profit_share_percent ??
    project?.investor_profit_share_percent ??
    70
  );

  const reportedAmount = Number(period?.reported_amount) || 0;
  const isFinal = Boolean(period?.is_final);
  const periodNumber = period?.period_number ?? period?.id;
  const dueDate = period?.due_date || new Date().toISOString();

  const totalAllocated = totalAllocatedAmount != null
    ? Number(totalAllocatedAmount)
    : holdings.reduce((sum, h) => sum + (Number(h.allocated_amount) || 0), 0);

  // If reported profit is 0 or negative, pool is 0
  const investorPool = reportedAmount > 0
    ? round2(reportedAmount * (investorSharePercent / 100))
    : 0;

  const result = [];

  // 1. Distribute profit pool pro-rata by allocated_amount
  if (investorPool > 0 && holdings.length > 0 && totalAllocated > 0) {
    const profitSplits = distributeProRata(investorPool, holdings, "allocated_amount");
    for (let i = 0; i < holdings.length; i++) {
      const h = holdings[i];
      const hId = h.id ?? h.pledge_id;
      const profit = profitSplits[i];
      if (profit > 0) {
        result.push({
          period_no: Number(period?.period_no ?? periodNumber),
          period_number: periodNumber,
          pledge_id: hId,
          investor_id: h.investor_id,
          type: "profit",
          amount: profit,
          due_date: dueDate,
          status: "pending_payment",
        });
      }
    }
  }

  // 2. Final period: capital return
  if (isFinal && holdings.length > 0) {
    const effectiveCapReturnPct = Number(
      period?.capital_return_percent ?? capitalReturnPercent ?? 100
    );

    for (const h of holdings) {
      const hId = h.id ?? h.pledge_id;
      const alloc = Number(h.allocated_amount) || 0;
      const returnAmount = round2(alloc * (effectiveCapReturnPct / 100));
      if (returnAmount > 0) {
        result.push({
          period_no: Number(period?.period_no ?? periodNumber),
          period_number: periodNumber,
          pledge_id: hId,
          investor_id: h.investor_id,
          type: "capital_return",
          amount: returnAmount,
          due_date: dueDate,
          status: "pending_payment",
        });
      }
    }
  }

  return result;
}

/**
 * Calculates payout rows for an SPV Equity period (dividend or exit event).
 *
 * @param {object} period - Period descriptor (period_number, reported_amount, period_kind: 'dividend'|'exit')
 * @param {Array<object>} holdings - Active holdings with allocated_units
 * @returns {Array<object>} Array of repayment line items
 */
export function equityPayout(period, holdings = []) {
  const reportedAmount = Number(period?.reported_amount) || 0;
  const periodNumber = period?.period_number ?? period?.period_no ?? period?.id;
  const dueDate = period?.due_date || new Date().toISOString();
  const kind = period?.kind ?? period?.period_kind;
  const repaymentType = kind === "exit" ? "sale_proceeds" : "dividend";

  if (reportedAmount <= 0 || holdings.length === 0) {
    return [];
  }

  const splits = distributeProRata(reportedAmount, holdings, "allocated_units");
  const result = [];

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const hId = h.id ?? h.pledge_id;
    const amount = splits[i];
    if (amount > 0) {
      result.push({
        period_no: Number(period?.period_no ?? periodNumber),
        period_number: periodNumber,
        pledge_id: hId,
        investor_id: h.investor_id,
        type: repaymentType,
        amount: amount,
        due_date: dueDate,
        status: "pending_payment",
      });
    }
  }

  return result;
}

/**
 * Calculates payout rows for an Ijara sale_to_third_party final period once proceeds are reported.
 *
 * @param {object} period - Final period descriptor with reported_amount
 * @param {Array<object>} holdings - Active holdings
 * @param {number} [totalAllocatedAmount]
 * @returns {Array<object>}
 */
export function ijaraThirdPartyPayout(period, holdings = [], totalAllocatedAmount = null) {
  const reportedAmount = Number(period?.reported_amount) || 0;
  const periodNumber = period?.period_number ?? period?.id;
  const dueDate = period?.due_date || new Date().toISOString();

  if (reportedAmount <= 0 || holdings.length === 0) {
    return [];
  }

  const splits = distributeProRata(reportedAmount, holdings, "allocated_amount");
  const result = [];

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const hId = h.id ?? h.pledge_id;
    const amount = splits[i];
    if (amount > 0) {
      result.push({
        period_number: periodNumber,
        pledge_id: hId,
        investor_id: h.investor_id,
        type: "sale_proceeds",
        amount: amount,
        due_date: dueDate,
        status: "pending_payment",
      });
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// UI Pure Aggregation Helpers
// -----------------------------------------------------------------------------

/**
 * Returns the total money received to date from completed/paid repayments.
 * Failed and scheduled repayments are strictly excluded.
 *
 * @param {Array<object>} repayments
 * @returns {number}
 */
export function receivedToDate(repayments = []) {
  if (!Array.isArray(repayments)) return 0;
  return round2(
    repayments
      .filter((r) => r && r.status === "paid")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  );
}

/**
 * Returns the expected remaining repayments for fixed contract types (Murabaha & Ijara).
 * Only includes scheduled / unpaid rows; paid or failed rows are excluded.
 *
 * @param {Array<object>} repayments
 * @returns {number}
 */
export function expectedRemaining(repayments = []) {
  if (!Array.isArray(repayments)) return 0;
  return round2(
    repayments
      .filter((r) => r && (r.status === "scheduled" || r.status === "pending_payment" || r.status === "unpaid"))
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  );
}

/**
 * Determines the next scheduled payment or upcoming profit reporting event.
 *
 * @param {Array<object>} periods - All project payout periods
 * @param {Array<object>} repayments - Investor repayments (optional for report-only types)
 * @returns {object|null} { dueDate: string, amount: number|null, periodNumber: number, isReportDue: boolean }
 */
export function nextPayment(periods = [], repayments = []) {
  if (!Array.isArray(periods) || periods.length === 0) return null;

  // Sort periods by due_date ascending
  const sortedPeriods = [...periods].sort(
    (a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0)
  );

  const unpaidPeriod = sortedPeriods.find((p) => p.status !== "paid");
  if (!unpaidPeriod) return null;

  const periodNumber = unpaidPeriod.period_number ?? unpaidPeriod.id;

  // Check if this investor has scheduled repayments for this period
  const matchingRepayments = (repayments || []).filter(
    (r) =>
      (r.period_number === periodNumber || r.payout_period_id === unpaidPeriod.id) &&
      r.status !== "paid"
  );

  const amount = matchingRepayments.length > 0
    ? round2(matchingRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0))
    : null;

  return {
    periodNumber,
    dueDate: unpaidPeriod.due_date,
    amount,
    isReportDue: unpaidPeriod.period_kind === "profit_share" || unpaidPeriod.status === "pending_report",
  };
}
