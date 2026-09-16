"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { isValidIBAN } from "ibantools";
import { encrypt, decrypt } from "@/app/utils/crypto";

export async function getInvestorPortalData() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;

  if (orgId) {
    const { data: instData } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (instData) investor = instData;
  }

  if (!investor) {
    const { data: indData } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (indData) investor = indData;
  }

  if (!investor) {
    // Default fallback object if no investor record found
    return {
      wallet_balance: 0,
      investor_class: null,
      bank_verification_status: "unverified",
      bank_details: {},
      type: orgId ? "institutional" : "individual",
      onboarding_status: "incomplete",
      kyc_documents: [],
      representatives: [],
    };
  }

  // Parse bank_details if stored as string
  let rawBankDetails = investor.bank_details || {};
  if (typeof rawBankDetails === "string") {
    try {
      rawBankDetails = JSON.parse(rawBankDetails);
    } catch (e) {
      console.error("Error parsing bank_details JSON:", e);
      rawBankDetails = {};
    }
  }

  // Decrypt IBAN if present
  if (rawBankDetails?.iban) {
    const decryptedIban = decrypt(rawBankDetails.iban);
    if (decryptedIban) {
      rawBankDetails.iban = decryptedIban;
    }
  }

  return {
    id: investor.id,
    user_id: investor.user_id,
    org_id: investor.org_id,
    type: investor.type,
    onboarding_status: investor.onboarding_status,
    wallet_balance: Number(investor.wallet_balance || 0),
    investor_class: investor.investor_class || null,
    bank_verification_status: investor.bank_verification_status || "pending",
    bank_details: rawBankDetails,
    legal_name: investor.legal_name || investor.full_name || investor.legal_entity_name || "Investor",
    email: investor.email || "",
    phone: investor.phone || "",
    kyc_documents: investor.kyc_documents || investor.documents || [],
    representatives: investor.representatives || [],
    created_at: investor.created_at,
  };
}

export async function topUpWallet(amount) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: "Invalid amount entered." };
  }

  let investorId = null;
  let currentBalance = 0;

  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id, wallet_balance")
      .eq("org_id", orgId)
      .maybeSingle();

    if (data) {
      investorId = data.id;
      currentBalance = Number(data.wallet_balance || 0);
    }
  }

  if (!investorId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id, wallet_balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      investorId = data.id;
      currentBalance = Number(data.wallet_balance || 0);
    }
  }

  if (!investorId) {
    return { success: false, error: "Investor record not found." };
  }

  const newBalance = currentBalance + numericAmount;

  const { error } = await supabaseAdmin
    .from("investors")
    .update({ wallet_balance: newBalance })
    .eq("id", investorId);

  if (error) {
    console.error("Error topping up wallet:", error);
    return { success: false, error: "Failed to update wallet balance." };
  }

  revalidatePath("/investor-portal");
  revalidatePath("/investor-portal/wallet");

  return { success: true, newBalance };
}

export async function requestClassUpgrade(reason) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "Please provide a reason for the upgrade." };
  }

  // Record upgrade request or update metadata
  let investorId = null;

  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();
    if (data) investorId = data.id;
  }

  if (!investorId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) investorId = data.id;
  }

  if (investorId) {
    await supabaseAdmin
      .from("investors")
      .update({
        class_upgrade_request: {
          requested_at: new Date().toISOString(),
          reason: reason.trim(),
          status: "under_review",
        },
      })
      .eq("id", investorId);
  }

  return { success: true };
}

export async function updateBankDetails(bankDetails) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!bankDetails.bank_name || bankDetails.bank_name.trim().length < 2) {
    return { success: false, error: "Bank name is required." };
  }

  if (!bankDetails.account_name || bankDetails.account_name.trim().length < 2) {
    return { success: false, error: "Account holder name is required." };
  }

  if (!bankDetails.account_number || String(bankDetails.account_number).trim().length <= 6) {
    return { success: false, error: "Account number must be more than 6 characters." };
  }

  const cleanIban = String(bankDetails.iban || "").replace(/\s+/g, "");
  if (!cleanIban || (!cleanIban.includes(":") && !isValidIBAN(cleanIban))) {
    return { success: false, error: "Invalid IBAN number." };
  }

  if (!bankDetails.swift_code || bankDetails.swift_code.trim().length < 8 || !/^[A-Z0-9]+$/i.test(bankDetails.swift_code.trim())) {
    return { success: false, error: "SWIFT/BIC code must be at least 8 uppercase alphanumeric characters." };
  }

  if (!bankDetails.currency) {
    return { success: false, error: "Currency must be selected." };
  }

  if (!bankDetails.bank_address || bankDetails.bank_address.trim().length < 5) {
    return { success: false, error: "Bank address is required." };
  }

  let investorId = null;

  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();
    if (data) investorId = data.id;
  }

  if (!investorId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) investorId = data.id;
  }

  if (!investorId) {
    return { success: false, error: "Investor profile not found." };
  }

  // Encrypt IBAN before saving if plaintext IBAN provided
  const bankDetailsToSave = {
    ...bankDetails,
    iban: cleanIban,
  };

  if (!cleanIban.includes(":")) {
    const encryptedIban = encrypt(cleanIban);
    if (encryptedIban) {
      bankDetailsToSave.iban = encryptedIban;
    }
  }

  const { error } = await supabaseAdmin
    .from("investors")
    .update({
      bank_details: bankDetailsToSave,
      bank_verification_status: "pending",
    })
    .eq("id", investorId);

  if (error) {
    console.error("Error updating bank details:", error);
    return { success: false, error: "Failed to update bank details." };
  }

  revalidatePath("/investor-portal/account");

  return { success: true };
}
