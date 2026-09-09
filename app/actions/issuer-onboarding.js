"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { encrypt, decrypt } from "@/app/utils/crypto";

export async function syncOrganizationAndMembership(
  orgId,
  userId,
  role = "admin",
  orgType = "issuer",
  orgName = null
) {
  if (!orgId || !userId) return;

  const { data: existingOrg } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!existingOrg) {
    const { error: orgErr } = await supabaseAdmin
      .from("organizations")
      .insert({
        org_id: orgId,
        org_name: orgName || orgId,
        created_by: userId,
        type: orgType,
      });
    if (orgErr) console.error("Error creating organization record:", orgErr);
  }

  const { data: existingMem } = await supabaseAdmin
    .from("memberships")
    .select("id, role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingMem) {
    const { error: memErr } = await supabaseAdmin
      .from("memberships")
      .insert({
        org_id: orgId,
        membership_id: `mem_${orgId}_${userId}`,
        user_id: userId,
        role: role || "admin",
      });
    if (memErr) console.error("Error creating membership record:", memErr);
  }
}

export async function getOnboardingData() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (!orgId) return { issuer: {}, reps: [], docs: [], needsOrg: true };

  await syncOrganizationAndMembership(orgId, userId, "admin", "issuer");

  // Fetch issuer record by org_id or user_id fallback
  let { data: issuer, error: issuerError } = await supabaseAdmin
    .from("issuers")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!issuer) {
    // Fallback search by primary_contact_user_id or user_id
    const { data: legacyIssuer } = await supabaseAdmin
      .from("issuers")
      .select("*")
      .or(`user_id.eq.${userId},primary_contact_user_id.eq.${userId}`)
      .maybeSingle();

    if (legacyIssuer) {
      issuer = legacyIssuer;
    }
  }

  const issuerKey = orgId;

  const { data: reps, error: repsError } = await supabaseAdmin
    .from("issuer_reps")
    .select("*")
    .eq("issuer_id", issuerKey);

  if (repsError) {
    console.error("Reps fetch error:", repsError);
  }

  const { data: docs, error: docsError } = await supabaseAdmin
    .from("issuer_docs")
    .select("*")
    .eq("issuer_id", issuerKey);

  if (docsError) {
    console.error("Docs fetch error:", docsError);
  }

  // Decrypt sensitive fields
  if (issuer?.trade_license_number) {
    issuer.trade_license_number = decrypt(issuer.trade_license_number);
  }
  if (issuer?.bank_details?.iban) {
    issuer.bank_details.iban = decrypt(issuer.bank_details.iban);
  }

  const decryptedReps = (reps || []).map((rep) => ({
    ...rep,
    id_number: rep.id_number ? decrypt(rep.id_number) : rep.id_number,
  }));

  const decryptedDocs = (docs || []).map((doc) => ({
    ...doc,
    document_password: doc.document_password
      ? decrypt(doc.document_password)
      : doc.document_password,
  }));

  return { issuer: issuer || {}, reps: decryptedReps, docs: decryptedDocs, needsOrg: false };
}

export async function saveStage1(data) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Organization context required");

  await syncOrganizationAndMembership(
    orgId,
    userId,
    "admin",
    "issuer",
    data.legal_entity_name
  );

  const payload = {
    org_id: orgId,
    user_id: userId,
    primary_contact_user_id: userId,
    legal_entity_name: data.legal_entity_name,
    country: data.country,
    city: data.city,
    business_email: data.business_email,
    business_phone_number: data.business_phone_number,
    business_type: data.business_type,
    license_authority: data.license_authority,
    trade_license_number: encrypt(data.trade_license_number),
    updated_at: new Date().toISOString(),
  };

  // Upsert into issuers table using org_id
  const { error } = await supabaseAdmin
    .from("issuers")
    .upsert(payload, { onConflict: "org_id" });

  if (error) {
    // If org_id column is missing or constrained differently, update by org_id or user_id
    const { error: updateErr } = await supabaseAdmin
      .from("issuers")
      .update(payload)
      .eq("org_id", orgId);

    if (updateErr) {
      throw new Error("Failed to save entity details: " + error.message);
    }
  }

  revalidatePath("/issuer-portal/onboarding");
  return { success: true };
}

export async function saveStage2Rep(formData) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Organization context required");

  const repId = formData.get("repId");
  const file = formData.get("file");

  let fileUrl = null;
  if (file && file.size > 0) {
    const fileExt = file.name.split(".").pop();
    const fullName = formData.get("full_name").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const fileName = `${Date.now()}_${fullName}.${fileExt}`;
    
    // STORAGE PATH MUST BE: issuer_reps/{org_id}/{filename}
    const filePath = `${orgId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("issuer_reps")
      .upload(filePath, file, { upsert: true });

    if (uploadError)
      throw new Error("Failed to upload representative ID document: " + uploadError.message);

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("issuer_reps").getPublicUrl(filePath);
    fileUrl = publicUrl;
  }

  const payload = {
    issuer_id: orgId,
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
      .from("issuer_reps")
      .update(payload)
      .eq("id", repId)
      .eq("issuer_id", orgId);
    error = err;
  } else {
    const { error: err } = await supabaseAdmin
      .from("issuer_reps")
      .insert([payload]);
    error = err;
  }

  if (error) throw new Error("Failed to save representative: " + error.message);
  revalidatePath("/issuer-portal/onboarding");
  return { success: true };
}

export async function removeStage2Rep(repId) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Organization context required");

  const { data, error: fetchErr } = await supabaseAdmin
    .from("issuer_reps")
    .select("id_url")
    .eq("id", repId)
    .eq("issuer_id", orgId)
    .single();

  if (fetchErr) throw new Error("Representative not found");

  if (data?.id_url) {
    const path = data.id_url.split("/").pop();
    await supabaseAdmin.storage
      .from("issuer_reps")
      .remove([`${orgId}/${path}`]);
  }

  const { error } = await supabaseAdmin
    .from("issuer_reps")
    .delete()
    .eq("id", repId)
    .eq("issuer_id", orgId);

  if (error)
    throw new Error("Failed to delete representative: " + error.message);
  revalidatePath("/issuer-portal/onboarding");
  return { success: true };
}

export async function saveStage3Doc(formData) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Organization context required");

  const docType = formData.get("doc_type");
  const password = formData.get("document_password");
  const file = formData.get("file");

  if (!docType || !file || file.size === 0) {
    throw new Error("Document type and file are required");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${docType}_${Date.now()}.${fileExt}`;
  
  // STORAGE PATH MUST BE: issuer_docs/{org_id}/{filename}
  const filePath = `${orgId}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("issuer_docs")
    .upload(filePath, file, { upsert: true });

  if (uploadError)
    throw new Error("Failed to upload document: " + uploadError.message);

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("issuer_docs").getPublicUrl(filePath);
  const fileUrl = publicUrl;

  const { data: existing } = await supabaseAdmin
    .from("issuer_docs")
    .select("id, url")
    .eq("issuer_id", orgId)
    .eq("doc_type", docType)
    .maybeSingle();

  if (existing) {
    if (existing.url && existing.url !== fileUrl) {
      const oldPath = existing.url.split("/").pop();
      await supabaseAdmin.storage
        .from("issuer_docs")
        .remove([`${orgId}/${oldPath}`]);
    }

    const { error } = await supabaseAdmin
      .from("issuer_docs")
      .update({
        document_password: password ? encrypt(password) : null,
        url: fileUrl,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error("Failed to update doc: " + error.message);
  } else {
    const { error } = await supabaseAdmin.from("issuer_docs").insert([
      {
        issuer_id: orgId,
        doc_type: docType,
        document_password: password ? encrypt(password) : null,
        url: fileUrl,
        status: "pending",
        uploaded_at: new Date().toISOString(),
      },
    ]);
    if (error) throw new Error("Failed to insert doc: " + error.message);
  }

  revalidatePath("/issuer-portal/onboarding");
  return { success: true };
}

export async function updateDocPassword(docType, password) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Organization context required");

  const { error } = await supabaseAdmin
    .from("issuer_docs")
    .update({ document_password: password ? encrypt(password) : null })
    .eq("issuer_id", orgId)
    .eq("doc_type", docType);

  if (error) throw new Error("Failed to update document password: " + error.message);

  revalidatePath("/issuer-portal/onboarding");
  return { success: true };
}

export async function saveStage4Banking(bankDetails) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Organization context required");

  const { error } = await supabaseAdmin
    .from("issuers")
    .update({
      bank_details: { ...bankDetails, iban: encrypt(bankDetails.iban) },
      bank_verification_status: "pending",
    })
    .eq("org_id", orgId);

  if (error) throw new Error("Failed to save bank details: " + error.message);
  revalidatePath("/issuer-portal/onboarding");
  return { success: true };
}

export async function submitApplication() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Organization context required");

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  const { error } = await supabaseAdmin
    .from("issuers")
    .update({
      onboarding_status: "pending review",
      consent_timestamp: new Date().toISOString(),
      consent_ip: ip,
      consent_user_profile: userAgent,
    })
    .eq("org_id", orgId);

  if (error) throw new Error("Failed to submit application: " + error.message);
  revalidatePath("/issuer-portal/onboarding");
  return { success: true };
}

export async function updateCurrentStep(step) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Organization context required");

  const { data } = await supabaseAdmin
    .from("issuers")
    .select("current_step")
    .eq("org_id", orgId)
    .maybeSingle();

  const dbStep = data?.current_step || 1;
  const highestStep = Math.max(dbStep, step);

  if (highestStep > dbStep) {
    const { error } = await supabaseAdmin
      .from("issuers")
      .update({ current_step: highestStep })
      .eq("org_id", orgId);
    if (error) throw new Error("Failed to update current step: " + error.message);
  }

  return { success: true, current_step: highestStep };
}
