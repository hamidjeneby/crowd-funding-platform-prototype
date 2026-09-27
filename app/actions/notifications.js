"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getInvestorPortalData } from "./investor-portal";
import { parseInvestorClass } from "./marketplace";

/**
 * Fetches notification preferences for a specific project for the logged-in investor.
 */
export async function getNotificationSubscription(projectId) {
  const { userId } = await auth();
  if (!userId || !projectId) return null;

  const investor = await getInvestorPortalData();
  if (!investor?.id) return null;

  const { data, error } = await supabaseAdmin
    .from("project_notification_subscriptions")
    .select("*")
    .eq("investor_id", investor.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching notification subscription:", error);
    return null;
  }

  return data;
}

/**
 * Updates or creates manual notification subscription preferences for a project.
 */
export async function updateNotificationSubscription(projectId, preferences) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const investor = await getInvestorPortalData();
  if (!investor?.id) {
    return { success: false, error: "Investor profile not found" };
  }

  const classNum = await parseInvestorClass(investor.investor_class);
  const isClass1To4 = classNum >= 1 && classNum <= 4;

  const payload = {
    investor_id: investor.id,
    project_id: projectId,
    notify_milestones: Boolean(preferences.notify_milestones),
    notify_funding_thresholds: Boolean(preferences.notify_funding_thresholds),
    notify_campaign_alerts: Boolean(preferences.notify_campaign_alerts),
    // Enforce notify_conversion_pool = false for Classes 5-10
    notify_conversion_pool: isClass1To4 ? Boolean(preferences.notify_conversion_pool) : false,
  };

  // Check if subscription row exists
  const { data: existing } = await supabaseAdmin
    .from("project_notification_subscriptions")
    .select("id")
    .eq("investor_id", investor.id)
    .eq("project_id", projectId)
    .maybeSingle();

  let resError = null;

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("project_notification_subscriptions")
      .update(payload)
      .eq("id", existing.id);
    resError = error;
  } else {
    const { error } = await supabaseAdmin
      .from("project_notification_subscriptions")
      .insert(payload);
    resError = error;
  }

  if (resError) {
    console.error("Error updating notification subscription:", resError);
    return { success: false, error: "Failed to save notification preferences." };
  }

  revalidatePath(`/investor-portal/projects/${projectId}`);
  return { success: true };
}

/**
 * Ensures automatic subscriptions (notify_milestones & notify_campaign_alerts) at pledge time.
 */
export async function ensureAutomaticPledgeSubscription(investorId, projectId) {
  if (!investorId || !projectId) return;

  const { data: existing } = await supabaseAdmin
    .from("project_notification_subscriptions")
    .select("*")
    .eq("investor_id", investorId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing?.id) {
    await supabaseAdmin
      .from("project_notification_subscriptions")
      .update({
        notify_milestones: true,
        notify_campaign_alerts: true,
      })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("project_notification_subscriptions")
      .insert({
        investor_id: investorId,
        project_id: projectId,
        notify_milestones: true,
        notify_campaign_alerts: true,
        notify_funding_thresholds: false,
        notify_conversion_pool: false,
      });
  }
}

/**
 * Evaluates funding and conversion pool threshold alerts asynchronously when a new pledge is placed.
 */
export async function evaluateThresholdNotifications(projectId, newPledgeId) {
  if (!projectId || !newPledgeId) return;

  try {
    // 1. Fetch Project with SPV details
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("*, spv_details(*)")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) return;

    // 2. Fetch all active pledges for project
    const { data: pledges } = await supabaseAdmin
      .from("pledges")
      .select("id, pledged_amount, conversion_eligible_units, status")
      .eq("project_id", projectId)
      .not("status", "in", '("cancelled","refunded")');

    if (!pledges || pledges.length === 0) return;

    const newPledge = pledges.find((p) => p.id === newPledgeId);
    if (!newPledge) return;

    const currency = project.currency || "USD";
    const targetGoal = Number(project.target_goal) || 0;

    // --- FUNDING THRESHOLD EVALUATION ---
    if (targetGoal > 0) {
      const totalPledgedAfter = pledges.reduce((sum, p) => sum + Number(p.pledged_amount || 0), 0);
      const newPledgeAmount = Number(newPledge.pledged_amount || 0);
      const totalPledgedBefore = totalPledgedAfter - newPledgeAmount;

      const pctBefore = (totalPledgedBefore / targetGoal) * 100;
      const pctAfter = (totalPledgedAfter / targetGoal) * 100;

      const thresholds = [25, 50, 75, 100];
      const crossedFundingThresholds = [];

      for (const T of thresholds) {
        if (T < 100) {
          if (pctBefore < T && pctAfter >= T) {
            crossedFundingThresholds.push(T);
          }
        } else {
          // 100% threshold check
          if (pctBefore < 100 && pctAfter >= 100) {
            crossedFundingThresholds.push(100);
          }
        }
      }

      if (crossedFundingThresholds.length > 0) {
        // Fetch subscribers for funding thresholds
        const { data: subs } = await supabaseAdmin
          .from("project_notification_subscriptions")
          .select("investor_id")
          .eq("project_id", projectId)
          .eq("notify_funding_thresholds", true);

        if (subs && subs.length > 0) {
          for (const T of crossedFundingThresholds) {
            const textKey = `${T}_percent_funded`;

            // Check if notification textKey already generated for this project
            const { count } = await supabaseAdmin
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId)
              .eq("type", "funding_threshold")
              .eq("notification_text", textKey);

            if (!count || count === 0) {
              const notificationsToInsert = subs.map((sub) => ({
                investor_id: sub.investor_id,
                project_id: projectId,
                type: "funding_threshold",
                notification_text: textKey,
                title: `${project.title} Reached ${T}% Funding!`,
                message: `Project campaign "${project.title}" has officially reached ${T}% of its funding target with ${currency} ${totalPledgedAfter.toLocaleString()} pledged.`,
                read_status: false,
              }));

              await supabaseAdmin.from("notifications").insert(notificationsToInsert);
            }
          }
        }
      }
    }

    // --- CONVERSION POOL THRESHOLD EVALUATION ---
    const isSpvEquity = project.sharia_contract_type === "spv_equity";
    const rawSpv = project.spv_details;
    const spvDetail = Array.isArray(rawSpv) ? rawSpv[0] : rawSpv;

    if (!isSpvEquity && project.is_spv && spvDetail?.conversion_enabled) {
      const totalSharesAuth = Number(spvDetail.total_shares_authorized) || 0;
      const ratioShares = Number(spvDetail.conversion_ratio_shares) || 1;
      const totalConvertibleUnits = ratioShares > 0 ? Math.floor(totalSharesAuth / ratioShares) : 0;

      if (totalConvertibleUnits > 0) {
        const totalConvertedAfter = pledges.reduce(
          (sum, p) => sum + Number(p.conversion_eligible_units || 0),
          0
        );
        const newConvertedUnits = Number(newPledge.conversion_eligible_units || 0);
        const totalConvertedBefore = totalConvertedAfter - newConvertedUnits;

        const pctBeforeConv = (totalConvertedBefore / totalConvertibleUnits) * 100;
        const pctAfterConv = (totalConvertedAfter / totalConvertibleUnits) * 100;

        const thresholds = [25, 50, 75, 100];
        const crossedConvThresholds = [];

        for (const T of thresholds) {
          if (T < 100) {
            if (pctBeforeConv < T && pctAfterConv >= T) {
              crossedConvThresholds.push(T);
            }
          } else {
            if (pctBeforeConv < 100 && pctAfterConv >= 100) {
              crossedConvThresholds.push(100);
            }
          }
        }

        if (crossedConvThresholds.length > 0) {
          // Fetch subscribers with notify_conversion_pool = true AND investor class in 1-4
          const { data: convSubs } = await supabaseAdmin
            .from("project_notification_subscriptions")
            .select(`
              investor_id,
              investors ( investor_class )
            `)
            .eq("project_id", projectId)
            .eq("notify_conversion_pool", true);

          const eligibleSubscribers = (convSubs || []).filter((sub) => {
            const rawCls = sub.investors?.investor_class;
            const classNum = parseInt(String(rawCls || "").replace(/\D/g, ""), 10) || 10;
            return classNum >= 1 && classNum <= 4;
          });

          if (eligibleSubscribers.length > 0) {
            for (const T of crossedConvThresholds) {
              const textKey = `${T}_percent_conversion_pool`;

              const { count } = await supabaseAdmin
                .from("notifications")
                .select("id", { count: "exact", head: true })
                .eq("project_id", projectId)
                .eq("type", "conversion_pool")
                .eq("notification_text", textKey);

              if (!count || count === 0) {
                const notificationsToInsert = eligibleSubscribers.map((sub) => ({
                  investor_id: sub.investor_id,
                  project_id: projectId,
                  type: "conversion_pool",
                  notification_text: textKey,
                  title: `${project.title} Conversion Pool ${T}% Filled`,
                  message: `The equity conversion pool for "${project.title}" is now ${T}% claimed (${totalConvertedAfter.toLocaleString()} of ${totalConvertibleUnits.toLocaleString()} units allocated).`,
                  read_status: false,
                }));

                await supabaseAdmin.from("notifications").insert(notificationsToInsert);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error evaluating threshold notifications:", err);
  }
}

/**
 * Fetches notifications for the currently logged-in investor with pagination and filter support.
 */
export async function getInvestorNotifications(options = {}) {
  const { page = 1, limit = 20, typeFilter = "all" } = options;

  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized - User not logged in" };
    }

    const investor = await getInvestorPortalData();
    if (!investor?.id) {
      return { success: true, notifications: [], totalCount: 0, totalPages: 1, page: 1 };
    }

    let query = supabaseAdmin
      .from("notifications")
      .select("*, projects(id, title, slug)", { count: "exact" })
      .eq("investor_id", investor.id);

    if (typeFilter && typeFilter !== "all") {
      if (typeFilter === "funding_threshold") {
        query = query.or("type.eq.funding_threshold,type.eq.funding_threshhold");
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
      console.error("Error fetching investor notifications:", error);
      return { success: false, error: error.message || "Failed to load notifications" };
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      success: true,
      notifications: data || [],
      totalCount,
      totalPages,
      page,
    };
  } catch (err) {
    console.error("Unexpected error in getInvestorNotifications:", err);
    return { success: false, error: err.message || "Failed to load notifications" };
  }
}

/**
 * Fetches unread notifications for the currently logged-in investor.
 */
export async function getInvestorUnreadNotifications() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, notifications: [] };
    }

    const investor = await getInvestorPortalData();
    if (!investor?.id) {
      return { success: false, notifications: [] };
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*, projects(id, title, slug)")
      .eq("investor_id", investor.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching unread notifications:", error);
      return { success: false, notifications: [] };
    }

    const unread = (data || []).filter((n) => {
      if (n.read_status === undefined || n.read_status === null) return true;
      const str = String(n.read_status).toUpperCase();
      return str === "FALSE" || str === "0";
    });

    return { success: true, notifications: unread };
  } catch (err) {
    console.error("Unexpected error in getInvestorUnreadNotifications:", err);
    return { success: false, notifications: [] };
  }
}

/**
 * Marks a single notification as read for the logged-in investor.
 */
export async function markNotificationAsRead(notificationId) {
  const { userId } = await auth();
  if (!userId || !notificationId) return { success: false };

  const investor = await getInvestorPortalData();
  if (!investor?.id) return { success: false };

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_status: true })
    .eq("id", notificationId)
    .eq("investor_id", investor.id);

  if (error) {
    console.error("Error marking notification read:", error);
    return { success: false };
  }

  revalidatePath("/investor-portal/notifications");
  revalidatePath("/investor-portal");
  return { success: true };
}

/**
 * Marks all notifications as read for the logged-in investor.
 */
export async function markAllNotificationsAsRead() {
  const { userId } = await auth();
  if (!userId) return { success: false };

  const investor = await getInvestorPortalData();
  if (!investor?.id) return { success: false };

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_status: true })
    .eq("investor_id", investor.id);

  if (error) {
    console.error("Error marking all notifications read:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/investor-portal/notifications");
  revalidatePath("/investor-portal");
  return { success: true };
}
