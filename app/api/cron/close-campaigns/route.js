import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { closeProject } from "@/lib/closing/closeProject";

function verifyCronSecret(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }
  const authHeader =
    request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return authHeader === `Bearer ${cronSecret}`;
}

async function handleCloseCampaignsCron(request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. In one atomic SQL update (via claim_overdue_projects_for_closing RPC):
    //    - Claim every project with status = 'campaign_live' and campaign_end_date <= now()
    //    - Re-claim projects with status = 'closing', allocation_status <> 'complete', and closed_at older than 15m
    //    - Set status = 'closing', closed_at = now(), close_attempts = close_attempts + 1
    let claimedRows = [];
    const { data: rpcClaimed, error: rpcErr } = await supabaseAdmin.rpc(
      "claim_overdue_projects_for_closing"
    );

    if (!rpcErr && Array.isArray(rpcClaimed)) {
      claimedRows = rpcClaimed;
    } else {
      // Fallback if RPC is not yet created
      const nowIso = new Date().toISOString();
      const staleIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data: candidates, error: findErr } = await supabaseAdmin
        .from("projects")
        .select("id, close_attempts")
        .or(
          `and(status.eq.campaign_live,campaign_end_date.lte.${nowIso}),and(status.eq.closing,allocation_status.neq.complete,closed_at.lte.${staleIso})`
        );

      if (findErr) {
        throw new Error(`Failed to query overdue projects: ${findErr.message}`);
      }

      for (const c of candidates || []) {
        const { data: updated } = await supabaseAdmin
          .from("projects")
          .update({
            status: "closing",
            closed_at: nowIso,
            close_attempts: (Number(c.close_attempts) || 0) + 1,
          })
          .eq("id", c.id)
          .neq("allocation_status", "complete")
          .select("id, title, status, allocation_status, closed_at, close_attempts")
          .maybeSingle();

        if (updated) {
          claimedRows.push(updated);
        }
      }
    }

    const claimedIds = claimedRows.map((r) => Number(r.id));

    // 2. Dispatch one background worker job per claimed project using Next.js `after()`
    //    (delegates to Vercel waitUntil in production and runs after response flush in Node.js)
    if (claimedIds.length > 0) {
      const origin = new URL(request.url).origin;
      const cronSecret = process.env.CRON_SECRET;

      after(async () => {
        await Promise.allSettled(
          claimedIds.map(async (projectId) => {
            try {
              const res = await fetch(`${origin}/api/internal/close-project`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${cronSecret}`,
                },
                body: JSON.stringify({ projectId }),
              });

              if (!res.ok) {
                const errBody = await res.text().catch(() => "");
                console.error(
                  `[Cron Worker Dispatch] Worker returned HTTP ${res.status} for project ${projectId}: ${errBody}`
                );
              }
            } catch (fetchErr) {
              console.warn(
                `[Cron Worker Dispatch] HTTP worker call failed for project ${projectId}, running closeProject directly:`,
                fetchErr?.message
              );
              try {
                await closeProject(projectId, { dryRun: false });
              } catch (directErr) {
                console.error(
                  `[Cron Worker Dispatch] Direct closeProject error for project ${projectId}:`,
                  directErr?.message
                );
              }
            }
          })
        );
      });
    }

    return NextResponse.json({
      ok: true,
      claimedIds,
      count: claimedIds.length,
    });
  } catch (err) {
    console.error("[Cron close-campaigns] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return handleCloseCampaignsCron(request);
}

export async function POST(request) {
  return handleCloseCampaignsCron(request);
}
