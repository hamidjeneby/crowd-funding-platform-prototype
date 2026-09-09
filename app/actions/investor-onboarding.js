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
  orgType = "investor",
  orgName = null
) {
  if (!orgId || !userId) return;

  // 1. Ensure organization exists in organizations table
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

  // 2. Ensure membership exists in memberships table (set role to admin ONLY when first created)
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

  let investor = null;

  // 1. If orgId exists, search investors table by org_id first
  if (orgId) {
    await syncOrganizationAndMembership(orgId, userId, "admin", "investor");

    const { data: instData } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (instData) {
      investor = instData;
    }
  }

  // 2. Fallback: check by user_id
  if (!investor) {
    const { data: indData } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (indData) {
      investor = indData;
      // If investor was stored as institutional and now orgId is selected, link org_id and clear user_id
      if (investor.type === "institutional" && orgId) {
        await supabaseAdmin
          .from("investors")
          .update({ org_id: orgId, user_id: null })
          .eq("id", investor.id);
        investor.org_id = orgId;
        investor.user_id = null;
      }
    }
  }

  const isInstitutional = investor?.type === "institutional" || !!orgId;
  const entityId = isInstitutional && orgId ? orgId : userId;

  const { data: reps } = await supabaseAdmin
    .from("investor_reps")
    .select("*")
    .eq("investor_id", entityId);

  const { data: docs } = await supabaseAdmin
    .from("investor_docs")
    .select("*")
    .eq("investor_id", entityId);

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

  return { investor: investor || {}, reps: decryptedReps, docs: decryptedDocs };
}

export async function setInvestorType(type) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (type === "institutional") {
    if (orgId) {
      await syncOrganizationAndMembership(orgId, userId, "admin", "investor");

      const { error } = await supabaseAdmin
        .from("investors")
        .upsert(
          {
            type: "institutional",
            org_id: orgId,
            user_id: null,
          },
          { onConflict: "org_id" }
        );

      if (error) throw new Error("Failed to set investor type: " + error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("investors")
        .upsert(
          {
            type: "institutional",
            user_id: userId,
            org_id: null,
          },
          { onConflict: "user_id" }
        );

      if (error) throw new Error("Failed to set investor type: " + error.message);
    }
  } else {
    const { error } = await supabaseAdmin
      .from("investors")
      .upsert(
        {
          type: "individual",
          user_id: userId,
          org_id: null,
        },
        { onConflict: "user_id" }
      );

    if (error) throw new Error("Failed to set investor type: " + error.message);
  }

  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function updateCurrentStep(step) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;
  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("current_step, type, org_id")
      .eq("org_id", orgId)
      .maybeSingle();
    investor = data;
  }
  if (!investor) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("current_step, type, org_id, user_id")
      .eq("user_id", userId)
      .maybeSingle();
    investor = data;
  }

  const dbStep = investor?.current_step || 1;
  const highestStep = Math.max(dbStep, step);

  if (highestStep > dbStep) {
    const targetEq = investor?.org_id ? { org_id: investor.org_id } : { user_id: userId };
    const { error } = await supabaseAdmin
      .from("investors")
      .update({ current_step: highestStep })
      .match(targetEq);

    if (error) throw new Error("Failed to update current step: " + error.message);
  }

  return { success: true, current_step: highestStep };
}

export async function saveStage1Institutional(data) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Organization context required for Institutional Investors");

  await syncOrganizationAndMembership(orgId, userId, "admin", "investor");

  const payload = {
    type: "institutional",
    org_id: orgId,
    user_id: null,
    legal_entity_name: data.legal_entity_name,
    country: data.country,
    city: data.city,
    email: data.business_email,
    phone: data.business_phone_number,
    business_type: data.business_type,
    license_authority: data.license_authority,
    trade_license_number: encrypt(data.trade_license_number),
    net_worth: data.net_worth ? parseFloat(data.net_worth) : null,
    investment_experience_years: data.investment_experience_years
      ? parseInt(data.investment_experience_years, 10)
      : null,
  };

  const { error } = await supabaseAdmin
    .from("investors")
    .upsert(payload, { onConflict: "org_id" });

  if (error) throw new Error("Failed to save entity details: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function saveStage1Individual(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const payload = {
    type: "individual",
    user_id: userId,
    org_id: null,
    full_name: data.full_name,
    email: data.personal_email,
    phone: data.personal_phone_number,
    country: data.country,
    city: data.city,
    nationality: data.nationality,
    id_number: data.id_number ? encrypt(data.id_number) : null,
    DOB: data.date_of_birth,
    net_worth: data.net_worth ? parseFloat(data.net_worth) : null,
    investment_experience_years: data.investment_experience_years
      ? parseInt(data.investment_experience_years, 10)
      : null,
  };

  const { error } = await supabaseAdmin
    .from("investors")
    .upsert(payload, { onConflict: "user_id" });

  if (error) throw new Error("Failed to save personal info: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function saveStage2Rep(formData) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;
  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id")
      .eq("org_id", orgId)
      .maybeSingle();
    investor = data;
  }
  if (!investor) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id, user_id")
      .eq("user_id", userId)
      .maybeSingle();
    investor = data;
  }

  const isInstitutional = investor?.type === "institutional" || !!orgId;
  const entityId = isInstitutional && orgId ? orgId : userId;

  const repId = formData.get("repId");
  const file = formData.get("file");

  let fileUrl = null;
  if (file && file.size > 0) {
    const fileExt = file.name.split(".").pop();
    const fullName = formData.get("full_name").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const fileName = `${Date.now()}_${fullName}.${fileExt}`;
    
    // STORAGE PATH: investor_reps/{org_id}/{filename} for institutional, investor_reps/{user_id}/{filename} for individual
    const filePath = `${entityId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("investor_reps")
      .upload(filePath, file, { upsert: true });

    if (uploadError)
      throw new Error("Failed to upload representative ID: " + uploadError.message);

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("investor_reps").getPublicUrl(filePath);
    fileUrl = publicUrl;
  }

  const payload = {
    investor_id: entityId,
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
      .eq("investor_id", entityId);
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
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;
  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id")
      .eq("org_id", orgId)
      .maybeSingle();
    investor = data;
  }
  if (!investor) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id, user_id")
      .eq("user_id", userId)
      .maybeSingle();
    investor = data;
  }

  const isInstitutional = investor?.type === "institutional" || !!orgId;
  const entityId = isInstitutional && orgId ? orgId : userId;

  const { data, error: fetchErr } = await supabaseAdmin
    .from("investor_reps")
    .select("id_url")
    .eq("id", repId)
    .eq("investor_id", entityId)
    .single();

  if (fetchErr) throw new Error("Representative not found");

  if (data?.id_url) {
    const path = data.id_url.split("/").pop();
    await supabaseAdmin.storage
      .from("investor_reps")
      .remove([`${entityId}/${path}`]);
  }

  const { error } = await supabaseAdmin
    .from("investor_reps")
    .delete()
    .eq("id", repId)
    .eq("investor_id", entityId);

  if (error)
    throw new Error("Failed to delete representative: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function saveStage3Doc(formData) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;
  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id")
      .eq("org_id", orgId)
      .maybeSingle();
    investor = data;
  }
  if (!investor) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id, user_id")
      .eq("user_id", userId)
      .maybeSingle();
    investor = data;
  }

  const isInstitutional = investor?.type === "institutional" || !!orgId;
  const entityId = isInstitutional && orgId ? orgId : userId;

  const docType = formData.get("doc_type");
  const password = formData.get("document_password");
  const file = formData.get("file");

  if (!docType || !file || file.size === 0) {
    throw new Error("Document type and file are required");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${docType}_${Date.now()}.${fileExt}`;
  
  // STORAGE PATH: investor_docs/{org_id}/{filename} for institutional, investor_docs/{user_id}/{filename} for individual
  const filePath = `${entityId}/${fileName}`;

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
    .eq("investor_id", entityId)
    .eq("doc_type", docType)
    .maybeSingle();

  if (existing) {
    if (existing.url && existing.url !== fileUrl) {
      const oldPath = existing.url.split("/").pop();
      await supabaseAdmin.storage
        .from("investor_docs")
        .remove([`${entityId}/${oldPath}`]);
    }

    const { error } = await supabaseAdmin
      .from("investor_docs")
      .update({
        document_password: password ? encrypt(password) : null,
        url: fileUrl,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error("Failed to update document: " + error.message);
  } else {
    const { error } = await supabaseAdmin.from("investor_docs").insert([
      {
        investor_id: entityId,
        doc_type: docType,
        document_password: password ? encrypt(password) : null,
        url: fileUrl,
        status: "pending",
        uploaded_at: new Date().toISOString(),
      },
    ]);
    if (error) throw new Error("Failed to insert document: " + error.message);
  }

  if (docType === "trade_certificate") {
    const targetEq = isInstitutional && orgId ? { org_id: orgId } : { user_id: userId };
    await supabaseAdmin
      .from("investors")
      .update({ license_verification_status: "pending" })
      .match(targetEq);
  }

  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function updateDocPassword(docType, password) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;
  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id")
      .eq("org_id", orgId)
      .maybeSingle();
    investor = data;
  }
  if (!investor) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id, user_id")
      .eq("user_id", userId)
      .maybeSingle();
    investor = data;
  }

  const isInstitutional = investor?.type === "institutional" || !!orgId;
  const entityId = isInstitutional && orgId ? orgId : userId;

  const { error } = await supabaseAdmin
    .from("investor_docs")
    .update({ document_password: password ? encrypt(password) : null })
    .eq("investor_id", entityId)
    .eq("doc_type", docType);

  if (error) throw new Error("Failed to update document password: " + error.message);

  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function saveStage4Banking(bankDetails) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;
  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id")
      .eq("org_id", orgId)
      .maybeSingle();
    investor = data;
  }
  if (!investor) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id, user_id")
      .eq("user_id", userId)
      .maybeSingle();
    investor = data;
  }

  const isInstitutional = investor?.type === "institutional" || !!orgId;
  const targetEq = isInstitutional && orgId ? { org_id: orgId } : { user_id: userId };

  const { error } = await supabaseAdmin
    .from("investors")
    .update({
      bank_details: { ...bankDetails, iban: encrypt(bankDetails.iban) },
      bank_verification_status: "pending",
    })
    .match(targetEq);

  if (error) throw new Error("Failed to save bank details: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}

export async function submitApplication() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;
  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id")
      .eq("org_id", orgId)
      .maybeSingle();
    investor = data;
  }
  if (!investor) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("type, org_id, user_id")
      .eq("user_id", userId)
      .maybeSingle();
    investor = data;
  }

  const isInstitutional = investor?.type === "institutional" || !!orgId;
  const targetEq = isInstitutional && orgId ? { org_id: orgId } : { user_id: userId };

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
    .match(targetEq);

  if (error) throw new Error("Failed to submit application: " + error.message);
  revalidatePath("/investor-portal/onboarding");
  return { success: true };
}
