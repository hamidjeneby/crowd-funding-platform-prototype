"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { triggerMakeWebhook } from "@/lib/webhook";

/**
 * Resolves the Supabase primary key `id` from the `issuers` table.
 */
async function resolveIssuerEntityId(userId, orgId, userEmail) {
  // 1. Primary lookup: by Clerk org_id
  if (orgId) {
    const { data: issuer } = await supabaseAdmin
      .from("issuers")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();
    if (issuer?.id) return issuer.id;
  }

  // 2. Lookup via memberships / organizations
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (userRow?.id) {
    const { data: membership } = await supabaseAdmin
      .from("memberships")
      .select("organization_id, organizations(org_id)")
      .eq("user_id", userRow.id)
      .maybeSingle();

    const clerkOrgId = membership?.organizations?.org_id;
    if (clerkOrgId) {
      const { data: issuer } = await supabaseAdmin
        .from("issuers")
        .select("id")
        .eq("org_id", clerkOrgId)
        .maybeSingle();
      if (issuer?.id) return issuer.id;
    }
  }

  // 3. Lookup by business_email fallback
  if (userEmail) {
    const { data: issuer } = await supabaseAdmin
      .from("issuers")
      .select("id")
      .eq("business_email", userEmail)
      .maybeSingle();
    if (issuer?.id) return issuer.id;
  }

  // 4. Auto-create initial record if orgId is present
  if (orgId) {
    const { data: newIssuer } = await supabaseAdmin
      .from("issuers")
      .insert({
        org_id: orgId,
        onboarding_status: "incomplete",
        current_step: 1,
        ...(userEmail ? { business_email: userEmail } : {}),
      })
      .select("id")
      .maybeSingle();
    if (newIssuer?.id) return newIssuer.id;
  }

  return null;
}

/**
 * Resolves the Supabase primary key `id` from the `investors` table.
 */
async function resolveInvestorEntityId(userId, orgId, userEmail) {
  // 1. Primary institutional lookup: by Clerk org_id
  if (orgId) {
    const { data: instData } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();
    if (instData?.id) return instData.id;
  }

  // 2. Primary individual lookup: by Clerk user_id
  if (userId) {
    const { data: indData } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (indData?.id) return indData.id;
  }

  // 3. Email fallback
  if (userEmail) {
    const { data: emailData } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();
    if (emailData?.id) return emailData.id;
  }

  // 4. Auto-create initial record if not found
  if (userId) {
    const { data: newInvestor } = await supabaseAdmin
      .from("investors")
      .insert({
        user_id: userId,
        type: orgId ? "institutional" : "individual",
        ...(orgId ? { org_id: orgId } : {}),
        ...(userEmail ? { email: userEmail } : {}),
        onboarding_status: "incomplete",
        current_step: 1,
      })
      .select("id")
      .maybeSingle();
    if (newInvestor?.id) return newInvestor.id;
  }

  return null;
}

/**
 * Creates a support ticket in the `tickets` table and dispatches
 * the ticket payload to the Make.com webhook.
 *
 * @param {Object} params
 * @param {string} params.category - Ticket category (e.g., 'general', 'banking', etc.)
 * @param {string} params.subject - Ticket subject
 * @param {string} params.message - Detailed ticket message
 * @param {string} [params.userType] - Optional explicit user type: 'issuer' | 'investor'
 */
export async function createSupportTicket({
  category,
  subject,
  message,
  userType,
}) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized. Please sign in to submit a ticket." };
  }

  // 1. Basic validation
  const cleanCategory = (category || "general").trim();
  const cleanSubject = (subject || "").trim();
  const cleanMessage = (message || "").trim();

  if (!cleanSubject) {
    return { success: false, error: "Subject is required." };
  }

  if (!cleanMessage) {
    return { success: false, error: "Message details are required." };
  }

  try {
    const user = await currentUser();
    const userEmail =
      user?.emailAddresses?.[0]?.emailAddress ||
      user?.primaryEmailAddress?.emailAddress ||
      "";

    // 2. Determine user type ('issuer' or 'investor')
    let finalUserType = userType ? userType.toLowerCase() : null;
    if (!finalUserType) {
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      finalUserType = (userRow?.role || (orgId ? "issuer" : "investor")).toLowerCase();
    }

    // 3. Resolve the Supabase primary key ID from the issuers or investors table
    let entityId = null;
    if (finalUserType === "issuer") {
      entityId = await resolveIssuerEntityId(userId, orgId, userEmail);
    } else {
      entityId = await resolveInvestorEntityId(userId, orgId, userEmail);
    }

    if (!entityId) {
      return {
        success: false,
        error: `Unable to locate a matching ${finalUserType} profile. Please complete account onboarding first.`,
      };
    }

    // 4. Insert ticket row into `tickets` table with user_id = issuers.id / investors.id
    const { data: ticket, error: insertError } = await supabaseAdmin
      .from("tickets")
      .insert({
        user_type: finalUserType,
        user_id: entityId,
        category: cleanCategory,
        subject: cleanSubject,
        message: cleanMessage,
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !ticket) {
      console.error("[createSupportTicket] Insert error:", insertError);
      return {
        success: false,
        error: insertError?.message || "Failed to create support ticket in database.",
      };
    }

    // 5. Construct webhook payload with type="ticket" and only the ticket table fields
    const webhookPayload = {
      type: "ticket",
      id: ticket.id,
      created_at: ticket.created_at,
      user_type: ticket.user_type,
      user_id: ticket.user_id,
      category: ticket.category,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
    };

    // 6. Trigger Make.com webhook with x-make-apikey header
    await triggerMakeWebhook(webhookPayload);

    return {
      success: true,
      ticket,
    };
  } catch (err) {
    console.error("[createSupportTicket] Unexpected error:", err);
    return {
      success: false,
      error: err.message || "An unexpected error occurred while submitting your ticket.",
    };
  }
}
