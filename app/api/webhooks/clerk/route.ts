import { Webhook } from "svix";
import { WebhookEvent, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new Response("Server Error", { status: 500 });
  }

  if (!supabaseAdmin) {
    console.error("Missing Supabase Service Role configuration");
    return new Response("Server Error - Database Client Unconfigured", { status: 500 });
  }

  // Get headers from standard Request object
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- missing svix headers", {
      status: 400,
    });
  }

  // Get body
  let payload: any;
  try {
    payload = await req.json();
  } catch (err) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  // Verify payload signature
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  // Process event type
  try {
    const eventType = evt.type;

    // ----------------------------------------------------
    // 1. User Created
    // ----------------------------------------------------
    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, public_metadata, unsafe_metadata } =
        evt.data;
      const role = (public_metadata?.role || unsafe_metadata?.role) as string | undefined;

      const email = email_addresses?.[0]?.email_address || "";
      const firstName = first_name || "";
      const lastName = last_name || "";

      const userData = {
        user_id: id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: role || "user",
      };

      const { error: userError } = await supabaseAdmin
        .from("users")
        .upsert([userData], { onConflict: "user_id" });

      if (userError) throw userError;

      if (role === "investor") {
        await supabaseAdmin
          .from("investors")
          .upsert([{ user_id: id }], { onConflict: "user_id" });
      }
    }

    // ----------------------------------------------------
    // 2. User Updated
    // ----------------------------------------------------
    if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, public_metadata, unsafe_metadata } =
        evt.data;
      const role = (public_metadata?.role || unsafe_metadata?.role) as string | undefined;

      const email = email_addresses?.[0]?.email_address || "";
      const firstName = first_name || "";
      const lastName = last_name || "";

      const updateData: any = {
        email,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      };

      if (role) {
        updateData.role = role;
      }

      const { error } = await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("user_id", id);

      if (error) throw error;
    }

    // ----------------------------------------------------
    // 3. User Deleted
    // ----------------------------------------------------
    if (eventType === "user.deleted") {
      const { id } = evt.data;
      if (id) {
        // Delete user's memberships first, then delete user record
        await supabaseAdmin.from("memberships").delete().eq("user_id", id);
        await supabaseAdmin.from("users").delete().eq("user_id", id);
      }
    }

    // ----------------------------------------------------
    // 4. Organization Created
    // ----------------------------------------------------
    if (eventType === "organization.created") {
      const { id, name, created_by } = evt.data;

      let orgType = "investor";
      if (created_by) {
        const { data: creator } = await supabaseAdmin
          .from("users")
          .select("role")
          .eq("user_id", created_by)
          .maybeSingle();

        if (creator?.role === "issuer") {
          orgType = "issuer";
        }
      }

      const orgData = {
        org_id: id,
        org_name: name || id,
        created_by: created_by || null,
        type: orgType,
      };

      const { error } = await supabaseAdmin
        .from("organizations")
        .upsert([orgData], { onConflict: "org_id" });

      if (error) {
        console.error("Error syncing organization.created:", error);
        throw error;
      }

      // Update Clerk organization publicMetadata to tag it as investor or issuer
      try {
        const client = await clerkClient();
        await client.organizations.updateOrganizationMetadata(id, {
          publicMetadata: { type: orgType, role: orgType },
        });
      } catch (metaErr) {
        console.error("Error setting Clerk organization metadata in webhook:", metaErr);
      }

      if (orgType === "issuer") {
        const { data: existingIssuer } = await supabaseAdmin
          .from("issuers")
          .select("id")
          .eq("org_id", id)
          .maybeSingle();

        if (!existingIssuer) {
          await supabaseAdmin.from("issuers").insert({
            org_id: id,
            onboarding_status: "incomplete",
          });
        }
      }
    }

    // ----------------------------------------------------
    // 5. Organization Deleted
    // ----------------------------------------------------
    if (eventType === "organization.deleted") {
      const { id } = evt.data;
      if (id) {
        // Delete organization memberships first, then delete organization record
        await supabaseAdmin.from("memberships").delete().eq("org_id", id);
        await supabaseAdmin.from("organizations").delete().eq("org_id", id);
      }
    }

    // ----------------------------------------------------
    // 6. Organization Membership Created / Updated
    // ----------------------------------------------------
    if (
      eventType === "organizationMembership.created" ||
      eventType === "organizationMembership.updated"
    ) {
      const { id: mem_id, organization, public_user_data, role } = evt.data;
      const org_id = organization?.id;
      const user_id = public_user_data?.user_id;

      if (org_id && user_id) {
        // Format Clerk role string (e.g. "org:admin" -> "admin", "org:member" -> "member")
        let cleanRole = "member";
        if (role) {
          if (role.includes("admin")) {
            cleanRole = "admin";
          } else {
            cleanRole = role.replace(/^org:/, "") || "member";
          }
        } else {
          // Check if user is the creator of the organization
          const { data: orgData } = await supabaseAdmin
            .from("organizations")
            .select("created_by")
            .eq("org_id", org_id)
            .maybeSingle();

          if (orgData?.created_by === user_id) {
            cleanRole = "admin";
          }
        }

        const membershipData = {
          org_id,
          membership_id: mem_id || `mem_${org_id}_${user_id}`,
          user_id,
          role: cleanRole,
        };

        const { error } = await supabaseAdmin
          .from("memberships")
          .upsert([membershipData], { onConflict: "membership_id" });

        if (error) {
          console.error(`Error syncing ${eventType}:`, error);
          throw error;
        }

        // Check if organization is an issuer org, and sync user role to "issuer"
        const { data: orgRecord } = await supabaseAdmin
          .from("organizations")
          .select("type")
          .eq("org_id", org_id)
          .maybeSingle();

        const { data: issuerRecord } = await supabaseAdmin
          .from("issuers")
          .select("id")
          .eq("org_id", org_id)
          .maybeSingle();

        if (orgRecord?.type === "issuer" || issuerRecord) {
          await supabaseAdmin
            .from("users")
            .update({ role: "issuer" })
            .eq("user_id", user_id);

          try {
            const client = await clerkClient();
            await client.users.updateUserMetadata(user_id, {
              publicMetadata: { role: "issuer" },
              unsafeMetadata: { role: "issuer" },
            });
          } catch (metadataErr) {
            console.error("Error updating user metadata in webhook:", metadataErr);
          }
        }
      }
    }

    // ----------------------------------------------------
    // 7. Organization Membership Deleted / membership.deleted
    // ----------------------------------------------------
    if (
      eventType === "organizationMembership.deleted" ||
      (eventType as string) === "membership.deleted"
    ) {
      const { id: mem_id, organization, public_user_data } = evt.data as any;
      const org_id = organization?.id;
      const user_id = public_user_data?.user_id;

      if (mem_id) {
        await supabaseAdmin.from("memberships").delete().eq("membership_id", mem_id);
      }
      if (org_id && user_id) {
        await supabaseAdmin.from("memberships").delete().match({ org_id, user_id });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Clerk Webhook Database Sync Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Database sync error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
