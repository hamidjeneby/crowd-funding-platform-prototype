import { getContractTypeHooks } from "./types/index.js";

/**
 * Stub underwriting hook per Decision 3:
 * applyUnderwriting(project, shortfall) returns 0.
 */
export function applyUnderwriting(_project, _shortfall) {
  return 0;
}

/**
 * Splits pending pledges into eligible (pledged_at <= campaign_end_date) and late (pledged_at > campaign_end_date).
 */
export function splitEligibleAndLatePledges(pledges = [], campaignEndDate = null) {
  if (!campaignEndDate) {
    return { eligible: [...pledges], late: [] };
  }
  const deadlineMs = new Date(campaignEndDate).getTime();
  if (isNaN(deadlineMs)) {
    return { eligible: [...pledges], late: [] };
  }

  const eligible = [];
  const late = [];

  for (const p of pledges) {
    const pledgedMs = p?.pledged_at ? new Date(p.pledged_at).getTime() : deadlineMs;
    if (!isNaN(pledgedMs) && pledgedMs > deadlineMs) {
      late.push({ ...p });
    } else {
      eligible.push({ ...p });
    }
  }

  return { eligible, late };
}

/**
 * Sorts eligible pledges by deterministic priority order:
 * 1. investor_class_at_pledge ascending (Class 1 highest priority)
 * 2. pledged_amount descending (largest pledge first)
 * 3. pledged_at ascending (earliest timestamp first)
 */
export function sortPledgesByPriority(pledges = []) {
  return [...pledges].sort((a, b) => {
    const classA = Number(a.investor_class_at_pledge) || 10;
    const classB = Number(b.investor_class_at_pledge) || 10;
    if (classA !== classB) {
      return classA - classB;
    }

    const amtA = Number(a.pledged_amount) || 0;
    const amtB = Number(b.pledged_amount) || 0;
    if (amtB !== amtA) {
      return amtB - amtA;
    }

    const timeA = a.pledged_at ? new Date(a.pledged_at).getTime() : 0;
    const timeB = b.pledged_at ? new Date(b.pledged_at).getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

/**
 * Pure allocation function over plain project and pledge objects (no DB calls).
 *
 * Performs:
 * 1. Split into eligible (pledged_at <= campaign_end_date) and late (pledged_at > campaign_end_date).
 * 2. Sort eligible pledges by priority and assign 1-based allocation_rank.
 * 3. Allocate capacity using contract type hooks, rounding down to whole units and enforcing min_investment_floor.
 * 4. Evaluate soft_cap (and applyUnderwriting stub).
 * 5. Run contract-type afterAllocation hook (e.g. SPV equity ownership_percentage).
 */
export function allocatePledges(project, pendingPledges = []) {
  if (!project) {
    throw new Error("Project object is required for allocation.");
  }

  const unitPrice = Number(project.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error(`Invalid unit_price (${project.unit_price}) for project ${project.id ?? ""}`);
  }

  const hooks = getContractTypeHooks(project.sharia_contract_type);
  const projectCapacity = hooks.capacity(project);
  const minFloor = Number(project.min_investment_floor) || 0;
  const softCap = Number(project.soft_cap) || 0;

  const { eligible: rawEligible, late: rawLate } = splitEligibleAndLatePledges(
    pendingPledges,
    project.campaign_end_date
  );

  // Late pledges: excluded from allocation, refunded in full
  const latePledges = rawLate.map((p) => ({
    ...p,
    pledge_id: p.id ?? p.pledge_id,
    is_late: true,
    status: "refunded",
    allocated_amount: 0,
    allocated_units: 0,
    allocation_rank: null,
    conversion_eligible_units: null,
    ownership_percentage: null,
  }));

  const subscribedTotalAtClose = rawEligible.reduce(
    (sum, p) => sum + (Number(p.pledged_amount) || 0),
    0
  );

  // Case A: No eligible pledges at all -> fails with 'no_pledges'
  if (rawEligible.length === 0) {
    return {
      status: "failed",
      outcome: "failed",
      failure_reason: "no_pledges",
      capacity: projectCapacity,
      allocated_total: 0,
      subscribed_total_at_close: 0,
      eligible: [],
      late: latePledges,
      pledges: [...latePledges],
    };
  }

  // Sort eligible pledges by priority and assign rank
  const sortedEligible = sortPledgesByPriority(rawEligible);
  let remaining = projectCapacity;

  const tentativeEligible = sortedEligible.map((p, index) => {
    const rank = index + 1;
    const pledgedAmount = Number(p.pledged_amount) || 0;

    let fill = Math.min(pledgedAmount, remaining);
    fill = hooks.roundAllocation(fill, project);

    if (fill < minFloor) {
      fill = 0;
    }

    const allocatedAmount = fill;
    const allocatedUnits = allocatedAmount > 0 ? Math.floor(allocatedAmount / unitPrice) : 0;
    remaining -= fill;

    return {
      ...p,
      pledge_id: p.id ?? p.pledge_id,
      is_late: false,
      allocation_rank: rank,
      allocated_amount: allocatedAmount,
      allocated_units: allocatedUnits,
      conversion_eligible_units: 0,
      ownership_percentage: null,
    };
  });

  const tentativeAllocatedTotal = tentativeEligible.reduce(
    (sum, p) => sum + (Number(p.allocated_amount) || 0),
    0
  );

  // Soft cap evaluation (with underwriting stub)
  let totalWithUnderwriting = tentativeAllocatedTotal;
  if (tentativeAllocatedTotal < softCap) {
    const shortfall = softCap - tentativeAllocatedTotal;
    const underwritten = applyUnderwriting(project, shortfall);
    totalWithUnderwriting = tentativeAllocatedTotal + underwritten;
  }

  // Case B: Soft cap not met -> campaign fails with 'soft_cap_not_met'
  if (totalWithUnderwriting < softCap) {
    const failedEligible = tentativeEligible.map((p) => ({
      ...p,
      status: "refunded",
      allocated_amount: 0,
      allocated_units: 0,
      allocation_rank: null,
      conversion_eligible_units: null,
      ownership_percentage: null,
    }));

    return {
      status: "failed",
      outcome: "failed",
      failure_reason: "soft_cap_not_met",
      capacity: projectCapacity,
      allocated_total: 0,
      subscribed_total_at_close: subscribedTotalAtClose,
      eligible: failedEligible,
      late: latePledges,
      pledges: [...failedEligible, ...latePledges],
    };
  }

  // Case C: Campaign is funded
  const fundedEligible = tentativeEligible.map((p) => ({
    ...p,
    status: p.allocated_amount > 0 ? "allocated" : "rejected_oversubscribed",
  }));

  // Run afterAllocation hook (sets ownership_percentage for spv_equity)
  hooks.afterAllocation(project, fundedEligible);

  return {
    status: "funded",
    outcome: "funded",
    failure_reason: null,
    capacity: projectCapacity,
    allocated_total: tentativeAllocatedTotal,
    subscribed_total_at_close: subscribedTotalAtClose,
    eligible: fundedEligible,
    late: latePledges,
    pledges: [...fundedEligible, ...latePledges],
  };
}

export { allocatePledges as allocate };
