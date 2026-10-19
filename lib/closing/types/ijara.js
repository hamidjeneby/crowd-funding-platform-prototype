/**
 * Contract type hooks for Ijara
 */
export function capacity(project) {
  return Number(project?.hard_cap) || Number(project?.target_goal) || 0;
}

export function roundAllocation(amount, project) {
  const unitPrice = Number(project?.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error(`Invalid unit_price (${project?.unit_price}) for project ${project?.id ?? ""}`);
  }
  const units = Math.floor(Number(amount) / unitPrice);
  return units * unitPrice;
}

export const conversionPass = true;

export function afterAllocation(_project, pledges) {
  for (const p of pledges) {
    p.ownership_percentage = null;
  }
  return pledges;
}
