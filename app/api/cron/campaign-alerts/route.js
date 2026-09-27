import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request) {
  try {
    // 1. Query all live campaigns
    const { data: projects, error: projErr } = await supabaseAdmin
      .from("projects")
      .select("id, title, slug, currency, campaign_end_date, status")
      .eq("status", "campaign_live");

    if (projErr) {
      console.error("Cron Error fetching live projects:", projErr);
      return NextResponse.json({ success: false, error: projErr.message }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No live projects found." });
    }

    const now = new Date();
    let notificationsGenerated = 0;

    for (const project of projects) {
      if (!project.campaign_end_date) continue;

      const endDate = new Date(project.campaign_end_date);
      const hoursRemaining = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      let matchedWindow = null;
      let notificationText = null;
      let title = null;
      let message = null;

      // Check matching deadline windows (inclusive)
      if (hoursRemaining >= 1416 && hoursRemaining <= 1440) {
        matchedWindow = "60_days";
        notificationText = "60_days_to_deadline";
        title = `60 Days Remaining: ${project.title}`;
        message = `The funding campaign for "${project.title}" closes in 60 days. Secure your pledge commitment before the deadline.`;
      } else if (hoursRemaining >= 696 && hoursRemaining <= 720) {
        matchedWindow = "30_days";
        notificationText = "30_days_to_deadline";
        title = `30 Days Remaining: ${project.title}`;
        message = `Only 30 days remaining for "${project.title}". Campaign deadline is approaching.`;
      } else if (hoursRemaining >= 144 && hoursRemaining <= 168) {
        matchedWindow = "7_days";
        notificationText = "7_days_to_deadline";
        title = `7 Days Remaining: ${project.title}`;
        message = `Final week alert! Only 7 days left to invest in "${project.title}".`;
      } else if (hoursRemaining >= 0 && hoursRemaining <= 24) {
        matchedWindow = "24_hours";
        notificationText = "24_hours_to_deadline";
        title = `24 Hours Final Alert: ${project.title}`;
        message = `Campaign closing in 24 hours! Final opportunity to participate in "${project.title}".`;
      }

      if (matchedWindow && notificationText) {
        // DEDUPLICATION CHECK: Check if notifications table already has entries for this project and textKey
        const { count } = await supabaseAdmin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("project_id", project.id)
          .eq("type", "campaign_alert")
          .eq("notification_text", notificationText);

        if (!count || count === 0) {
          // Query subscribed investors for this project
          const { data: subs } = await supabaseAdmin
            .from("project_notification_subscriptions")
            .select("investor_id")
            .eq("project_id", project.id)
            .eq("notify_campaign_alerts", true);

          if (subs && subs.length > 0) {
            const notificationsToInsert = subs.map((sub) => ({
              investor_id: sub.investor_id,
              project_id: project.id,
              type: "campaign_alert",
              notification_text: notificationText,
              title,
              message,
              read_status: false,
            }));

            const { error: insertErr } = await supabaseAdmin
              .from("notifications")
              .insert(notificationsToInsert);

            if (!insertErr) {
              notificationsGenerated += notificationsToInsert.length;
            } else {
              console.error("Error inserting cron campaign alerts:", insertErr);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedProjects: projects.length,
      notificationsGenerated,
    });
  } catch (err) {
    console.error("Cron Campaign Alerts Exception:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
