import { decrypt } from "../../app/utils/crypto.js";

/**
 * Formats a date/timestamp to UTC "dd/mm/yyyy hh:mm" (24-hour, zero-padded).
 */
export function formatUtcDateTime(dateInput) {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formats a date to UTC "dd/mm/yyyy".
 */
export function formatUtcDateOnly(dateInput) {
  if (!dateInput) return "N/A";
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split("-");
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats currency amounts with thousands separators and 2 decimal places.
 */
export function formatAmount(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats percentages cleanly for certificate text.
 */
export function formatPercent(val) {
  if (val == null || val === "") return "0";
  const num = Number(val);
  if (isNaN(num)) return "0";
  return String(Number(num.toFixed(2)));
}

/**
 * Formats payment/reporting frequencies into natural english strings.
 */
export function formatFrequency(freq) {
  switch (String(freq || "").toLowerCase()) {
    case "monthly":
      return "monthly";
    case "quarterly":
      return "quarterly";
    case "semi_annual":
      return "semi-annually";
    case "annual":
      return "annually";
    case "at_maturity":
      return "at maturity";
    default:
      return freq || "periodically";
  }
}

/**
 * Resolves contract_terms object safely from project JSON or object.
 */
export function resolveContractTerms(project) {
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
 * Maps contract type to template holding unit type label.
 */
export function getUnitTypeLabel(shariaContractType) {
  const key = String(shariaContractType || "murabaha").toLowerCase().trim();
  switch (key) {
    case "murabaha":
      return "Murabaha Sukuk unit";
    case "ijara":
      return "Ijara Sukuk unit";
    case "mudarabah":
      return "Mudarabah Sukuk unit";
    case "spv_equity":
      return "Share";
    default:
      return "Sukuk unit";
  }
}

/**
 * Maps contract type to plain label.
 */
export function getShariaContractTypeLabel(shariaContractType) {
  const key = String(shariaContractType || "murabaha").toLowerCase().trim();
  switch (key) {
    case "murabaha":
      return "Murabaha";
    case "ijara":
      return "Ijara";
    case "mudarabah":
      return "Mudarabah";
    case "spv_equity":
      return "SPV equity";
    default:
      return shariaContractType || "Murabaha";
  }
}

/**
 * Maps contract type to plain yield type label.
 */
export function getYieldTypeLabel(shariaContractType) {
  const key = String(shariaContractType || "murabaha").toLowerCase().trim();
  switch (key) {
    case "murabaha":
      return "Fixed profit rate";
    case "ijara":
      return "Rental income";
    case "mudarabah":
      return "Profit sharing (not guaranteed)";
    case "spv_equity":
      return "Equity appreciation and dividends (not guaranteed)";
    default:
      return "Fixed profit rate";
  }
}

/**
 * Composes the five Section 4 lines (term_text, return_text, payments_text,
 * end_of_term_text, asset_text) per contract type exactly as specified in sukuk_certificate_template.md.
 */
export function composeCertificateSection4({
  project,
  pledge,
  spvDetails = null,
  issuer = null,
}) {
  const contractType = String(project.sharia_contract_type || "murabaha").toLowerCase().trim();
  const terms = resolveContractTerms(project);
  const currency = project.currency || "AED";
  const tenorMonths = project.tenor_months ? Number(project.tenor_months) : null;
  const expectedRoi = project.expected_roi_percent != null ? Number(project.expected_roi_percent) : null;

  let term_text = "";
  let return_text = "";
  let payments_text = "";
  let end_of_term_text = "";
  let asset_text = "";

  if (contractType === "murabaha") {
    // Term: [tenor_months] months, starting on the date the funds are released to the issuer. The maturity date is confirmed at release.
    term_text = `${tenorMonths || 0} months, starting on the date the funds are released to the issuer. The maturity date is confirmed at release.`;

    // Return: Annual profit rate of [expected_roi_percent]%, contractually owed on the allocated amount.
    return_text = `Annual profit rate of ${formatPercent(expectedRoi)}%, contractually owed on the allocated amount.`;

    // Payments / Reporting: Paid [payment_frequency]. Principal is repaid [with each instalment | at maturity]. (If payment_frequency is at_maturity: Profit and principal are paid at maturity.)
    const paymentFreq = String(terms.payment_frequency || "quarterly").toLowerCase();
    const principalRepay = String(terms.principal_repayment || "at_maturity").toLowerCase();

    if (paymentFreq === "at_maturity") {
      payments_text = "Profit and principal are paid at maturity.";
    } else {
      const freqLabel = formatFrequency(paymentFreq);
      const principalLabel = principalRepay === "with_instalments" ? "with each instalment" : "at maturity";
      payments_text = `Paid ${freqLabel}. Principal is repaid ${principalLabel}.`;
    }

    // End of Term: Principal is repaid [with instalments | at maturity], after which the certificate is redeemed.
    const endPrincipalLabel = principalRepay === "with_instalments" ? "with instalments" : "at maturity";
    end_of_term_text = `Principal is repaid ${endPrincipalLabel}, after which the certificate is redeemed.`;

    // Underlying Asset: [asset_description]
    asset_text = terms.asset_description || "Asset as described in project documentation.";

  } else if (contractType === "ijara") {
    // Term: same as Murabaha.
    term_text = `${tenorMonths || 0} months, starting on the date the funds are released to the issuer. The maturity date is confirmed at release.`;

    // Return: Annual rental yield of [expected_roi_percent]%, paid from the rent on the leased asset.
    return_text = `Annual rental yield of ${formatPercent(expectedRoi)}%, paid from the rent on the leased asset.`;

    // Payments / Reporting: Rent is paid [payment_frequency].
    const paymentFreq = String(terms.payment_frequency || "quarterly").toLowerCase();
    const freqLabel = formatFrequency(paymentFreq);
    payments_text = `Rent is paid ${freqLabel}.`;

    // End of Term: [sale_to_issuer: The asset is sold to the issuer at the end of the term for [end_of_term_price] [currency]. | sale_to_third_party: The asset is sold to a third party and the proceeds are distributed to holders. | return_asset: The asset is returned at the end of the term.]
    const endOfTerm = String(terms.end_of_term || "sale_to_issuer").toLowerCase();
    if (endOfTerm === "sale_to_issuer") {
      const priceStr = formatAmount(terms.end_of_term_price ?? 0);
      end_of_term_text = `The asset is sold to the issuer at the end of the term for ${priceStr} ${currency}.`;
    } else if (endOfTerm === "sale_to_third_party") {
      end_of_term_text = "The asset is sold to a third party and the proceeds are distributed to holders.";
    } else {
      end_of_term_text = "The asset is returned at the end of the term.";
    }

    // Underlying Asset: [asset_description], valued at [asset_value] [currency].
    const assetValStr = formatAmount(terms.asset_value ?? 0);
    const assetDesc = terms.asset_description || "Leased asset";
    asset_text = `${assetDesc}, valued at ${assetValStr} ${currency}.`;

  } else if (contractType === "mudarabah") {
    // Term: same as Murabaha.
    term_text = `${tenorMonths || 0} months, starting on the date the funds are released to the issuer. The maturity date is confirmed at release.`;

    // Return: Profit sharing, not a fixed rate. Investors together receive [investor_profit_share_percent]% of the project's profit; the issuer keeps the rest. Your share of the investors' portion is [allocated_amount / project allocated_total, as %]. Target annual return [expected_roi_percent]%, not guaranteed. Actual returns depend on profit and can be zero.
    const investorProfitShare = terms.investor_profit_share_percent != null ? Number(terms.investor_profit_share_percent) : 0;
    const projectAllocatedTotal = Number(project.allocated_total) || Number(pledge.allocated_amount) || 1;
    const pledgeAllocatedAmt = Number(pledge.allocated_amount) || 0;
    const investorPoolShare = projectAllocatedTotal > 0 ? (pledgeAllocatedAmt / projectAllocatedTotal) * 100 : 0;

    return_text = `Profit sharing, not a fixed rate. Investors together receive ${formatPercent(investorProfitShare)}% of the project's profit; the issuer keeps the rest. Your share of the investors' portion is ${formatPercent(investorPoolShare)}%. Target annual return ${formatPercent(expectedRoi)}%, not guaranteed. Actual returns depend on profit and can be zero.`;

    // Payments / Reporting: Profit is reported [profit_reporting_frequency].
    const reportingFreq = String(terms.profit_reporting_frequency || "quarterly").toLowerCase();
    const freqLabel = formatFrequency(reportingFreq);
    payments_text = `Profit is reported ${freqLabel}.`;

    // End of Term: Capital is returned at the end of the term, subject to the project's performance.
    end_of_term_text = "Capital is returned at the end of the term, subject to the project's performance.";

    // Underlying Asset / Activity: The business activity described in the project listing.
    asset_text = "The business activity described in the project listing.";

  } else if (contractType === "spv_equity") {
    // Term: No fixed term and no maturity date. This holding is not redeemable by the issuer.
    term_text = "No fixed term and no maturity date. This holding is not redeemable by the issuer.";

    // Return: No fixed return. Value comes from dividends, if declared, and any change in the value of the shares. Not guaranteed.
    return_text = "No fixed return. Value comes from dividends, if declared, and any change in the value of the shares. Not guaranteed.";

    // Payments / Reporting: [dividend_policy: No dividends planned | Dividends at the issuer's discretion | Target dividend payout]. Voting rights: [Yes | No].
    let dividendPolicyText = "Dividends at the issuer's discretion";
    if (terms.dividend_policy === "none_planned") {
      dividendPolicyText = "No dividends planned";
    } else if (terms.dividend_policy === "target_payout") {
      dividendPolicyText = "Target dividend payout";
    } else if (terms.dividend_policy === "discretionary") {
      dividendPolicyText = "Dividends at the issuer's discretion";
    }
    const votingRightsText = terms.voting_rights ? "Yes" : "No";
    payments_text = `${dividendPolicyText}. Voting rights: ${votingRightsText}.`;

    // End of Term: An exit (sale, acquisition or listing) is possible but not guaranteed. Indicative exit horizon: [target_exit_horizon_years] years.
    if (terms.target_exit_horizon_years != null && terms.target_exit_horizon_years !== "") {
      end_of_term_text = `An exit (sale, acquisition or listing) is possible but not guaranteed. Indicative exit horizon: ${terms.target_exit_horizon_years} years.`;
    } else {
      end_of_term_text = "An exit (sale, acquisition or listing) is possible but not guaranteed.";
    }

    // Underlying Asset: Shares in [spv_legal_name], representing [ownership_percentage]% of the issued share capital after this raise.
    const spvLegalName = spvDetails?.spv_legal_name || issuer?.legal_entity_name || "the SPV entity";
    const ownershipPct = pledge.ownership_percentage != null ? formatPercent(pledge.ownership_percentage) : "0";
    asset_text = `Shares in ${spvLegalName}, representing ${ownershipPct}% of the issued share capital after this raise.`;
  }

  return {
    term_text,
    return_text,
    payments_text,
    end_of_term_text,
    asset_text,
  };
}

/**
 * Builds the complete Sukuk / Share Certificate webhook payload for an allocated pledge.
 */
export function buildSukukCertificatePayload({
  project,
  pledge,
  investor = null,
  spvDetails = null,
  issuer = null,
  pledgeDocId = null,
  custodyRegistryUrl = null,
}) {
  const allocatedAt = pledge.allocated_at || new Date().toISOString();
  const allocatedDate = new Date(allocatedAt);
  const year = !isNaN(allocatedDate.getTime()) ? allocatedDate.getUTCFullYear() : new Date().getUTCFullYear();

  const docIdNum = Number(pledgeDocId) || Number(pledge.pledge_doc_id) || 1;
  const certificateId = `SC-${year}-${String(docIdNum).padStart(6, "0")}`;

  // Investor Name & Legal ID
  const isInstitutional =
    String(investor?.type || "").toLowerCase() === "institutional" ||
    Boolean(investor?.org_id) ||
    Boolean(investor?.legal_entity_name && !investor?.full_name);

  const investorFullName = isInstitutional
    ? (investor?.legal_entity_name || investor?.full_name || "Investor")
    : (investor?.full_name || investor?.legal_entity_name || "Investor");

  // Determine raw legal ID:
  // - Individual investor -> id_number (fallback to trade_license_number if missing)
  // - Institutional investor -> trade_license_number (fallback to id_number if missing)
  let rawLegalId = "";
  if (isInstitutional) {
    rawLegalId =
      investor?.trade_license_number ||
      investor?.trade_lisence_number ||
      investor?.id_number ||
      "";
  } else {
    rawLegalId =
      investor?.id_number ||
      investor?.trade_license_number ||
      investor?.trade_lisence_number ||
      "";
  }

  const investorLegalId = (rawLegalId ? decrypt(rawLegalId) : "") || rawLegalId || "N/A";


  // SPV / Issuer Legal Name & Registration Number
  const isSpv = Boolean(project.is_spv ?? spvDetails);
  const spvLegalName = isSpv
    ? (spvDetails?.spv_legal_name || issuer?.legal_entity_name || "SPV Entity")
    : (issuer?.legal_entity_name || "Issuer Entity");

  let spvRegistrationNo = "N/A";
  if (isSpv) {
    spvRegistrationNo = spvDetails?.registration_number || "N/A";
  } else {
    const rawIssuerLic = issuer?.trade_license_number || "";
    spvRegistrationNo = (rawIssuerLic ? decrypt(rawIssuerLic) : "") || rawIssuerLic || "N/A";
  }

  // Contract Labels
  const contractType = project.sharia_contract_type;
  const isSpvEquity = String(contractType).toLowerCase().trim() === "spv_equity";
  const unitTypeLabel = getUnitTypeLabel(contractType);
  const shariaContractLabel = getShariaContractTypeLabel(contractType);
  const yieldTypeLabel = getYieldTypeLabel(contractType);

  // Section 4 five lines
  const section4 = composeCertificateSection4({
    project,
    pledge,
    spvDetails,
    issuer,
  });

  // Section 5 Conversion Terms
  const terms = resolveContractTerms(project);
  const conversionAllowedOnProject = !isSpvEquity && isSpv && Boolean(spvDetails?.conversion_enabled ?? spvDetails?.is_conversion_enabled);
  const conversionUnitsAllocated = Number(pledge.conversion_eligible_units) || 0;
  const isConversionEnabled = (conversionAllowedOnProject && conversionUnitsAllocated > 0) ? "Yes" : "No";

  let conversionEligibleUnits = "N/A";
  let conversionRatioShares = "N/A";
  let conversionDeadline = "N/A";
  let conversionTriggerPrice = "N/A";

  if (isConversionEnabled === "Yes") {
    conversionEligibleUnits = conversionUnitsAllocated;
    conversionRatioShares = Number(spvDetails?.conversion_ratio_shares ?? 1);
    conversionDeadline = spvDetails?.conversion_deadline ? formatUtcDateOnly(spvDetails.conversion_deadline) : "N/A";
    const rawTriggerPrice =
      spvDetails?.conversion_trigger_value ??
      spvDetails?.conversion_trigger_price ??
      terms?.conversion_trigger_value ??
      terms?.conversion_trigger_price;
    conversionTriggerPrice =
      rawTriggerPrice != null && rawTriggerPrice !== "" && !isNaN(Number(rawTriggerPrice))
        ? formatAmount(rawTriggerPrice)
        : "N/A";
  }

  const registryFileUrl = custodyRegistryUrl || "Not yet available";

  const allocatedAmountStr = formatAmount(pledge.allocated_amount);
  const allocatedUnitsInt = Math.floor(Number(pledge.allocated_units) || 0);
  const unitPriceStr = formatAmount(project.unit_price);
  const currency = project.currency || "AED";

  return {
    // Make-specific keys
    pledge_doc_id: docIdNum,
    doc_type: "sukuk_certificate",
    investor_email: investor?.email || "",

    // Section 1: Certificate Identification
    certificate_id: certificateId,
    pledge_id: Number(pledge.id ?? pledge.pledge_id),
    allocated_at: formatUtcDateTime(allocatedAt),

    // Section 2: Holder & Issuer Details
    investor_full_name: investorFullName,
    investor_legal_id: investorLegalId,
    investor_id: investorLegalId, // Alias for Make scenarios expecting investor_id
    investor_db_id: Number(investor?.id || pledge.investor_id || 0),
    spv_legal_name: spvLegalName,
    spv_registration_no: spvRegistrationNo,
    project_name: project.title,

    // Section 3: Holding & Allocation Details
    unit_type: unitTypeLabel,
    allocated_amount: allocatedAmountStr,
    allocated_units: allocatedUnitsInt,
    currency,
    unit_price: unitPriceStr,

    // Section 4: Terms & Return Structure
    sharia_contract_type: shariaContractLabel,
    yield_type: yieldTypeLabel,
    term_text: section4.term_text,
    return_text: section4.return_text,
    payments_text: section4.payments_text,
    end_of_term_text: section4.end_of_term_text,
    asset_text: section4.asset_text,

    // Section 5: Restated Conversion Terms & Authoritative Registry
    is_conversion_enabled: isConversionEnabled,
    conversion_eligible_units: conversionEligibleUnits,
    conversion_ratio_shares: conversionRatioShares,
    conversion_deadline: conversionDeadline,
    conversion_trigger_price: conversionTriggerPrice,
    registry_file_url: registryFileUrl,

    // Backward-compatibility and ledger fields
    status: pledge.status || "allocated",
    pledged_amount: Number(pledge.pledged_amount) || 0,
    refunded_amount: Number(pledge.refunded_amount) || 0,
    fee_amount: Number(pledge.fee_amount) || 0,
    fee_refunded: Boolean(pledge.fee_refunded),
    ownership_percentage: pledge.ownership_percentage != null ? Number(pledge.ownership_percentage) : null,
    contract_type: project.sharia_contract_type,
  };
}
