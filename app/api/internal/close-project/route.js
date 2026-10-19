import { NextResponse } from "next/server";
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

async function handleCloseProjectWorker(request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRunParam = url.searchParams.get("dryRun");
  let dryRun = dryRunParam === "true" || dryRunParam === "1";
  let projectId = url.searchParams.get("projectId");

  if (request.method === "POST") {
    try {
      const body = await request.json();
      if (body?.projectId !== undefined && body?.projectId !== null) {
        projectId = body.projectId;
      }
      if (body?.dryRun === true) {
        dryRun = true;
      }
    } catch {
      // Allow empty body if projectId was passed in query string
    }
  }

  const numericProjectId = Number(projectId);
  if (!Number.isFinite(numericProjectId) || numericProjectId <= 0) {
    return NextResponse.json(
      { ok: false, error: "Valid projectId is required" },
      { status: 400 }
    );
  }

  try {
    const result = await closeProject(numericProjectId, { dryRun });
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[Worker close-project] Error closing project ${numericProjectId}:`, err);
    return NextResponse.json(
      {
        ok: false,
        project_id: numericProjectId,
        error: err?.message || "Failed to close project",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return handleCloseProjectWorker(request);
}

export async function GET(request) {
  return handleCloseProjectWorker(request);
}
