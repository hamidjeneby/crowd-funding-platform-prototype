/**
 * Contract type hooks for SPV Equity
 */
function resolveSpvDetails(project) {
  if (!project) return null;
  if (Array.isArray(project.spv_details)) return project.spv_details[0] || null;
  return project.spv_details || null;
}

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

export function capacity(project) {
  const unitPrice = Number(project?.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error(`Invalid unit_price (${project?.unit_price}) for project ${project?.id ?? ""}`);
  }
  const spv = resolveSpvDetails(project);
  const totalSharesAuthorized = Number(
    spv?.total_shares_authorized ?? project?.total_shares_authorized ?? 0
  );
  return totalSharesAuthorized * unitPrice;
}

export function roundAllocation(amount, project) {
  const unitPrice = Number(project?.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error(`Invalid unit_price (${project?.unit_price}) for project ${project?.id ?? ""}`);
  }
  const shares = Math.floor(Number(amount) / unitPrice);
  return shares * unitPrice;
}

export const conversionPass = false;

export function afterAllocation(project, pledges) {
  const terms = resolveContractTerms(project);
  const existingShares = Number(
    terms?.existing_shares_outstanding ?? project?.existing_shares_outstanding ?? 0
  );
  const totalAllocatedShares = pledges.reduce(
    (sum, p) => sum + (Number(p.allocated_units) || 0),
    0
  );
  const denominator = existingShares + totalAllocatedShares;

  for (const p of pledges) {
    const units = Number(p.allocated_units) || 0;
    if (units > 0 && denominator > 0) {
      p.ownership_percentage = (units / denominator) * 100;
    } else {
      p.ownership_percentage = null;
    }
  }

  return pledges;
}
