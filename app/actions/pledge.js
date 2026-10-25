"use server";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getInvestorPortalData } from "./investor-portal";
import { executeCreatePledgeForInvestor } from "@/lib/pledgeCreateCore";
import { generateWalletReferenceCode } from "@/lib/wallet";

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

  const investorData = await getInvestorPortalData();
  if (!investorData || !investorData.id) {
    return { success: false, error: "Investor profile not found. Please complete onboarding first." };
  }

  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const signedIp = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : headersList.get("x-real-ip") || "127.0.0.1";

  const result = await executeCreatePledgeForInvestor({
    investorData,
    projectId,
    slug,
    amount: numericAmount,
    acceptedTerms,
    requestedConversionUnits: userConversionUnits,
    signedIp,
    bypassEligibilityCheck: false,
  });

  if (result.success) {
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
  }

  return result;
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

  const referenceCode = generateWalletReferenceCode("refund_credit");
  const { data: txRow, error: txErr } = await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      investor_id: investorData.id,
      pledge_id: pledge.id,
      type: "refund_credit",
      amount: refundTotal,
      balance_after: newBalance,
      reference_code: referenceCode,
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

