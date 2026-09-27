"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/app/utils/crypto";

/**
 * Fetches actual issuer KYB data, representatives, and bank details for the logged in org.
 */
export async function getIssuerAccountData() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { data: issuer, error: issuerError } = await supabaseAdmin
      .from("issuers")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (issuerError || !issuer) {
      return { success: false, error: "Issuer record not found" };
    }

    // Fetch Representatives
    const { data: reps } = await supabaseAdmin
      .from("issuer_reps")
      .select("*")
      .eq("issuer_id", issuer.id);

    // Decrypt trade license number
    const decryptedLicense = issuer.trade_license_number
      ? decrypt(issuer.trade_license_number) || issuer.trade_license_number
      : null;

    // Parse bank details JSON if string
    let bankDetails = issuer.bank_details || {};
    if (typeof bankDetails === "string") {
      try {
        bankDetails = JSON.parse(bankDetails);
      } catch {
        bankDetails = {};
      }
    }

    // Decrypt IBAN in bank_details if present
    if (bankDetails.iban) {
      bankDetails.iban = decrypt(bankDetails.iban) || bankDetails.iban;
    }

    // Decrypt representative ID numbers
    const decryptedReps = (reps || []).map((rep) => ({
      ...rep,
      id_number: rep.id_number ? decrypt(rep.id_number) || rep.id_number : null,
    }));

    return {
      success: true,
      issuer: {
        id: issuer.id,
        org_id: issuer.org_id,
        legal_entity_name: issuer.legal_entity_name || "N/A",
        trade_license_number: decryptedLicense || "N/A",
        license_authority: issuer.license_authority || "N/A",
        country: issuer.country || "N/A",
        city: issuer.city || "N/A",
        business_type: issuer.business_type || "N/A",
        business_email: issuer.business_email || "N/A",
        business_phone_number: issuer.business_phone_number || "N/A",
        onboarding_status: issuer.onboarding_status || "incomplete",
        bank_details: bankDetails,
        bank_verification_status: issuer.bank_verification_status || "pending",
        representatives: decryptedReps,
      },
    };
  } catch (err) {
    console.error("Error fetching issuer account data:", err);
    return { success: false, error: "Failed to load issuer account data" };
  }
}

/**
 * Updates settlement bank details for the issuer and flips bank_verification_status back to "pending".
 */
export async function updateIssuerBankDetails(bankDetailsData) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { data: issuer } = await supabaseAdmin
      .from("issuers")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!issuer?.id) {
      return { success: false, error: "Issuer profile not found" };
    }

    const rawIban = bankDetailsData.iban || "";
    const cleanedIban = rawIban.replace(/\s+/g, "");

    const newBankDetails = {
      bank_name: bankDetailsData.bank_name || "",
      account_name: bankDetailsData.account_name || "",
      account_number: bankDetailsData.account_number || "",
      iban: encrypt(cleanedIban),
      swift_code: bankDetailsData.swift_code || "",
      currency: bankDetailsData.currency || "",
      bank_address: bankDetailsData.bank_address || "",
    };

    // Update bank_details JSON and flip bank_verification_status to pending!
    const { error } = await supabaseAdmin
      .from("issuers")
      .update({
        bank_details: newBankDetails,
        bank_verification_status: "pending",
      })
      .eq("id", issuer.id);

    if (error) {
      console.error("Error updating issuer bank details:", error);
      return { success: false, error: "Failed to update bank details." };
    }

    revalidatePath("/issuer-portal/account");
    return { success: true };
  } catch (err) {
    console.error("Error updating issuer bank details:", err);
    return { success: false, error: "An error occurred while updating bank details." };
  }
}

