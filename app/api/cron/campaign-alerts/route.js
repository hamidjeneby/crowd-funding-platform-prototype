import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds maximum execution duration for serverless runtimes

// Helper to chunk large arrays into safe database batches
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function GET(request) {
  try {
    // 1. Query all live campaigns in one efficient query
    const { data: projects, error: projErr } = await supabaseAdmin
      .from("projects")
      .select("id, title, slug, currency, campaign_end_date, status")
      .eq("status", "campaign_live");

    if (projErr) {
      console.error("Cron Error fetching live projects:", projErr);
      return NextResponse.json({ success: false, error: projErr.message }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        success: true,
        processedProjects: 0,
        matchingProjects: 0,
        notificationsGenerated: 0,
        message: "No live projects found.",
      });
    }

    const now = new Date();

    // 2. Filter matching projects in-memory (< 1ms CPU time)
    const matchingTasks = [];

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
        matchingTasks.push({
          project,
          matchedWindow,
          notificationText,
          title,
          message,
        });
      }
    }

    // If no projects hit any deadline window today, return immediately
    if (matchingTasks.length === 0) {
      return NextResponse.json({
        success: true,
        processedProjects: projects.length,
        matchingProjects: 0,
        notificationsGenerated: 0,
        message: "No projects currently in a deadline notification window.",
      });
    }

    // 3. Process all matching projects in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      matchingTasks.map(async (task) => {
        const { project, notificationText, title, message } = task;

        // DEDUPLICATION CHECK: Ensure no duplicate campaign alerts exist
        const { count, error: countErr } = await supabaseAdmin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("project_id", project.id)
          .eq("type", "campaign_alert")
          .eq("notification_text", notificationText);

        if (countErr) {
          throw new Error(`Failed to check deduplication for project #${project.id}: ${countErr.message}`);
        }

        if (count && count > 0) {
          // Already dispatched previously for this window
          return { projectId: project.id, inserted: 0, skipped: true };
        }

        // Query subscribed investors for this project
        const { data: subs, error: subsErr } = await supabaseAdmin
          .from("project_notification_subscriptions")
          .select("investor_id")
          .eq("project_id", project.id)
          .eq("notify_campaign_alerts", true);

        if (subsErr) {
          throw new Error(`Failed to query subscribers for project #${project.id}: ${subsErr.message}`);
        }

        if (!subs || subs.length === 0) {
          return { projectId: project.id, inserted: 0, noSubscribers: true };
        }

        const notificationsToInsert = subs.map((sub) => ({
          investor_id: sub.investor_id,
          project_id: project.id,
          type: "campaign_alert",
          notification_text: notificationText,
          title,
          message,
          read_status: "false",
        }));

        // Batch insert in chunks of 500 to protect against payload limit boundaries
        const chunks = chunkArray(notificationsToInsert, 500);
        let insertedForProject = 0;

        for (const chunk of chunks) {
          const { error: insertErr } = await supabaseAdmin
            .from("notifications")
            .insert(chunk);

          if (insertErr) {
            throw new Error(`Error inserting alerts for project #${project.id}: ${insertErr.message}`);
          }
          insertedForProject += chunk.length;
        }

        return { projectId: project.id, inserted: insertedForProject };
      })
    );

    let totalNotificationsGenerated = 0;
    const taskErrors = [];

    for (const res of results) {
      if (res.status === "fulfilled") {
        totalNotificationsGenerated += res.value.inserted || 0;
      } else {
        console.error("Campaign alert subtask failed:", res.reason);
        taskErrors.push(res.reason?.message || "Unknown error");
      }
    }

    return NextResponse.json({
      success: true,
      processedProjects: projects.length,
      matchingProjects: matchingTasks.length,
      notificationsGenerated: totalNotificationsGenerated,
      errors: taskErrors.length > 0 ? taskErrors : undefined,
    });
  } catch (err) {
    console.error("Cron Campaign Alerts Exception:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
