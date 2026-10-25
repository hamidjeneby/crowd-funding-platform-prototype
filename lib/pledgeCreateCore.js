import { supabaseAdmin } from "@/lib/supabase";
import { CLASS_CONFIG } from "@/app/constants/classConfig";
import {
  MAX_OVERSUBSCRIPTION_PERCENT,
  PLEDGE_TERMS_VERSION,
  PLEDGE_DISCLOSURES,
} from "@/app/constants/pledgeConfig";
import { sendSubscriptionAgreementWebhook } from "@/lib/webhook";
import {
  checkInvestEligibility,
  getProjectDetailBySlug,
  parseInvestorClass,
} from "@/app/actions/marketplace";
import {
  ensureAutomaticPledgeSubscription,
  evaluateThresholdNotifications,
} from "@/app/actions/notifications";
import { notifyIssuerPledgeAndThresholds } from "@/app/actions/issuer-notifications";
import { mapPledgeInsertError } from "@/lib/pledgeLimits";
import { generateWalletReferenceCode } from "@/lib/wallet";
import { formatUtcDateTime, formatUtcDateOnly } from "@/lib/closing/certificate";

/**
 * Reverses a wallet debit if an error occurs after the investor's wallet was debited,
 * restoring `investors.wallet_balance` and recording a `refund_credit` row in `wallet_transactions`.
 */
export async function reverseWalletDebit({
  investorId,
  pledgeId = null,
  amount,
  restoredBalance,
  insertRefundLedgerRow = true,
}) {
  await supabaseAdmin
    .from("investors")
    .update({ wallet_balance: restoredBalance })
    .eq("id", investorId);

  if (insertRefundLedgerRow) {
    const referenceCode = generateWalletReferenceCode("refund_credit");
    await supabaseAdmin.from("wallet_transactions").insert({
      investor_id: investorId,
      pledge_id: pledgeId,
      type: "refund_credit",
      amount,
      balance_after: restoredBalance,
      reference_code: referenceCode,
    });
  }
}

/**
 * Core server-side pledge creation pipeline shared by the `createPledge` Server Action
 * and the CLI verification runner (`scripts/pledge-limit-cli.mjs`).
 */
export async function executeCreatePledgeForInvestor({
  investorData,
  projectId,
  slug,
  amount,
  acceptedTerms,
  requestedConversionUnits: userConversionUnits,
  signedIp = "127.0.0.1",
  bypassEligibilityCheck = false,
}) {
  if (acceptedTerms !== true) {
    return {
      success: false,
      error: "You must review and accept the subscription terms to submit a pledge.",
    };
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: "Please enter a valid investment amount." };
  }

  if (!investorData || !investorData.id) {
    return {
      success: false,
      error: "Investor profile not found. Please complete onboarding first.",
    };
  }

  const classNum = await parseInvestorClass(investorData.investor_class);
  const cfg = CLASS_CONFIG[classNum] || CLASS_CONFIG[10];

  // Fetch Project & Verify Eligibility (before anything is written or debited)
  const projectDetail = await getProjectDetailBySlug(slug, classNum, investorData.id);
  if (!projectDetail) {
    return {
      success: false,
      error: "Project not found or not eligible for your investor class.",
    };
  }

  const resolvedProjectId = projectId || projectDetail.id;

  if (!bypassEligibilityCheck) {
    const eligibility = await checkInvestEligibility(
      projectDetail,
      classNum,
      investorData.id
    );
    const isAllowed = Boolean(eligibility.allowed ?? eligibility.eligible);
    if (!isAllowed) {
      const msg =
        eligibility.message ||
        eligibility.reason ||
        "You are not eligible to invest in this project.";
      return {
        success: false,
        code: eligibility.code || "INELIGIBLE",
        message: msg,
        error: msg,
      };
    }
  }

  // Explicit Campaign Deadline Guard: block pledges when now() >= campaign_end_date
  if (projectDetail.campaign_end_date) {
    const deadlineMs = new Date(projectDetail.campaign_end_date).getTime();
    if (!isNaN(deadlineMs) && Date.now() >= deadlineMs) {
      return {
        success: false,
        error:
          "The campaign deadline has passed and this campaign is no longer accepting pledges.",
      };
    }
  }

  // Min Investment Floor Check
  const minFloor = Number(projectDetail.min_investment_floor) || 0;
  if (numericAmount < minFloor) {
    return {
      success: false,
      error: `Investment amount cannot be lower than the minimum floor of ${projectDetail.currency || "USD"} ${minFloor.toLocaleString()}.`,
    };
  }

  // Max Pledge Ceiling Check (Class-based)
  if (cfg.maxPledge !== Infinity && numericAmount > cfg.maxPledge) {
    return {
      success: false,
      error: `Investment amount exceeds your ${cfg.name} maximum pledge limit of ${projectDetail.currency || "USD"} ${cfg.maxPledge.toLocaleString()}.`,
    };
  }

  // Oversubscription Ceiling Check (150% of capacity)
  const capacity =
    Number(projectDetail.hard_cap) || Number(projectDetail.target_goal) || 0;
  const currentLiveSubscribed = Number(projectDetail.live_raised_amount) || 0;
  if (capacity > 0) {
    const maxCapacity = capacity * (MAX_OVERSUBSCRIPTION_PERCENT / 100);
    if (currentLiveSubscribed + numericAmount > maxCapacity) {
      const remainingIntake = Math.max(0, maxCapacity - currentLiveSubscribed);
      return {
        success: false,
        error: `This pledge exceeds the 150% maximum subscription ceiling (${projectDetail.currency || "USD"} ${maxCapacity.toLocaleString()}). Maximum remaining intake is ${projectDetail.currency || "USD"} ${remainingIntake.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      };
    }
  }

  // Fee Calculation & Snapshot
  const feePercent = cfg.feePercent || 2.5;
  const feeAmount = (numericAmount * feePercent) / 100;
  const totalDeducted = numericAmount + feeAmount;

  // Fresh Wallet Sufficiency Check
  const { data: freshInvestor } = await supabaseAdmin
    .from("investors")
    .select("wallet_balance")
    .eq("id", investorData.id)
    .maybeSingle();

  const walletBalance = Number(
    freshInvestor?.wallet_balance ?? investorData.wallet_balance ?? 0
  );
  if (walletBalance < totalDeducted) {
    return {
      success: false,
      error: `Insufficient wallet balance. Total required is ${projectDetail.currency || "USD"} ${totalDeducted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Pledge: ${numericAmount.toLocaleString()} + ${feePercent}% Fee: ${feeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}), but your wallet balance is ${projectDetail.currency || "USD"} ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Please top up your wallet first.`,
    };
  }

  // Calculate Pledged Units & Requested Conversion Units
  const unitPrice = Number(projectDetail.unit_price) || 0;
  const pledgedUnits = unitPrice > 0 ? Math.floor(numericAmount / unitPrice) : 0;

  let requestedConversionUnits = 0;
  const isSpvEquity = projectDetail.sharia_contract_type === "spv_equity";
  const spvDetail = Array.isArray(projectDetail.spv_details)
    ? projectDetail.spv_details[0]
    : projectDetail.spv_details;
  const isConversionActive = Boolean(
    !isSpvEquity && projectDetail.is_spv && spvDetail?.conversion_enabled
  );

  // Conversion privileges only apply to Classes 1–4
  if (isConversionActive && classNum >= 1 && classNum <= 4) {
    let classCap = Infinity;
    if (classNum === 2) classCap = 1000000;
    else if (classNum === 3) classCap = 500000;
    else if (classNum === 4) classCap = 250000;

    const effectiveConversionAmount = Math.min(numericAmount, classCap);
    const maxEligibleConversionUnits =
      unitPrice > 0 ? Math.floor(effectiveConversionAmount / unitPrice) : 0;

    if (
      userConversionUnits !== undefined &&
      userConversionUnits !== null &&
      userConversionUnits !== ""
    ) {
      const parsedUnits = parseInt(userConversionUnits, 10);
      if (!isNaN(parsedUnits)) {
        requestedConversionUnits = Math.max(
          0,
          Math.min(parsedUnits, maxEligibleConversionUnits)
        );
      } else {
        requestedConversionUnits = maxEligibleConversionUnits;
      }
    } else {
      requestedConversionUnits = maxEligibleConversionUnits;
    }
  }

  const signedAt = new Date().toISOString();

  // Record Pledge in database FIRST (before wallet is debited).
  // If this insert fails (e.g. Postgres 23505 on uniq_class10_one_active_pledge or
  // uniq_class9_10_one_pledge_per_quarter), the wallet has not been debited yet.
  const { data: newPledge, error: pledgeInsertError } = await supabaseAdmin
    .from("pledges")
    .insert({
      project_id: resolvedProjectId,
      investor_id: investorData.id,
      pledged_amount: numericAmount,
      pledged_units: pledgedUnits,
      requested_conversion_units: requestedConversionUnits,
      conversion_eligible_units: null,
      allocated_amount: null,
      allocated_units: null,
      allocation_rank: null,
      ownership_percentage: null,
      refunded_amount: 0,
      investor_class_at_pledge: classNum,
      fee_percent_at_pledge: feePercent,
      fee_amount: feeAmount,
      status: "pending",
      pledged_at: signedAt,
      payment_status: "completed",
    })
    .select()
    .single();

  if (pledgeInsertError) {
    console.error("Error creating pledge record:", pledgeInsertError);
    const mapped = mapPledgeInsertError(pledgeInsertError, new Date(signedAt));
    return {
      success: false,
      code: mapped.code,
      message: mapped.message,
      error: mapped.message,
    };
  }

  // Deduct from Investor Wallet Balance & Record wallet_transactions Ledger Row
  const newBalance = walletBalance - totalDeducted;
  const { error: walletUpdateError } = await supabaseAdmin
    .from("investors")
    .update({ wallet_balance: newBalance })
    .eq("id", investorData.id);

  if (walletUpdateError) {
    console.error("Error updating investor wallet balance:", walletUpdateError);
    // Roll back the newly inserted pledge row so no unpaid pledge remains
    await supabaseAdmin.from("pledges").delete().eq("id", newPledge.id);
    return {
      success: false,
      error:
        "Failed to debit wallet balance. Your pledge was not recorded; please try again.",
    };
  }

  const referenceCode = generateWalletReferenceCode("pledge_debit");
  const { error: walletTxError } = await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      investor_id: investorData.id,
      pledge_id: newPledge.id,
      type: "pledge_debit",
      amount: totalDeducted,
      balance_after: newBalance,
      reference_code: referenceCode,
    });

  if (walletTxError) {
    console.error(
      "Error inserting wallet_transactions pledge_debit row:",
      walletTxError
    );
  }

  // Insert pledge_docs record (Subscription Agreement)
  let pledgeDoc = null;
  try {
    const { data: insertedDoc, error: docError } = await supabaseAdmin
      .from("pledge_docs")
      .insert({
        pledge_id: newPledge.id,
        doc_type: "subscription_agreement",
        signed_at: signedAt,
        signed_ip: signedIp,
        terms_version: PLEDGE_TERMS_VERSION,
        file_url: null,
        generated_at: null,
      })
      .select()
      .single();

    if (docError) {
      console.error("Failed to insert pledge_docs record:", docError);
    } else {
      pledgeDoc = insertedDoc;
    }
  } catch (docErr) {
    console.error("Exception inserting pledge_docs:", docErr);
  }

  // Send Subscription Agreement Webhook to Make
  try {
    let issuerOrSpvLegalName = projectDetail.title;
    if (projectDetail.is_spv && spvDetail?.spv_legal_name) {
      issuerOrSpvLegalName = spvDetail.spv_legal_name;
    } else if (projectDetail.issuer_id) {
      const { data: issuerRow } = await supabaseAdmin
        .from("issuers")
        .select("legal_entity_name")
        .eq("id", projectDetail.issuer_id)
        .maybeSingle();
      if (issuerRow?.legal_entity_name) {
        issuerOrSpvLegalName = issuerRow.legal_entity_name;
      }
    }

    const investorDisplayName =
      investorData.legal_name ||
      investorData.full_name ||
      investorData.legal_entity_name ||
      "Investor";

    const webhookPayload = {
      pledge_doc_id: pledgeDoc?.id || null,
      pledge_id: newPledge.id,
      doc_type: "subscription_agreement",
      terms_version: PLEDGE_TERMS_VERSION,
      signed_at: formatUtcDateTime(signedAt),
      signed_ip: signedIp,
      investor: {
        display_name: investorDisplayName,
        email: investorData.email || "",
        investor_type: investorData.type || "individual",
        investor_class_at_pledge: classNum,
      },
      project: {
        id: projectDetail.id,
        title: projectDetail.title,
        slug: projectDetail.slug,
        legal_name: issuerOrSpvLegalName,
        sharia_contract_type: projectDetail.sharia_contract_type,
        currency: projectDetail.currency || "USD",
        unit_price: unitPrice,
        campaign_end_date: formatUtcDateTime(projectDetail.campaign_end_date),
        tenor_months: projectDetail.tenor_months ?? null,
        contract_terms: projectDetail.contract_terms ?? null,
      },
      pledge: {
        pledged_amount: numericAmount,
        pledged_units: pledgedUnits,
        requested_conversion_units: requestedConversionUnits,
        fee_percent_at_pledge: feePercent,
        fee_amount: feeAmount,
        total_deducted: totalDeducted,
        pledged_at: formatUtcDateTime(signedAt),
      },
      conversion:
        isConversionActive && classNum >= 1 && classNum <= 4
          ? {
              trigger_value:
                spvDetail?.conversion_trigger_value ??
                spvDetail?.conversion_trigger_price ??
                null,
              conversion_ratio: spvDetail?.conversion_ratio_shares ?? null,
              deadline: spvDetail?.conversion_deadline
                ? formatUtcDateOnly(spvDetail.conversion_deadline)
                : null,
            }
          : null,

      accepted_disclosures: {
        terms_version: PLEDGE_TERMS_VERSION,
        disclosure_items: PLEDGE_DISCLOSURES.items,
        conversion_item:
          isConversionActive && classNum >= 1 && classNum <= 4
            ? PLEDGE_DISCLOSURES.conversionItem
            : null,
      },
    };

    sendSubscriptionAgreementWebhook(webhookPayload).catch((hookErr) => {
      console.error("Background subscription agreement webhook error:", hookErr);
    });
  } catch (payloadErr) {
    console.error(
      "Error constructing/sending subscription agreement webhook payload:",
      payloadErr
    );
  }

  // Automatic Notification Subscription
  await ensureAutomaticPledgeSubscription(investorData.id, resolvedProjectId);

  // Asynchronously Trigger Threshold Notification Evaluations (Investors & Issuers)
  evaluateThresholdNotifications(resolvedProjectId, newPledge.id).catch(
    (err) => {
      console.error("Background investor notification evaluation error:", err);
    }
  );

  notifyIssuerPledgeAndThresholds(resolvedProjectId, newPledge.id).catch(
    (err) => {
      console.error("Background issuer notification evaluation error:", err);
    }
  );

  return {
    success: true,
    pledge: newPledge,
    feeAmount,
    totalDeducted,
    newBalance,
    requestedConversionUnits,
  };
}
