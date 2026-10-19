import { getContractTypeHooks } from "./types/index.js";

function resolveSpvDetails(project) {
  if (!project) return null;
  if (Array.isArray(project.spv_details)) return project.spv_details[0] || null;
  return project.spv_details || null;
}

/**
 * Determines whether the conversion pass should run for a project.
 * Only runs when the contract type hook has conversionPass = true AND project.is_spv is true
 * AND spv_details.conversion_enabled is true.
 */
export function shouldRunConversionPass(project) {
  if (!project) return false;
  const hooks = getContractTypeHooks(project.sharia_contract_type);
  if (!hooks.conversionPass) return false;

  const spv = resolveSpvDetails(project);
  const isSpv = Boolean(project.is_spv ?? spv);
  const conversionEnabled = Boolean(
    spv?.conversion_enabled ?? project.conversion_enabled ?? false
  );

  return isSpv && conversionEnabled;
}

/**
 * Pure conversion pool allocation pass over plain objects (no DB calls).
 *
 * Rules:
 * - Only runs on funded campaigns when shouldRunConversionPass(project) is true.
 * - Failed campaign and late pledges ('refunded') always get conversion_eligible_units = null.
 * - Walks allocated pledges in priority order (allocation_rank ascending).
 * - Class 1-4 only:
 *     pool_units = floor(total_shares_authorized / conversion_ratio_shares)
 *     conversion_eligible_units = min(requested_conversion_units, allocated_units, pool_units_remaining)
 *     subtract from pool_units_remaining.
 * - Classes 5-10 and unallocated ('rejected_oversubscribed') get conversion_eligible_units = 0.
 */
export function allocateConversionPool(project, pledges = [], projectStatus = "funded") {
  const isFunded = projectStatus === "funded";
  const conversionActive = isFunded && shouldRunConversionPass(project);

  const spv = resolveSpvDetails(project);
  const totalSharesAuthorized = Number(
    spv?.total_shares_authorized ?? project?.total_shares_authorized ?? 0
  );
  const conversionRatioShares = Number(
    spv?.conversion_ratio_shares ?? project?.conversion_ratio_shares ?? 0
  );

  let poolUnitsRemaining =
    conversionActive && conversionRatioShares > 0
      ? Math.floor(totalSharesAuthorized / conversionRatioShares)
      : 0;

  const initialPoolUnits = poolUnitsRemaining;

  const results = pledges.map((p) => ({ ...p }));

  for (const p of results) {
    if (!isFunded || p.status === "refunded" || p.is_late || !conversionActive) {
      p.conversion_eligible_units = null;
      continue;
    }

    if (p.status !== "allocated" || !(Number(p.allocated_units) > 0)) {
      p.conversion_eligible_units = 0;
      continue;
    }

    const investorClass = Number(p.investor_class_at_pledge) || 10;
    if (investorClass >= 1 && investorClass <= 4) {
      const requestedUnits = Math.max(0, Number(p.requested_conversion_units) || 0);
      const allocatedUnits = Math.max(0, Number(p.allocated_units) || 0);
      const granted = Math.min(requestedUnits, allocatedUnits, poolUnitsRemaining);
      p.conversion_eligible_units = granted;
      poolUnitsRemaining -= granted;
    } else {
      p.conversion_eligible_units = 0;
    }
  }

  return {
    conversion_active: conversionActive,
    pool_units_total: initialPoolUnits,
    pool_units_allocated: initialPoolUnits - poolUnitsRemaining,
    pool_units_remaining: poolUnitsRemaining,
    pledges: results,
  };
}

export { allocateConversionPool as runConversionPass };
