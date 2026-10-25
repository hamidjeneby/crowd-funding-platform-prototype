/**
 * FILE: lib/portfolio/aggregate.js
 * PURPOSE:
 *   Pure portfolio aggregation functions for the Investor Portfolio page.
 *   Contains NO database access and NO '@/' alias imports.
 *
 * STATUS DEFINITIONS:
 *   - Holdings: status in ['allocated', 'active', 'completed']. Capital invested
 *     is measured by `allocated_amount` (may be less than `pledged_amount` on partial fills).
 *   - Pending: status === 'pending'. Appears only in "Awaiting allocation".
 *   - Inactive: status in ['cancelled', 'refunded', 'rejected_oversubscribed']. Excluded
 *     from all totals and charts (refunded & rejected_oversubscribed appear only in Outcomes).
 */

export const HOLDING_STATUSES = Object.freeze(["allocated", "active", "completed"]);
export const PENDING_STATUSES = Object.freeze(["pending"]);
export const OUTCOME_COUNTED_STATUSES = Object.freeze([
  "allocated",
  "active",
  "completed",
  "rejected_oversubscribed",
  "refunded",
]);

/**
 * Normalizes a status string to lowercase trimmed format.
 */
function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

/**
 * Checks whether a pledge record qualifies as an active holding.
 */
export function isHolding(pledge) {
  if (!pledge) return false;
  return HOLDING_STATUSES.includes(normalizeStatus(pledge.status));
}

/**
 * Checks whether a pledge record is currently pending campaign close.
 */
export function isPending(pledge) {
  if (!pledge) return false;
  return PENDING_STATUSES.includes(normalizeStatus(pledge.status));
}

/**
 * Formats a number to 1 decimal place percentage, or 0 if invalid.
 */
export function formatOneDecimal(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 10) / 10;
}

/**
 * Standardizes Sharia contract type labels for display.
 */
export function formatContractTypeLabel(rawType) {
  const t = String(rawType || "").trim().toLowerCase();
  switch (t) {
    case "murabaha":
      return "Murabaha";
    case "ijara":
      return "Ijara";
    case "mudarabah":
      return "Mudarabah";
    case "spv_equity":
      return "SPV Equity";
    case "musharakah":
      return "Musharakah";
    case "istisna":
      return "Istisna";
    case "sukuk":
      return "Sukuk";
    default:
      if (!t) return "Other";
      return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ");
  }
}

/**
 * Builds the top summary strip metrics:
 *   1. Total invested: sum of allocated_amount over holdings.
 *   2. Awaiting allocation: sum of pledged_amount over pending pledges.
 *   3. Holdings: count of holdings.
 *   4. Largest holding: share of total invested as a percentage (shows concentration).
 *
 * Handles single or multiple currencies safely without mixed addition.
 */
export function buildSummary(pledges = []) {
  const safePledges = Array.isArray(pledges) ? pledges : [];

  let totalInvested = 0;
  let awaitingAllocation = 0;
  let holdingsCount = 0;
  let pendingCount = 0;
  let maxHoldingAmount = 0;

  const currenciesSeen = new Set();
  const byCurrency = {};

  for (const p of safePledges) {
    if (!p) continue;
    const st = normalizeStatus(p.status);
    const curr = String(p.projects?.currency || p.currency || "AED").toUpperCase();
    currenciesSeen.add(curr);

    if (!byCurrency[curr]) {
      byCurrency[curr] = {
        totalInvested: 0,
        awaitingAllocation: 0,
        holdingsCount: 0,
        pendingCount: 0,
        maxHoldingAmount: 0,
      };
    }

    if (HOLDING_STATUSES.includes(st)) {
      const allocated = Number(p.allocated_amount ?? 0);
      totalInvested += allocated;
      holdingsCount += 1;
      if (allocated > maxHoldingAmount) {
        maxHoldingAmount = allocated;
      }

      byCurrency[curr].totalInvested += allocated;
      byCurrency[curr].holdingsCount += 1;
      if (allocated > byCurrency[curr].maxHoldingAmount) {
        byCurrency[curr].maxHoldingAmount = allocated;
      }
    } else if (PENDING_STATUSES.includes(st)) {
      const pledged = Number(p.pledged_amount ?? 0);
      awaitingAllocation += pledged;
      pendingCount += 1;

      byCurrency[curr].awaitingAllocation += pledged;
      byCurrency[curr].pendingCount += 1;
    }
  }

  const currencies = Array.from(currenciesSeen);
  const primaryCurrency = currencies.length > 0 ? currencies[0] : "AED";
  const hasMixedCurrencies = currencies.length > 1;

  const largestHoldingPercent =
    totalInvested > 0 ? formatOneDecimal((maxHoldingAmount / totalInvested) * 100) : 0;

  // Round byCurrency percentages
  for (const c of currencies) {
    const curTotal = byCurrency[c].totalInvested;
    byCurrency[c].largestHoldingPercent =
      curTotal > 0 ? formatOneDecimal((byCurrency[c].maxHoldingAmount / curTotal) * 100) : 0;
  }

  return {
    totalInvested,
    awaitingAllocation,
    holdingsCount,
    pendingCount,
    largestHoldingAmount: maxHoldingAmount,
    largestHoldingPercent,
    primaryCurrency,
    currencies,
    hasMixedCurrencies,
    byCurrency,
  };
}

/**
 * Aggregates holdings by Sharia contract type for Doughnut Chart.
 * Labels: Murabaha, Ijara, Mudarabah, SPV Equity, etc.
 * Percentages computed to 1 decimal place.
 */
export function byContractType(pledges = []) {
  const safePledges = Array.isArray(pledges) ? pledges : [];
  const map = new Map();
  let grandTotal = 0;

  for (const p of safePledges) {
    if (!isHolding(p)) continue;
    const allocated = Number(p.allocated_amount ?? 0);
    const rawType = p.projects?.sharia_contract_type || p.sharia_contract_type || "other";
    const label = formatContractTypeLabel(rawType);

    const prev = map.get(label) || 0;
    map.set(label, prev + allocated);
    grandTotal += allocated;
  }

  const items = [];
  for (const [label, amount] of map.entries()) {
    const percentage = grandTotal > 0 ? formatOneDecimal((amount / grandTotal) * 100) : 0;
    items.push({
      label,
      amount,
      percentage,
    });
  }

  // Sort descending by amount
  items.sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

  return {
    labels: items.map((i) => i.label),
    data: items.map((i) => i.amount),
    percentages: items.map((i) => i.percentage),
    total: grandTotal,
    items,
  };
}

/**
 * Aggregates holdings by project for Horizontal Bar Chart.
 * Takes top `topN` (default 8) holdings by allocated_amount,
 * and groups any remaining holdings into an "Other" category.
 */
export function byProject(pledges = [], topN = 8) {
  const safePledges = Array.isArray(pledges) ? pledges : [];
  const map = new Map();
  let grandTotal = 0;

  for (const p of safePledges) {
    if (!isHolding(p)) continue;
    const allocated = Number(p.allocated_amount ?? 0);
    const projId = p.project_id || p.projects?.id || `proj_${p.id}`;
    const title = p.projects?.title || p.title || `Project #${projId}`;
    const slug = p.projects?.slug || p.slug || "";

    if (!map.has(projId)) {
      map.set(projId, {
        projectId: projId,
        title,
        fullTitle: title,
        slug,
        amount: 0,
      });
    }

    const entry = map.get(projId);
    entry.amount += allocated;
    grandTotal += allocated;
  }

  const list = Array.from(map.values());
  // Sort descending by amount, break ties by title ascending
  list.sort((a, b) => b.amount - a.amount || a.title.localeCompare(b.title));

  const items = [];
  if (list.length <= topN) {
    for (const item of list) {
      const percentage = grandTotal > 0 ? formatOneDecimal((item.amount / grandTotal) * 100) : 0;
      items.push({
        ...item,
        percentage,
      });
    }
  } else {
    // Top N
    for (let i = 0; i < topN; i++) {
      const item = list[i];
      const percentage = grandTotal > 0 ? formatOneDecimal((item.amount / grandTotal) * 100) : 0;
      items.push({
        ...item,
        percentage,
      });
    }
    // Remainder in "Other"
    let otherAmount = 0;
    for (let i = topN; i < list.length; i++) {
      otherAmount += list[i].amount;
    }
    const otherPercent = grandTotal > 0 ? formatOneDecimal((otherAmount / grandTotal) * 100) : 0;
    items.push({
      projectId: "other",
      title: "Other",
      fullTitle: `Other Holdings (${list.length - topN} projects)`,
      slug: "",
      amount: otherAmount,
      percentage: otherPercent,
    });
  }

  return {
    labels: items.map((i) => i.title),
    fullTitles: items.map((i) => i.fullTitle),
    data: items.map((i) => i.amount),
    percentages: items.map((i) => i.percentage),
    total: grandTotal,
    items,
  };
}

/**
 * Formats a UTC year and month index (0-11) to a display label.
 * Example: 2026, 0 -> "Jan 2026 (UTC)"
 */
function formatUtcMonthLabel(year, monthIdx) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[monthIdx]} ${year} (UTC)`;
}

/**
 * Aggregates capital invested over time (by UTC month of allocated_at, falling
 * back to pledged_at if allocated_at is null).
 * Produces a CONTINUOUS axis from first to last active month, filling empty months with 0.
 */
export function byMonth(pledges = []) {
  const safePledges = Array.isArray(pledges) ? pledges : [];
  const monthMap = new Map();
  let minMonthKey = null;
  let maxMonthKey = null;
  let grandTotal = 0;

  for (const p of safePledges) {
    if (!isHolding(p)) continue;
    const allocated = Number(p.allocated_amount ?? 0);
    const dateStr = p.allocated_at || p.pledged_at;
    if (!dateStr) continue;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;

    const y = d.getUTCFullYear();
    const m = d.getUTCMonth(); // 0-indexed
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;

    if (!minMonthKey || key < minMonthKey) minMonthKey = key;
    if (!maxMonthKey || key > maxMonthKey) maxMonthKey = key;

    monthMap.set(key, (monthMap.get(key) || 0) + allocated);
    grandTotal += allocated;
  }

  if (!minMonthKey || !maxMonthKey) {
    return {
      labels: [],
      keys: [],
      data: [],
      total: 0,
      items: [],
    };
  }

  // Fill in every month continuously between minMonthKey and maxMonthKey
  const [minY, minM] = minMonthKey.split("-").map(Number);
  const [maxY, maxM] = maxMonthKey.split("-").map(Number);

  const labels = [];
  const keys = [];
  const data = [];
  const items = [];

  let curY = minY;
  let curM = minM - 1; // 0-indexed

  while (curY < maxY || (curY === maxY && curM <= maxM - 1)) {
    const key = `${curY}-${String(curM + 1).padStart(2, "0")}`;
    const label = formatUtcMonthLabel(curY, curM);
    const amount = monthMap.get(key) || 0;

    labels.push(label);
    keys.push(key);
    data.push(amount);
    items.push({ key, label, amount });

    curM += 1;
    if (curM > 11) {
      curM = 0;
      curY += 1;
    }
  }

  return {
    labels,
    keys,
    data,
    total: grandTotal,
    items,
  };
}

/**
 * Aggregates pledge outcome distributions:
 *   - fully allocated: status in ['allocated','active','completed'] and allocated_amount >= pledged_amount
 *   - partly allocated: status in ['allocated','active','completed'] and 0 < allocated_amount < pledged_amount
 *   - not allocated: status === 'rejected_oversubscribed'
 *   - refunded: status === 'refunded'
 * Cancelled and pending pledges are excluded.
 */
export function outcomes(pledges = []) {
  const safePledges = Array.isArray(pledges) ? pledges : [];

  let fullyAllocatedCount = 0;
  let fullyAllocatedPledged = 0;
  let fullyAllocatedAllocated = 0;

  let partlyAllocatedCount = 0;
  let partlyAllocatedPledged = 0;
  let partlyAllocatedAllocated = 0;

  let notAllocatedCount = 0;
  let notAllocatedPledged = 0;

  let refundedCount = 0;
  let refundedPledged = 0;

  for (const p of safePledges) {
    if (!p) continue;
    const st = normalizeStatus(p.status);
    const pledged = Number(p.pledged_amount ?? 0);
    const allocated = Number(p.allocated_amount ?? 0);

    if (HOLDING_STATUSES.includes(st)) {
      if (allocated >= pledged && pledged > 0) {
        fullyAllocatedCount += 1;
        fullyAllocatedPledged += pledged;
        fullyAllocatedAllocated += allocated;
      } else if (allocated > 0 && allocated < pledged) {
        partlyAllocatedCount += 1;
        partlyAllocatedPledged += pledged;
        partlyAllocatedAllocated += allocated;
      } else if (allocated >= pledged) {
        // If pledged was 0 or not set, treat as full
        fullyAllocatedCount += 1;
        fullyAllocatedPledged += pledged;
        fullyAllocatedAllocated += allocated;
      }
    } else if (st === "rejected_oversubscribed") {
      notAllocatedCount += 1;
      notAllocatedPledged += pledged;
    } else if (st === "refunded") {
      refundedCount += 1;
      refundedPledged += pledged;
    }
  }

  const totalClosed =
    fullyAllocatedCount + partlyAllocatedCount + notAllocatedCount + refundedCount;

  return {
    fullyAllocated: {
      count: fullyAllocatedCount,
      pledgedAmount: fullyAllocatedPledged,
      allocatedAmount: fullyAllocatedAllocated,
    },
    partlyAllocated: {
      count: partlyAllocatedCount,
      pledgedAmount: partlyAllocatedPledged,
      allocatedAmount: partlyAllocatedAllocated,
      unallocatedAmount: Math.max(0, partlyAllocatedPledged - partlyAllocatedAllocated),
    },
    notAllocated: {
      count: notAllocatedCount,
      pledgedAmount: notAllocatedPledged,
    },
    refunded: {
      count: refundedCount,
      pledgedAmount: refundedPledged,
    },
    totalCount: totalClosed,
    hasOutcomes: totalClosed > 0,
  };
}

/**
 * Aggregates conversion exposure across holdings.
 * Only holdings with conversion_eligible_units > 0 are included.
 */
export function conversionExposure(pledges = []) {
  const safePledges = Array.isArray(pledges) ? pledges : [];
  const items = [];
  let totalReservedUnits = 0;

  for (const p of safePledges) {
    if (!isHolding(p)) continue;
    const units = Number(p.conversion_eligible_units || 0);
    if (units <= 0) continue;

    const projId = p.project_id || p.projects?.id || `proj_${p.id}`;
    const projectTitle = p.projects?.title || p.title || `Project #${projId}`;
    const slug = p.projects?.slug || p.slug || "";
    const allocated = Number(p.allocated_amount ?? 0);
    const unitPrice = Number(p.projects?.unit_price || p.unit_price || 0);
    const currency = p.projects?.currency || p.currency || "AED";

    totalReservedUnits += units;
    items.push({
      pledgeId: p.id,
      projectId: projId,
      projectTitle,
      slug,
      conversionEligibleUnits: units,
      allocatedAmount: allocated,
      unitPrice,
      currency,
    });
  }

  // Sort descending by reserved units
  items.sort((a, b) => b.conversionEligibleUnits - a.conversionEligibleUnits || a.projectTitle.localeCompare(b.projectTitle));

  return {
    hasExposure: items.length > 0,
    totalReservedUnits,
    items,
    labels: items.map((i) => i.projectTitle),
    data: items.map((i) => i.conversionEligibleUnits),
  };
}
