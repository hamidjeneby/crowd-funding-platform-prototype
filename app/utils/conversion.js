/**
 * Utility functions for investor class conversion rights based on class-rules.md
 */

export function getConversionRights(investorClass, project) {
  if (!project) return null;

  const isSpvEquity = project.sharia_contract_type === "spv_equity";
  if (isSpvEquity) {
    return {
      isSpvEquity: true,
      eligible: true,
      badgeText: "Direct SPV Equity",
      badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
      description: "Direct shareholding position — no conversion required.",
      classCap: "N/A (Direct Equity)",
    };
  }

  const spvDetail = Array.isArray(project.spv_details)
    ? project.spv_details[0]
    : project.spv_details;

  const conversionEnabled = Boolean(project.is_spv && spvDetail?.conversion_enabled);

  if (!conversionEnabled) {
    return {
      isSpvEquity: false,
      eligible: false,
      badgeText: "Cash-Only Sukuk",
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
      description: "This project does not offer a conversion clause.",
      classCap: "None",
    };
  }

  const cls = Number(investorClass) || 10;
  if (cls > 4) {
    return {
      isSpvEquity: false,
      eligible: false,
      badgeText: "Cash-Only Sukuk",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      description: `Class ${cls} investors hold cash-only Sukuk without conversion clause rights.`,
      classCap: "AED 0 (No Conversion)",
    };
  }

  const caps = {
    1: "Full holding (Unlimited)",
    2: "AED 1,000,000 max conversion value",
    3: "AED 500,000 max conversion value",
    4: "AED 250,000 max conversion value",
  };

  const triggerPrice = spvDetail?.conversion_trigger_value
    ? `${project.currency || "AED"} ${Number(spvDetail.conversion_trigger_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : "Not specified";

  const ratio = spvDetail?.conversion_ratio_shares
    ? `1 Sukuk unit = ${spvDetail.conversion_ratio_shares} shares`
    : "Not specified";

  const deadline = spvDetail?.conversion_deadline || "Not specified";

  return {
    isSpvEquity: false,
    eligible: true,
    badgeText: "Conversion Clause Eligible",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: `Class ${cls} investor eligible to convert Sukuk into shares upon trigger.`,
    classCap: caps[cls] || "Capped",
    triggerPrice,
    ratio,
    ratioShares: Number(spvDetail?.conversion_ratio_shares) || 1,
    deadline,
    totalSharesAuthorized: spvDetail?.total_shares_authorized || null,
  };
}
