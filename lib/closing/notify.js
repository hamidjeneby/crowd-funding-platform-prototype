import { supabaseAdmin } from "@/lib/supabase";
import { sendAllocationConfirmationWebhook } from "@/lib/webhook";

const WEBHOOK_CHUNK_SIZE = 50;

const CLOSE_NOTIFICATION_TYPES = [
  "allocation_full",
  "allocation_partial",
  "allocation_none",
  "campaign_failed",
  "campaign_closed",
];

function formatAmt(val) {
  const num = Number(val) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Builds the mandatory investor notification row for a single pledge result.
 */
export function buildPledgeInvestorNotification(project, pledge, projectOutcome) {
  const currency = project.currency || "AED";
  const unitLabel =
    project.sharia_contract_type === "spv_equity" || project.unit_type === "shares"
      ? "shares"
      : "units";
  const pledgedAmount = Number(pledge.pledged_amount) || 0;
  const allocatedAmount = Number(pledge.allocated_amount) || 0;
  const allocatedUnits = Number(pledge.allocated_units) || 0;
  const refundedAmount = Number(pledge.refunded_amount) || 0;
  const feeAmount = Number(pledge.fee_amount) || 0;

  let type = "allocation_none";
  let title = "";
  let message = "";

  if (projectOutcome === "failed") {
    type = "campaign_failed";
    title = `Campaign Closed Without Funding: ${project.title}`;
    message = `The campaign "${project.title}" did not reach its minimum funding target and closed without funding. A full refund of ${currency} ${formatAmt(refundedAmount)} (including your ${currency} ${formatAmt(feeAmount)} fee) has been returned to your wallet.`;
  } else if (pledge.status === "allocated" && allocatedAmount >= pledgedAmount) {
    type = "allocation_full";
    title = `Allocation Confirmed: ${project.title}`;
    message = `Your pledge of ${currency} ${formatAmt(pledgedAmount)} in "${project.title}" was allocated in full (${allocatedUnits.toLocaleString()} ${unitLabel}).`;
  } else if (pledge.status === "allocated" && allocatedAmount > 0 && allocatedAmount < pledgedAmount) {
    type = "allocation_partial";
    title = `Partial Allocation: ${project.title}`;
    message = `Your pledge in "${project.title}" was partially allocated: ${currency} ${formatAmt(allocatedAmount)} allocated (${allocatedUnits.toLocaleString()} ${unitLabel}) and ${currency} ${formatAmt(refundedAmount)} returned to your wallet. The investor fee (${currency} ${formatAmt(feeAmount)}) was not refunded.`;
  } else {
    type = "allocation_none";
    title = `Pledge Not Allocated: ${project.title}`;
    message = `Your pledge in "${project.title}" was not allocated. A full refund of ${currency} ${formatAmt(refundedAmount)} (including the ${currency} ${formatAmt(feeAmount)} fee) has been returned to your wallet.`;
  }

  return {
    investor_id: pledge.investor_id,
    project_id: project.id,
    type,
    notification_text: type,
    title,
    message,
    read_status: false,
  };
}

/**
 * Sends bulk notifications to pledging investors, non-pledging campaign subscribers,
 * and the project issuer, then dispatches the chunked Make allocation confirmation webhook.
 * Sets projects.close_notifications_sent_at only when notifications complete.
 */
export async function sendCloseNotificationsAndWebhooks({
  project,
  pledgeResults = [],
  projectOutcome,
  allocatedTotal = 0,
  subscribedTotalAtClose = 0,
  failureReason = null,
}) {
  if (!project?.id) {
    return { skipped: true, reason: "missing_project" };
  }

  // Check if notifications were already completed on an earlier run
  const { data: freshProject } = await supabaseAdmin
    .from("projects")
    .select("id, close_notifications_sent_at")
    .eq("id", project.id)
    .maybeSingle();

  if (freshProject?.close_notifications_sent_at || project.close_notifications_sent_at) {
    return {
      skipped: true,
      reason: "already_sent",
      close_notifications_sent_at:
        freshProject?.close_notifications_sent_at || project.close_notifications_sent_at,
    };
  }

  const currency = project.currency || "AED";
  const targetGoal = Number(project.target_goal) || 0;

  // 1. Check any already-inserted close notifications for this project to prevent duplicates on retry
  const { data: existingInvestorNotifs } = await supabaseAdmin
    .from("notifications")
    .select("investor_id, type")
    .eq("project_id", project.id)
    .in("type", CLOSE_NOTIFICATION_TYPES);

  const alreadyNotifiedInvestorIds = new Set(
    (existingInvestorNotifs || []).map((r) => Number(r.investor_id))
  );

  // 2. Build mandatory notifications for investors with a pledge
  const pledgingInvestorIds = new Set();
  const investorNotificationRows = [];

  for (const pledge of pledgeResults) {
    const invId = Number(pledge.investor_id);
    if (!invId) continue;
    pledgingInvestorIds.add(invId);

    if (!alreadyNotifiedInvestorIds.has(invId)) {
      investorNotificationRows.push(
        buildPledgeInvestorNotification(project, pledge, projectOutcome)
      );
      alreadyNotifiedInvestorIds.add(invId);
    }
  }

  // 3. Also exclude any investor who has any non-cancelled pledge on the project in DB
  const { data: allProjectPledges } = await supabaseAdmin
    .from("pledges")
    .select("investor_id")
    .eq("project_id", project.id)
    .neq("status", "cancelled");

  for (const row of allProjectPledges || []) {
    if (row?.investor_id) {
      pledgingInvestorIds.add(Number(row.investor_id));
    }
  }

  // 4. Query subscribers with notify_campaign_alerts = true and NO pledge on the project
  const { data: alertSubscribers } = await supabaseAdmin
    .from("project_notification_subscriptions")
    .select("investor_id")
    .eq("project_id", project.id)
    .eq("notify_campaign_alerts", true);

  for (const sub of alertSubscribers || []) {
    const subInvestorId = Number(sub?.investor_id);
    if (!subInvestorId) continue;
    if (pledgingInvestorIds.has(subInvestorId)) continue;
    if (alreadyNotifiedInvestorIds.has(subInvestorId)) continue;

    const outcomeLabel =
      projectOutcome === "funded"
        ? `funded with ${currency} ${formatAmt(allocatedTotal)} allocated`
        : "closed without reaching its minimum funding goal";

    investorNotificationRows.push({
      investor_id: subInvestorId,
      project_id: project.id,
      type: "campaign_closed",
      notification_text: "campaign_closed",
      title: `Campaign Closed: ${project.title}`,
      message: `"${project.title}" has now closed (${outcomeLabel}).`,
      read_status: false,
    });
    alreadyNotifiedInvestorIds.add(subInvestorId);
  }

  // Bulk-insert all investor notifications in ONE database call
  if (investorNotificationRows.length > 0) {
    const { error: invNotifError } = await supabaseAdmin
      .from("notifications")
      .insert(investorNotificationRows);

    if (invNotifError) {
      throw new Error(`Failed to bulk-insert investor notifications: ${invNotifError.message}`);
    }
  }

  // 5. Issuer notification (with deduplication key 'campaign_closed:project_<id>' in notification_text)
  let issuerNotified = false;
  if (project.issuer_id) {
    const dedupeKey = `campaign_closed:project_${project.id}`;
    const { data: existingIssuerNotif } = await supabaseAdmin
      .from("issuer_notifications")
      .select("id")
      .eq("issuer_id", project.issuer_id)
      .eq("notification_text", dedupeKey)
      .limit(1)
      .maybeSingle();

    if (!existingIssuerNotif) {
      const isFunded = projectOutcome === "funded";
      const issuerType = isFunded ? "campaign_funded" : "campaign_failed";
      const reasonText =
        failureReason === "no_pledges"
          ? "no eligible pledges were received before the deadline"
          : `allocated pledges did not meet the soft cap of ${currency} ${formatAmt(project.soft_cap)}`;

      const issuerTitle = isFunded
        ? `Campaign Funded: ${project.title}`
        : `Campaign Closed Without Funding: ${project.title}`;

      const issuerMessage = isFunded
        ? `Your campaign "${project.title}" closed and was funded with ${currency} ${formatAmt(allocatedTotal)} allocated against a ${currency} ${formatAmt(targetGoal)} target goal.`
        : `Your campaign "${project.title}" closed without funding because ${reasonText}.`;

      const { error: issuerNotifError } = await supabaseAdmin
        .from("issuer_notifications")
        .insert({
          issuer_id: project.issuer_id,
          type: issuerType,
          title: issuerTitle,
          message: issuerMessage,
          notification_text: dedupeKey,
          requires_action: false,
          action_url: `/issuer-portal/projects/${project.slug}/manage`,
          read_status: false,
        });

      if (issuerNotifError) {
        throw new Error(`Failed to insert issuer notification: ${issuerNotifError.message}`);
      }
      issuerNotified = true;
    }
  }

  // 6. Allocation confirmation Make webhook in chunks of 50 pledges
  // Strictly select ONLY display name and email fields (never id_number, bank_details, or wallet_balance)
  let webhookChunksSent = 0;
  if (pledgeResults.length > 0) {
    const uniqueInvestorIds = Array.from(
      new Set(pledgeResults.map((p) => Number(p.investor_id)).filter(Boolean))
    );

    const investorMap = new Map();
    if (uniqueInvestorIds.length > 0) {
      const { data: investorsData } = await supabaseAdmin
        .from("investors")
        .select("id, full_name, legal_entity_name, email")
        .in("id", uniqueInvestorIds);

      for (const inv of investorsData || []) {
        investorMap.set(Number(inv.id), {
          display_name: inv.full_name || inv.legal_entity_name || "Investor",
          email: inv.email || "",
        });
      }
    }

    const sanitizedPledges = pledgeResults.map((p) => {
      const invInfo = investorMap.get(Number(p.investor_id)) || {
        display_name: "Investor",
        email: "",
      };
      return {
        pledge_id: p.pledge_id ?? p.id,
        investor_display_name: invInfo.display_name,
        investor_email: invInfo.email,
        status: p.status,
        pledged_amount: Number(p.pledged_amount) || 0,
        allocated_amount: Number(p.allocated_amount) || 0,
        allocated_units: p.allocated_units != null ? Number(p.allocated_units) : 0,
        refunded_amount: Number(p.refunded_amount) || 0,
        fee_amount: Number(p.fee_amount) || 0,
        fee_refunded: Boolean(p.fee_refunded),
        conversion_eligible_units:
          p.conversion_eligible_units != null ? Number(p.conversion_eligible_units) : null,
        ownership_percentage:
          p.ownership_percentage != null ? Number(p.ownership_percentage) : null,
        project_title: project.title,
        contract_type: project.sharia_contract_type,
        sharia_contract_type: project.sharia_contract_type,
        currency,
      };
    });

    const totalChunks = Math.ceil(sanitizedPledges.length / WEBHOOK_CHUNK_SIZE);
    for (let i = 0; i < sanitizedPledges.length; i += WEBHOOK_CHUNK_SIZE) {
      const chunk = sanitizedPledges.slice(i, i + WEBHOOK_CHUNK_SIZE);
      const chunkIndex = Math.floor(i / WEBHOOK_CHUNK_SIZE) + 1;

      await sendAllocationConfirmationWebhook({
        type: "allocation_confirmation",
        project_id: project.id,
        project_title: project.title,
        project_slug: project.slug,
        contract_type: project.sharia_contract_type,
        sharia_contract_type: project.sharia_contract_type,
        currency,
        project_status: projectOutcome,
        allocated_total: allocatedTotal,
        subscribed_total_at_close: subscribedTotalAtClose,
        chunk_index: chunkIndex,
        total_chunks: totalChunks,
        pledges: chunk,
      });
      webhookChunksSent += 1;
    }
  }

  // 7. Mark close_notifications_sent_at on the project
  const sentAtIso = new Date().toISOString();
  await supabaseAdmin
    .from("projects")
    .update({ close_notifications_sent_at: sentAtIso })
    .eq("id", project.id);

  return {
    skipped: false,
    investor_notifications_inserted: investorNotificationRows.length,
    issuer_notified: issuerNotified,
    webhook_chunks_sent: webhookChunksSent,
    close_notifications_sent_at: sentAtIso,
  };
}
