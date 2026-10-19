"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

/**
 * Resolves the authenticated issuer profile for the currently logged-in user / organization.
 */
async function getIssuerForSession() {
  const { userId, orgId } = await auth();
  if (!userId) return null;

  if (orgId) {
    const { data: issuer } = await supabaseAdmin
      .from("issuers")
      .select("id, org_id, legal_entity_name")
      .eq("org_id", orgId)
      .maybeSingle();
    if (issuer) return issuer;
  }

  // Fallback: lookup by user's clerk ID in organizations/issuers if orgId not active in session
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
        .select("id, org_id, legal_entity_name")
        .eq("org_id", clerkOrgId)
        .maybeSingle();
      if (issuer) return issuer;
    }
  }

  return null;
}

/**
 * Fetches notifications for the logged-in issuer with optional pagination and tab filtering.
 */
export async function getIssuerNotifications(options = {}) {
  const { page = 1, limit = 20, typeFilter = "all", requiresActionOnly = false } = options;

  try {
    const issuer = await getIssuerForSession();
    if (!issuer?.id) {
      return { success: true, notifications: [], totalCount: 0, totalPages: 1, page: 1, unreadCount: 0, actionRequiredCount: 0 };
    }

    let query = supabaseAdmin
      .from("issuer_notifications")
      .select("*", { count: "exact" })
      .eq("issuer_id", issuer.id);

    if (requiresActionOnly) {
      query = query.eq("requires_action", true).eq("read_status", false);
    } else if (typeFilter && typeFilter !== "all") {
      if (typeFilter === "action_required") {
        query = query.eq("requires_action", true).eq("read_status", false);
      } else if (typeFilter === "compliance") {
        query = query.in("type", ["kyb_approved", "kyb_rejected", "bank_verified", "bank_rejected"]);
      } else if (typeFilter === "project_reviews") {
        query = query.in("type", ["project_approved", "project_changes_requested", "campaign_live", "sharia_certified"]);
      } else if (typeFilter === "milestones") {
        query = query.in("type", ["milestone_approved", "milestone_rejected"]);
      } else if (typeFilter === "campaign_funding") {
        query = query.in("type", [
          "pledge_recieved",
          "funding_threshold",
          "soft_cap_reached",
          "hard_cap_reached",
          "campaign_funded",
          "campaign_failed",
        ]);
      } else {
        query = query.eq("type", typeFilter);
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[issuer-notifications] Error fetching notifications:", error);
      return { success: false, error: error.message };
    }

    // Unread count
    const { count: unreadCount } = await supabaseAdmin
      .from("issuer_notifications")
      .select("id", { count: "exact", head: true })
      .eq("issuer_id", issuer.id)
      .eq("read_status", false);

    // Action required count
    const { count: actionRequiredCount } = await supabaseAdmin
      .from("issuer_notifications")
      .select("id", { count: "exact", head: true })
      .eq("issuer_id", issuer.id)
      .eq("requires_action", true)
      .eq("read_status", false);

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      success: true,
      notifications: data || [],
      totalCount,
      totalPages,
      page,
      unreadCount: unreadCount || 0,
      actionRequiredCount: actionRequiredCount || 0,
    };
  } catch (err) {
    console.error("[issuer-notifications] Unexpected error in getIssuerNotifications:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Quick fetch of unread notifications for the issuer toast notification stack.
 */
export async function getIssuerUnreadNotifications() {
  try {
    const issuer = await getIssuerForSession();
    if (!issuer?.id) {
      return { success: true, notifications: [] };
    }

    const { data, error } = await supabaseAdmin
      .from("issuer_notifications")
      .select("*")
      .eq("issuer_id", issuer.id)
      .eq("read_status", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[issuer-notifications] Error fetching unread notifications:", error);
      return { success: false, notifications: [] };
    }

    return { success: true, notifications: data || [] };
  } catch (err) {
    console.error("[issuer-notifications] Unexpected error in getIssuerUnreadNotifications:", err);
    return { success: false, notifications: [] };
  }
}

/**
 * Marks a single issuer notification as read (read_status = true).
 */
export async function markIssuerNotificationAsRead(notificationId) {
  if (!notificationId) return { success: false };

  try {
    const issuer = await getIssuerForSession();
    if (!issuer?.id) return { success: false, error: "Unauthorized" };

    const { error } = await supabaseAdmin
      .from("issuer_notifications")
      .update({ read_status: true })
      .eq("id", notificationId)
      .eq("issuer_id", issuer.id);

    if (error) {
      console.error("[issuer-notifications] Error marking notification as read:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[issuer-notifications] Unexpected error in markIssuerNotificationAsRead:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Marks all notifications for the active issuer as read.
 */
export async function markAllIssuerNotificationsAsRead() {
  try {
    const issuer = await getIssuerForSession();
    if (!issuer?.id) return { success: false, error: "Unauthorized" };

    const { error } = await supabaseAdmin
      .from("issuer_notifications")
      .update({ read_status: true })
      .eq("issuer_id", issuer.id)
      .eq("read_status", false);

    if (error) {
      console.error("[issuer-notifications] Error marking all notifications as read:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[issuer-notifications] Unexpected error in markAllIssuerNotificationsAsRead:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Core primitive to insert a row into issuer_notifications table.
 */
export async function createIssuerNotification({
  issuerId,
  type,
  title,
  message,
  notificationText,
  requiresAction = false,
  actionUrl = null,
}) {
  if (!issuerId) {
    console.warn("[issuer-notifications] Cannot insert notification: missing issuerId");
    return { success: false, error: "Missing issuerId" };
  }

  try {
    const payload = {
      issuer_id: Number(issuerId),
      type,
      title,
      message,
      notification_text: notificationText || null,
      requires_action: Boolean(requiresAction),
      action_url: actionUrl || null,
      read_status: false,
    };

    const { data, error } = await supabaseAdmin
      .from("issuer_notifications")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[issuer-notifications] Database error inserting notification:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/issuer-portal/notifications");
    return { success: true, notification: data };
  } catch (err) {
    console.error("[issuer-notifications] Unexpected error inserting notification:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Evaluates and dispatches issuer notifications when a pledge is made into a project:
 * 1. Immediate "pledge_recieved" notification
 * 2. 50% Funding Threshold boundary check
 * 3. 100% Funding Threshold boundary check
 * 4. Soft Cap boundary check
 * 5. Hard Cap boundary check
 */
export async function notifyIssuerPledgeAndThresholds(projectId, newPledgeId) {
  if (!projectId || !newPledgeId) return;

  try {
    // 1. Fetch project details
    const { data: project, error: projErr } = await supabaseAdmin
      .from("projects")
      .select("id, issuer_id, title, slug, currency, target_goal, soft_cap, hard_cap")
      .eq("id", projectId)
      .maybeSingle();

    if (projErr || !project || !project.issuer_id) {
      return;
    }

    const currency = project.currency || "USD";
    const targetGoal = Number(project.target_goal) || 0;
    const softCap = Number(project.soft_cap) || 0;
    const hardCap = Number(project.hard_cap) || 0;

    // 2. Fetch all active pledges for project
    const { data: pledges } = await supabaseAdmin
      .from("pledges")
      .select("id, pledged_amount, status")
      .eq("project_id", projectId)
      .not("status", "in", '("cancelled","refunded","rejected_oversubscribed")');

    if (!pledges || pledges.length === 0) return;

    const newPledge = pledges.find((p) => p.id === newPledgeId);
    if (!newPledge) return;

    const newPledgeAmount = Number(newPledge.pledged_amount || 0);
    const totalAfter = pledges.reduce((sum, p) => sum + Number(p.pledged_amount || 0), 0);
    const totalBefore = totalAfter - newPledgeAmount;

    // 3. Immediate Pledge Received Notification
    await createIssuerNotification({
      issuerId: project.issuer_id,
      type: "pledge_recieved",
      title: "New Pledge Received",
      message: `An investor has pledged ${currency} ${newPledgeAmount.toLocaleString()} into "${project.title}".`,
      notificationText: `pledge_recieved_${newPledgeId}`,
      requiresAction: false,
      actionUrl: null,
    });

    // Helper for threshold deduplication check
    async function hasThresholdNotification(textKey) {
      const { count } = await supabaseAdmin
        .from("issuer_notifications")
        .select("id", { count: "exact", head: true })
        .eq("issuer_id", project.issuer_id)
        .eq("notification_text", textKey);
      return Boolean(count && count > 0);
    }

    // 4. Check 50% Subscription Threshold
    if (targetGoal > 0) {
      const goal50 = targetGoal * 0.5;
      if (totalBefore < goal50 && totalAfter >= goal50) {
        const textKey = `project_${project.id}_50_percent_funded`;
        const exists = await hasThresholdNotification(textKey);
        if (!exists) {
          await createIssuerNotification({
            issuerId: project.issuer_id,
            type: "funding_threshold",
            title: "50% Target Subscribed",
            message: `"${project.title}" has officially reached 50% subscribed with ${currency} ${totalAfter.toLocaleString()} pledged.`,
            notificationText: textKey,
            requiresAction: false,
            actionUrl: null,
          });
        }
      }

      // 5. Check 100% Subscription Threshold
      if (totalBefore < targetGoal && totalAfter >= targetGoal) {
        const textKey = `project_${project.id}_100_percent_funded`;
        const exists = await hasThresholdNotification(textKey);
        if (!exists) {
          await createIssuerNotification({
            issuerId: project.issuer_id,
            type: "funding_threshold",
            title: "100% Target Subscribed",
            message: `"${project.title}" has officially reached 100% subscribed with ${currency} ${totalAfter.toLocaleString()} pledged!`,
            notificationText: textKey,
            requiresAction: false,
            actionUrl: null,
          });
        }
      }
    }

    // 6. Check Soft Cap Reached
    if (softCap > 0 && totalBefore < softCap && totalAfter >= softCap) {
      const textKey = `project_${project.id}_soft_cap_reached`;
      const exists = await hasThresholdNotification(textKey);
      if (!exists) {
        await createIssuerNotification({
          issuerId: project.issuer_id,
          type: "soft_cap_reached",
          title: "Soft Cap Reached",
          message: `Congratulations! "${project.title}" has officially reached its soft cap of ${currency} ${softCap.toLocaleString()}.`,
          notificationText: textKey,
          requiresAction: false,
          actionUrl: null,
        });
      }
    }

    // 7. Check Hard Cap Reached
    if (hardCap > 0 && totalBefore < hardCap && totalAfter >= hardCap) {
      const textKey = `project_${project.id}_hard_cap_reached`;
      const exists = await hasThresholdNotification(textKey);
      if (!exists) {
        await createIssuerNotification({
          issuerId: project.issuer_id,
          type: "hard_cap_reached",
          title: "Hard Cap Reached",
          message: `"${project.title}" has reached its hard cap of ${currency} ${hardCap.toLocaleString()}. The campaign is now fully subscribed!`,
          notificationText: textKey,
          requiresAction: false,
          actionUrl: null,
        });
      }
    }
  } catch (err) {
    console.error("[issuer-notifications] Error in notifyIssuerPledgeAndThresholds:", err);
  }
}

/**
 * Dispatches an issuer notification when an auditor reviews a project milestone.
 */
export async function notifyIssuerMilestoneDecision(milestoneId, decision, rejectionReason = null) {
  if (!milestoneId) return;

  try {
    const { data: milestone, error } = await supabaseAdmin
      .from("project_milestones")
      .select("id, title, project_id, projects(id, title, slug, issuer_id)")
      .eq("id", milestoneId)
      .maybeSingle();

    if (error || !milestone || !milestone.projects?.issuer_id) {
      return;
    }

    const issuerId = milestone.projects.issuer_id;
    const projectTitle = milestone.projects.title || "Project";
    const projectSlug = milestone.projects.slug;
    const normalized = String(decision || "").toLowerCase().trim();

    if (normalized === "approved" || normalized === "approve") {
      await createIssuerNotification({
        issuerId,
        type: "milestone_approved",
        title: "Milestone Approved",
        message: `Milestone "${milestone.title}" for "${projectTitle}" has been approved by the auditor.`,
        notificationText: `milestone_${milestoneId}_approved`,
        requiresAction: false,
        actionUrl: null,
      });
    } else if (normalized === "rejected" || normalized === "reject") {
      await createIssuerNotification({
        issuerId,
        type: "milestone_rejected",
        title: "Milestone Rejected - Action Required",
        message: `Milestone "${milestone.title}" for "${projectTitle}" was rejected. Please review auditor feedback, edit the milestone, and resubmit.`,
        notificationText: `milestone_${milestoneId}_rejected_${Date.now()}`,
        requiresAction: true,
        actionUrl: `/issuer-portal/projects/${projectSlug || milestone.projects?.id}/manage`,
      });
    }
  } catch (err) {
    console.error("[issuer-notifications] Error in notifyIssuerMilestoneDecision:", err);
  }
}

/**
 * Dispatches an issuer notification when an auditor finalizes the KYB onboarding review.
 */
export async function notifyIssuerKybDecision(issuerId, decision, reviewNotes = null) {
  if (!issuerId) return;

  try {
    const normalized = String(decision || "").toLowerCase().trim();

    if (normalized === "approve" || normalized === "approved" || normalized === "completed") {
      await createIssuerNotification({
        issuerId,
        type: "kyb_approved",
        title: "Company Verification Approved",
        message: "Your company verification and KYB compliance have been approved. You can now create and manage fundraising campaigns.",
        notificationText: "kyb_approved",
        requiresAction: false,
        actionUrl: null,
      });
    } else if (
      normalized === "send_back" ||
      normalized === "sent_back" ||
      normalized === "incomplete" ||
      normalized === "reject" ||
      normalized === "rejected"
    ) {
      await createIssuerNotification({
        issuerId,
        type: "kyb_rejected",
        title: "Onboarding Action Required",
        message: "Your onboarding submission was returned for revisions. Please review the feedback and resubmit your details.",
        notificationText: `kyb_returned_${Date.now()}`,
        requiresAction: true,
        actionUrl: "/issuer-portal/onboarding",
      });
    }
  } catch (err) {
    console.error("[issuer-notifications] Error in notifyIssuerKybDecision:", err);
  }
}

/**
 * Dispatches an issuer notification when an auditor verifies or rejects bank details.
 */
export async function notifyIssuerBankDecision(issuerId, decision, rejectionReason = null) {
  if (!issuerId) return;

  try {
    const normalized = String(decision || "").toLowerCase().trim();

    if (normalized === "approved" || normalized === "approve") {
      await createIssuerNotification({
        issuerId,
        type: "bank_verified",
        title: "Bank Details Verified",
        message: "Your corporate bank details and verification letter have been approved.",
        notificationText: "bank_verified",
        requiresAction: false,
        actionUrl: null,
      });
    } else if (normalized === "rejected" || normalized === "reject") {
      await createIssuerNotification({
        issuerId,
        type: "bank_rejected",
        title: "Bank Verification Rejected - Action Required",
        message: "Your submitted bank details could not be verified. Please update your banking information in account settings with valid proof.",
        notificationText: `bank_rejected_${Date.now()}`,
        requiresAction: true,
        actionUrl: "/issuer-portal/account",
      });
    }
  } catch (err) {
    console.error("[issuer-notifications] Error in notifyIssuerBankDecision:", err);
  }
}

/**
 * Dispatches an issuer notification when an auditor reviews a project submission:
 * - Approved: triggers both "project_approved" and "campaign_live"
 * - Sent back / Rejected: triggers "project_changes_requested" (requires action)
 */
export async function notifyIssuerProjectDecision(projectId, decision, reviewNotes = null) {
  if (!projectId) return;

  try {
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, title, slug, issuer_id")
      .eq("id", projectId)
      .maybeSingle();

    if (error || !project || !project.issuer_id) return;

    const normalized = String(decision || "").toLowerCase().trim();

    if (normalized === "approve" || normalized === "approved") {
      // 1. Project approved
      await createIssuerNotification({
        issuerId: project.issuer_id,
        type: "project_approved",
        title: "Project Approved",
        message: `Your project proposal "${project.title}" has been approved by the platform auditor.`,
        notificationText: `project_${project.id}_approved`,
        requiresAction: false,
        actionUrl: null,
      });

      // 2. Campaign is live
      await createIssuerNotification({
        issuerId: project.issuer_id,
        type: "campaign_live",
        title: "Campaign is Live",
        message: `"${project.title}" is now officially live on the marketplace and open for investor pledges.`,
        notificationText: `project_${project.id}_campaign_live`,
        requiresAction: false,
        actionUrl: null,
      });
    } else if (
      normalized === "send_back" ||
      normalized === "sent_back" ||
      normalized === "reject" ||
      normalized === "rejected"
    ) {
      await createIssuerNotification({
        issuerId: project.issuer_id,
        type: "project_changes_requested",
        title: "Project Changes Requested",
        message: `Your project submission "${project.title}" requires revisions. Please review the auditor notes, make changes, and resubmit.`,
        notificationText: `project_${project.id}_changes_requested_${Date.now()}`,
        requiresAction: true,
        actionUrl: `/issuer-portal/projects/${project.slug || project.id}/edit`,
      });
    }
  } catch (err) {
    console.error("[issuer-notifications] Error in notifyIssuerProjectDecision:", err);
  }
}

/**
 * Dispatches an issuer notification when an auditor uploads and marks Shariah certification.
 */
export async function notifyIssuerShariahCompliance(projectId) {
  if (!projectId) return;

  try {
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, title, issuer_id")
      .eq("id", projectId)
      .maybeSingle();

    if (error || !project || !project.issuer_id) return;

    await createIssuerNotification({
      issuerId: project.issuer_id,
      type: "sharia_certified",
      title: "Shariah Certification Issued",
      message: `Shariah compliance certification has been issued for "${project.title}".`,
      notificationText: `project_${project.id}_sharia_certified`,
      requiresAction: false,
      actionUrl: null,
    });
  } catch (err) {
    console.error("[issuer-notifications] Error in notifyIssuerShariahCompliance:", err);
  }
}
