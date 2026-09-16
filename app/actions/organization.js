"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Syncs organization type to Supabase `organizations` table AND updates Clerk Organization publicMetadata.
 * Ensures metadata.type = "investor" (or "issuer") and metadata.role = "investor" (or "issuer").
 */
export async function syncOrganizationTypeAndMetadata(orgId, orgType) {
  if (!orgId || !orgType) return;

  // 1. Update/Upsert Supabase `organizations` table
  await supabaseAdmin
    .from("organizations")
    .upsert({ org_id: orgId, type: orgType }, { onConflict: "org_id" });

  // 2. Update Clerk Organization publicMetadata
  try {
    const client = await clerkClient();
    await client.organizations.updateOrganizationMetadata(orgId, {
      publicMetadata: { type: orgType, role: orgType },
    });
  } catch (err) {
    console.error("Error updating Clerk organization metadata:", err);
  }
}

/**
 * Server action to create and send an organization invitation using Clerk SDK.
 * Passes redirectUrl pointing directly to ${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation.
 */
export async function sendOrganizationInvitation({ organizationId, emailAddress, role = "org:member" }) {
  if (!organizationId || !emailAddress) {
    throw new Error("Organization ID and email address are required.");
  }

  const client = await clerkClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUrl = `${baseUrl}/accept-invitation`;

  try {
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId,
      emailAddress,
      role,
      redirectUrl,
    });
    return { success: true, invitation };
  } catch (error) {
    console.error("Error creating organization invitation:", error);
    return { success: false, error: error.message || "Failed to send invitation." };
  }
}

/**
 * Checks the organization type in Supabase/Issuers table.
 * If the organization is an issuer organization, updates the user's role to "issuer" in both DB and Clerk metadata.
 */
export async function getOrganizationTypeAndSyncRole(orgId, userId) {
  if (!orgId || !userId) return { role: "investor", isIssuerOrg: false };

  // Check if organization exists in issuers table or organizations table with type "issuer"
  const { data: issuerData } = await supabaseAdmin
    .from("issuers")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  const { data: orgData } = await supabaseAdmin
    .from("organizations")
    .select("type")
    .eq("org_id", orgId)
    .maybeSingle();

  const isIssuerOrg = !!issuerData || orgData?.type === "issuer";
  const targetRole = isIssuerOrg ? "issuer" : "investor";

  // Update Supabase users table
  await supabaseAdmin
    .from("users")
    .update({ role: targetRole })
    .eq("user_id", userId);

  // Update Clerk user publicMetadata & unsafeMetadata
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: targetRole },
      unsafeMetadata: { role: targetRole },
    });
  } catch (err) {
    console.error("Error updating Clerk user metadata in getOrganizationTypeAndSyncRole:", err);
  }

  return { role: targetRole, isIssuerOrg };
}
