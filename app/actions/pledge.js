"use server";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { CLASS_CONFIG } from "@/app/constants/classConfig";
import {
  MAX_OVERSUBSCRIPTION_PERCENT,
  PLEDGE_TERMS_VERSION,
  PLEDGE_DISCLOSURES,
} from "@/app/constants/pledgeConfig";
import { sendSubscriptionAgreementWebhook } from "@/lib/webhook";
import { checkInvestEligibility, getProjectDetailBySlug, parseInvestorClass } from "./marketplace";
import { getInvestorPortalData } from "./investor-portal";
import { ensureAutomaticPledgeSubscription, evaluateThresholdNotifications } from "./notifications";
import { notifyIssuerPledgeAndThresholds } from "./issuer-notifications";

export async function createPledge({
  projectId,
  slug,
  amount,
  acceptedTerms,
  requestedConversionUnits: userConversionUnits,
}) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "You must be logged in to pledge an investment." };
  }

  // 1.5 Acceptance check
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

  // 1. Get Investor Data
  const investorData = await getInvestorPortalData();
  if (!investorData || !investorData.id) {
    return { success: false, error: "Investor profile not found. Please complete onboarding first." };
  }

  const classNum = await parseInvestorClass(investorData.investor_class);
  const cfg = CLASS_CONFIG[classNum] || CLASS_CONFIG[10];

  // 2. Fetch Project & Verify Eligibility
  const projectDetail = await getProjectDetailBySlug(slug, classNum);
  if (!projectDetail) {
    return { success: false, error: "Project not found or not eligible for your investor class." };
  }

  const eligibility = await checkInvestEligibility(projectDetail, classNum, investorData.id);
  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason || "You are not eligible to invest in this project." };
  }

  // 2b. Explicit Campaign Deadline Guard: block pledges when now() >= campaign_end_date
  if (projectDetail.campaign_end_date) {
    const deadlineMs = new Date(projectDetail.campaign_end_date).getTime();
    if (!isNaN(deadlineMs) && Date.now() >= deadlineMs) {
      return {
        success: false,
        error: "The campaign deadline has passed and this campaign is no longer accepting pledges.",
      };
    }
  }

  // 3. Min Investment Floor Check
  const minFloor = Number(projectDetail.min_investment_floor) || 0;
  if (numericAmount < minFloor) {
    return {
      success: false,
      error: `Investment amount cannot be lower than the minimum floor of ${projectDetail.currency || "USD"} ${minFloor.toLocaleString()}.`,
    };
  }

  // 4. Max Pledge Ceiling Check (Class-based)
  if (cfg.maxPledge !== Infinity && numericAmount > cfg.maxPledge) {
    return {
      success: false,
      error: `Investment amount exceeds your ${cfg.name} maximum pledge limit of ${projectDetail.currency || "USD"} ${cfg.maxPledge.toLocaleString()}.`,
    };
  }

  // 5. Oversubscription Ceiling Check (150% of capacity)
  const capacity = Number(projectDetail.hard_cap) || Number(projectDetail.target_goal) || 0;
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

  // 6. Fee Calculation & Snapshot
  const feePercent = cfg.feePercent || 2.5;
  const feeAmount = (numericAmount * feePercent) / 100;
  const totalDeducted = numericAmount + feeAmount;

  // 7. Wallet Sufficiency Check
  const walletBalance = Number(investorData.wallet_balance) || 0;
  if (walletBalance < totalDeducted) {
    return {
      success: false,
      error: `Insufficient wallet balance. Total required is ${projectDetail.currency || "USD"} ${totalDeducted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Pledge: ${numericAmount.toLocaleString()} + ${feePercent}% Fee: ${feeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}), but your wallet balance is ${projectDetail.currency || "USD"} ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Please top up your wallet first.`,
    };
  }

  // 8. Calculate Pledged Units & Requested Conversion Units
  const unitPrice = Number(projectDetail.unit_price) || 0;
  const pledgedUnits = unitPrice > 0 ? Math.floor(numericAmount / unitPrice) : 0;

  let requestedConversionUnits = 0;
  const isSpvEquity = projectDetail.sharia_contract_type === "spv_equity";
  const spvDetail = Array.isArray(projectDetail.spv_details)
    ? projectDetail.spv_details[0]
    : projectDetail.spv_details;
  const isConversionActive = Boolean(!isSpvEquity && projectDetail.is_spv && spvDetail?.conversion_enabled);

  // Conversion privileges only apply to Classes 1–4
  if (isConversionActive && classNum >= 1 && classNum <= 4) {
    let classCap = Infinity;
    if (classNum === 2) classCap = 1000000;
    else if (classNum === 3) classCap = 500000;
    else if (classNum === 4) classCap = 250000;

    const effectiveConversionAmount = Math.min(numericAmount, classCap);
    const maxEligibleConversionUnits = unitPrice > 0 ? Math.floor(effectiveConversionAmount / unitPrice) : 0;

    if (userConversionUnits !== undefined && userConversionUnits !== null && userConversionUnits !== "") {
      const parsedUnits = parseInt(userConversionUnits, 10);
      if (!isNaN(parsedUnits)) {
        requestedConversionUnits = Math.max(0, Math.min(parsedUnits, maxEligibleConversionUnits));
      } else {
        requestedConversionUnits = maxEligibleConversionUnits;
      }
    } else {
      requestedConversionUnits = maxEligibleConversionUnits;
    }
  }

  // Server-side timestamp and IP capture
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const signedIp = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : headersList.get("x-real-ip") || "127.0.0.1";
  const signedAt = new Date().toISOString();

  // 9. Record Pledge in database (Pledges table only)
  const { data: newPledge, error: pledgeInsertError } = await supabaseAdmin
    .from("pledges")
    .insert({
      project_id: projectId,
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
    return { success: false, error: "Failed to record pledge commitment. Please try again." };
  }

  // 10. Deduct from Investor Wallet Balance & Record wallet_transactions Ledger Row
  const newBalance = walletBalance - totalDeducted;
  const { error: walletUpdateError } = await supabaseAdmin
    .from("investors")
    .update({ wallet_balance: newBalance })
    .eq("id", investorData.id);

  if (walletUpdateError) {
    console.error("Error updating investor wallet balance:", walletUpdateError);
    return { success: false, error: "Pledge created but failed to update wallet balance. Please refresh." };
  }

  const { error: walletTxError } = await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      investor_id: investorData.id,
      pledge_id: newPledge.id,
      type: "pledge_debit",
      amount: totalDeducted,
      balance_after: newBalance,
    });

  if (walletTxError) {
    console.error("Error inserting wallet_transactions pledge_debit row:", walletTxError);
  }

  // 11. Insert pledge_docs record (Subscription Agreement)
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

  // 12. Send Subscription Agreement Webhook to Make
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
      signed_at: signedAt,
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
        campaign_end_date: projectDetail.campaign_end_date || null,
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
        pledged_at: signedAt,
      },
      conversion:
        isConversionActive && classNum >= 1 && classNum <= 4
          ? {
              trigger_value:
                spvDetail?.conversion_trigger_value ??
                spvDetail?.conversion_trigger_price ??
                null,
              conversion_ratio: spvDetail?.conversion_ratio_shares ?? null,
              deadline: spvDetail?.conversion_deadline ?? null,
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
    console.error("Error constructing/sending subscription agreement webhook payload:", payloadErr);
  }

  // 13. Automatic Notification Subscription
  await ensureAutomaticPledgeSubscription(investorData.id, projectId);

  // 14. Asynchronously Trigger Threshold Notification Evaluations (Investors & Issuers)
  evaluateThresholdNotifications(projectId, newPledge.id).catch((err) => {
    console.error("Background investor notification evaluation error:", err);
  });

  notifyIssuerPledgeAndThresholds(projectId, newPledge.id).catch((err) => {
    console.error("Background issuer notification evaluation error:", err);
  });

  // 15. Revalidate Cache
  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/investor-portal/projects/${slug}`);
  revalidatePath("/investor-portal");
  revalidatePath("/investor-portal/marketplace");
  revalidatePath("/investor-portal/portfolio");
  revalidatePath("/investor-portal/wallet");
  revalidatePath("/investor-portal/notifications");
  revalidatePath("/issuer-portal");
  revalidatePath("/issuer-portal/notifications");
  revalidatePath(`/issuer-portal/projects/${slug}/manage`);

  return {
    success: true,
    pledge: newPledge,
    feeAmount,
    totalDeducted,
    newBalance,
    requestedConversionUnits,
  };
}

/**
 * Cancels a pending pledge before the campaign deadline.
 * Cancellations are strictly blocked once now() >= campaign_end_date or when the project is no longer campaign_live.
 */
export async function cancelPledge({ pledgeId }) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "You must be logged in to cancel a pledge." };
  }

  const investorData = await getInvestorPortalData();
  if (!investorData?.id) {
    return { success: false, error: "Investor profile not found." };
  }

  const { data: pledge, error: pledgeErr } = await supabaseAdmin
    .from("pledges")
    .select("*, projects(id, slug, status, campaign_end_date)")
    .eq("id", pledgeId)
    .eq("investor_id", investorData.id)
    .maybeSingle();

  if (pledgeErr || !pledge) {
    return { success: false, error: "Pledge not found." };
  }

  if (pledge.status !== "pending") {
    return { success: false, error: "Only pending pledges can be cancelled." };
  }

  const project = pledge.projects;
  if (!project || project.status !== "campaign_live") {
    return {
      success: false,
      error: "Pledges cannot be cancelled after the campaign has closed.",
    };
  }

  if (project.campaign_end_date) {
    const deadlineMs = new Date(project.campaign_end_date).getTime();
    if (!isNaN(deadlineMs) && Date.now() >= deadlineMs) {
      return {
        success: false,
        error: "Pledges cannot be cancelled after the campaign deadline.",
      };
    }
  }

  const refundTotal = Number(pledge.pledged_amount || 0) + Number(pledge.fee_amount || 0);
  const currentBalance = Number(investorData.wallet_balance || 0);
  const newBalance = currentBalance + refundTotal;

  const { error: updatePledgeErr } = await supabaseAdmin
    .from("pledges")
    .update({
      status: "cancelled",
      refunded_amount: refundTotal,
    })
    .eq("id", pledge.id)
    .eq("status", "pending");

  if (updatePledgeErr) {
    console.error("Error cancelling pledge:", updatePledgeErr);
    return { success: false, error: "Failed to cancel pledge." };
  }

  const { data: txRow, error: txErr } = await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      investor_id: investorData.id,
      pledge_id: pledge.id,
      type: "refund_credit",
      amount: refundTotal,
      balance_after: newBalance,
    })
    .select("id")
    .maybeSingle();

  if (!txErr && txRow?.id) {
    await supabaseAdmin
      .from("investors")
      .update({ wallet_balance: newBalance })
      .eq("id", investorData.id);
  }

  if (project.slug) {
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath(`/investor-portal/projects/${project.slug}`);
  }
  revalidatePath("/investor-portal");
  revalidatePath("/investor-portal/investments");
  revalidatePath("/investor-portal/portfolio");
  revalidatePath("/investor-portal/wallet");

  return { success: true, refundedAmount: refundTotal, newBalance };
}

