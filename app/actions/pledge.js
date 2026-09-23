"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { CLASS_CONFIG } from "@/app/constants/classConfig";
import { checkInvestEligibility, getProjectDetailBySlug, parseInvestorClass } from "./marketplace";
import { getInvestorPortalData } from "./investor-portal";

export async function createPledge({ projectId, slug, amount }) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "You must be logged in to pledge an investment." };
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

  // 5. Hard Cap Check
  const currentLiveRaised = Number(projectDetail.live_raised_amount) || 0;
  if (projectDetail.hard_cap != null) {
    const hardCap = Number(projectDetail.hard_cap);
    if (!isNaN(hardCap) && hardCap > 0) {
      if (currentLiveRaised + numericAmount > hardCap) {
        const remainingCapacity = Math.max(0, hardCap - currentLiveRaised);
        return {
          success: false,
          error: `This pledge would exceed the campaign's hard cap of ${projectDetail.currency || "USD"} ${hardCap.toLocaleString()}. Maximum remaining capacity: ${projectDetail.currency || "USD"} ${remainingCapacity.toLocaleString()}.`,
        };
      }
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

  // 8. Calculate Pledged Units & Conversion Eligible Units
  const unitPrice = Number(projectDetail.unit_price) || 0;
  const pledgedUnits = unitPrice > 0 ? Math.floor(numericAmount / unitPrice) : 0;

  let conversionEligibleUnits = 0;

  // Check if project has conversion enabled and is NOT spv_equity
  const isSpvEquity = projectDetail.sharia_contract_type === "spv_equity";
  const spvDetail = Array.isArray(projectDetail.spv_details)
    ? projectDetail.spv_details[0]
    : projectDetail.spv_details;
  const isConversionActive = Boolean(!isSpvEquity && projectDetail.is_spv && spvDetail?.conversion_enabled);

  // Conversion privileges only apply to Classes 1–4
  if (isConversionActive && classNum >= 1 && classNum <= 4) {
    const totalSharesAuth = Number(spvDetail.total_shares_authorized) || 0;
    const ratioShares = Number(spvDetail.conversion_ratio_shares) || 0;

    if (totalSharesAuth > 0 && ratioShares > 0) {
      // Step 1: Sum existing conversion_eligible_units for this project
      const { data: existingPledges } = await supabaseAdmin
        .from("pledges")
        .select("conversion_eligible_units")
        .eq("project_id", projectId)
        .neq("status", "cancelled");

      const existingConvertedUnitsSum = (existingPledges || []).reduce(
        (sum, p) => sum + Number(p.conversion_eligible_units || 0),
        0
      );

      // Remaining share pool capacity available
      const remainingShareCapacity = totalSharesAuth - (ratioShares * existingConvertedUnitsSum);

      if (remainingShareCapacity > 0) {
        // Step 2: Determine conversion value cap by class (in currency)
        let classCap = Infinity;
        if (classNum === 2) classCap = 1000000;
        else if (classNum === 3) classCap = 500000;
        else if (classNum === 4) classCap = 250000;
        // Class 1 is Infinity

        // Lower of pledged_amount and class conversion cap
        const effectiveConversionAmount = Math.min(numericAmount, classCap);

        // Raw calculated conversion eligible units for this pledge
        const rawCalculatedUnits = unitPrice > 0 ? Math.floor(effectiveConversionAmount / unitPrice) : 0;
        const rawCalculatedShares = rawCalculatedUnits * ratioShares;

        if (rawCalculatedShares > remainingShareCapacity) {
          // Use remaining share capacity converted back to Sukuk units
          conversionEligibleUnits = Math.floor(remainingShareCapacity / ratioShares);
        } else {
          conversionEligibleUnits = rawCalculatedUnits;
        }
      }
    }
  }

  // 9. Record Pledge in database (Pledges table only)
  const { data: newPledge, error: pledgeInsertError } = await supabaseAdmin
    .from("pledges")
    .insert({
      project_id: projectId,
      investor_id: investorData.id,
      pledged_amount: numericAmount,
      pledged_units: pledgedUnits,
      conversion_eligible_units: conversionEligibleUnits,
      allocated_amount: null,
      investor_class_at_pledge: classNum,
      fee_percent_at_pledge: feePercent,
      fee_amount: feeAmount,
      status: "pending",
      pledged_at: new Date().toISOString(),
      payment_status: "completed",
    })
    .select()
    .single();


  if (pledgeInsertError) {
    console.error("Error creating pledge record:", pledgeInsertError);
    return { success: false, error: "Failed to record pledge commitment. Please try again." };
  }

  // 9. Deduct from Investor Wallet Balance
  const newBalance = walletBalance - totalDeducted;
  const { error: walletUpdateError } = await supabaseAdmin
    .from("investors")
    .update({ wallet_balance: newBalance })
    .eq("id", investorData.id);

  if (walletUpdateError) {
    console.error("Error updating investor wallet balance:", walletUpdateError);
    return { success: false, error: "Pledge created but failed to update wallet balance. Please refresh." };
  }

  // 10. Revalidate Cache
  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/investor-portal/projects/${slug}`);
  revalidatePath("/investor-portal");
  revalidatePath("/investor-portal/marketplace");
  revalidatePath("/investor-portal/portfolio");
  revalidatePath("/investor-portal/wallet");

  return {
    success: true,
    pledge: newPledge,
    feeAmount,
    totalDeducted,
    newBalance,
  };
}
