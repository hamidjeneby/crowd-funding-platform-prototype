"use server";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { encrypt, decrypt } from "@/app/utils/crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export async function getOnboardingData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { data: investor, error: investorError } = await supabaseAdmin
    .from("investors")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (investorError && investorError.code !== "PGRST116") {
    console.error(investorError);
    throw new Error("Failed to fetch investor data");
  }

  const { data: reps, error: repsError } = await supabaseAdmin
    .from("investor_reps")
    .select("*")
    .eq("investor_id", userId);

  if (repsError) {
    console.error(repsError);
    throw new Error("Failed to fetch representatives");
  }

  const { data: docs, error: docsError } = await supabaseAdmin
    .from("investor_docs")
    .select("*")
    .eq("investor_id", userId);

  if (docsError) {
    console.error(docsError);
    throw new Error("Failed to fetch documents");
  }

  // Decrypt sensitive fields for Institutional
  if (investor?.trade_license_number) {
    investor.trade_license_number = decrypt(investor.trade_license_number);
  }
  // Decrypt sensitive fields for Individual
  if (investor?.id_number) {
    investor.id_number = decrypt(investor.id_number);
  }

  if (investor?.bank_details?.iban) {
    investor.bank_details.iban = decrypt(investor.bank_details.iban);
  }

  const decryptedReps = (reps || []).map(rep => ({
    ...rep,
    id_number: rep.id_number ? decrypt(rep.id_number) : rep.id_number
  }));

  const decryptedDocs = (docs || []).map(doc => ({
    ...doc,
    document_password: doc.document_password ? decrypt(doc.document_password) : doc.document_password
  }));

  return { investor: investor || {}, reps: decryptedReps, docs: decryptedDocs };
}

export async function setInvestorType(type) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { error } = await supabaseAdmin
    .from("investors")
    .update({ type })
    .eq("user_id", userId);

  if (error) throw new Error("Failed to set investor type: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function updateCurrentStep(step) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { data } = await supabaseAdmin
    .from("investors")
    .select("current_step")
    .eq("user_id", userId)
    .single();

  const dbStep = data?.current_step || 1;
  const highestStep = Math.max(dbStep, step);

  if (highestStep > dbStep) {
    const { error } = await supabaseAdmin
      .from("investors")
      .update({ current_step: highestStep })
      .eq("user_id", userId);
    if (error) throw new Error("Failed to update current step: " + error.message);
  }

  return { success: true, current_step: highestStep };
}

export async function saveStage1Institutional(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { error } = await supabaseAdmin
    .from("investors")
    .update({
      legal_entity_name: data.legal_entity_name,
      country: data.country,
      city: data.city,
      email: data.business_email, // mapping business email to email field
      phone: data.business_phone_number, // mapping business phone to phone field
      business_type: data.business_type,
      license_authority: data.license_authority,
      trade_license_number: encrypt(data.trade_license_number),
      net_worth: data.net_worth ? parseFloat(data.net_worth) : null,
      investment_experience_years: data.investment_experience_years ? parseInt(data.investment_experience_years, 10) : null,
    })
    .eq("user_id", userId);

  if (error) throw new Error("Failed to save entity details: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function saveStage1Individual(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { error } = await supabaseAdmin
    .from("investors")
    .update({
      full_name: data.full_name,
      email: data.personal_email,
      phone: data.personal_phone_number,
      country: data.country,
      city: data.city,
      nationality: data.nationality,
      id_number: data.id_number ? encrypt(data.id_number) : null,
      DOB: data.date_of_birth,
      net_worth: data.net_worth ? parseFloat(data.net_worth) : null,
      investment_experience_years: data.investment_experience_years ? parseInt(data.investment_experience_years, 10) : null,
    })
    .eq("user_id", userId);

  if (error) throw new Error("Failed to save personal info: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function saveStage2Rep(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const repId = formData.get("repId");
  const file = formData.get("file");

  let fileUrl = null;
  if (file && file.size > 0) {
    const fileExt = file.name.split(".").pop();
    const fullName = formData.get("full_name").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const fileName = `${Date.now()}_${fullName}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("investor_reps")
      .upload(filePath, file, { upsert: true });

    if (uploadError)
      throw new Error("Failed to upload image: " + uploadError.message);

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("investor_reps").getPublicUrl(filePath);
    fileUrl = publicUrl; 
  }

  const payload = {
    investor_id: userId,
    full_name: formData.get("full_name"),
    id_type: formData.get("id_type"),
    id_number: encrypt(formData.get("id_number")),
    is_authorized_signatory: formData.get("is_authorized_signatory") === "true",
    is_director: formData.get("is_director") === "true",
    is_ubo: formData.get("is_ubo") === "true",
    ubo_percentage:
      formData.get("is_ubo") === "true"
        ? parseFloat(formData.get("ubo_percentage"))
        : null,
    other_designation: formData.get("other_designation") || null,
  };

  if (fileUrl) {
    payload.id_url = fileUrl;
  }

  let error;
  if (repId) {
    const { error: err } = await supabaseAdmin
      .from("investor_reps")
      .update(payload)
      .eq("id", repId)
      .eq("investor_id", userId);
    error = err;
  } else {
    const { error: err } = await supabaseAdmin
      .from("investor_reps")
      .insert([payload]);
    error = err;
  }

  if (error) throw new Error("Failed to save representative: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function removeStage2Rep(repId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { data, error: fetchErr } = await supabaseAdmin
    .from("investor_reps")
    .select("id_url")
    .eq("id", repId)
    .eq("investor_id", userId)
    .single();

  if (fetchErr) throw new Error("Rep not found");

  // Remove file from storage if it exists
  if (data?.id_url) {
    const path = data.id_url.split("/").pop(); 
    await supabaseAdmin.storage
      .from("investor_reps")
      .remove([`${userId}/${path}`]);
  }

  const { error } = await supabaseAdmin
    .from("investor_reps")
    .delete()
    .eq("id", repId)
    .eq("investor_id", userId);

  if (error)
    throw new Error("Failed to delete representative: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function saveStage3Doc(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const docType = formData.get("doc_type");
  const password = formData.get("document_password");
  const file = formData.get("file");

  if (!docType || !file || file.size === 0) {
    throw new Error("Document type and file are required");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${docType}_${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("investor_docs")
    .upload(filePath, file, { upsert: true });

  if (uploadError)
    throw new Error("Failed to upload document: " + uploadError.message);

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("investor_docs").getPublicUrl(filePath);
  const fileUrl = publicUrl;

  const { data: existing } = await supabaseAdmin
    .from("investor_docs")
    .select("id, url")
    .eq("investor_id", userId)
    .eq("doc_type", docType)
    .single();

  if (existing) {
    if (existing.url && existing.url !== fileUrl) {
      const oldPath = existing.url.split("/").pop();
      await supabaseAdmin.storage
        .from("investor_docs")
        .remove([`${userId}/${oldPath}`]);
    }

    const { error } = await supabaseAdmin
      .from("investor_docs")
      .update({
        document_password: password ? encrypt(password) : null,
        url: fileUrl,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error("Failed to update doc");
  } else {
    const { error } = await supabaseAdmin.from("investor_docs").insert([
      {
        investor_id: userId,
        doc_type: docType,
        document_password: password ? encrypt(password) : null,
        url: fileUrl,
        status: "pending",
        uploaded_at: new Date().toISOString(),
      },
    ]);
    if (error) throw new Error("Failed to insert doc: " + error.message);
  }

  if (docType === "trade_certificate") {
    const { error: updateErr } = await supabaseAdmin
      .from("investors")
      .update({ license_verification_status: "pending" })
      .eq("user_id", userId);
    
    if (updateErr) throw new Error("Failed to update license verification status");
  }

  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function updateDocPassword(docType, password) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { error } = await supabaseAdmin
    .from("investor_docs")
    .update({ document_password: password ? encrypt(password) : null })
    .eq("investor_id", userId)
    .eq("doc_type", docType);

  if (error) throw new Error("Failed to update document password: " + error.message);
  
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function saveStage4Banking(bankDetails) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { error } = await supabaseAdmin
    .from("investors")
    .update({
      bank_details: { ...bankDetails, iban: encrypt(bankDetails.iban) },
      bank_verification_status: "pending",
    })
    .eq("user_id", userId);

  if (error) throw new Error("Failed to save bank details: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function submitApplication() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  const { error } = await supabaseAdmin
    .from("investors")
    .update({
      onboarding_status: "pending review",
      consent_timestamp: new Date().toISOString(),
      consent_ip: ip,
      consent_user_profile: userAgent,
    })
    .eq("user_id", userId);

  if (error) throw new Error("Failed to submit application: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}
