/**
 * Webhook Dispatcher Utility
 * 
 * Sends event payloads to process.env.MAKE_WEBHOOK_URL with header:
 * x-make-apikey: process.env.WEBHOOK_API_KEY
 */

export async function triggerMakeWebhook(payload) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  const apiKey = process.env.WEBHOOK_API_KEY || "";

  if (!webhookUrl) {
    console.warn("[Webhook] MAKE_WEBHOOK_URL environment variable is not configured.");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-make-apikey": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[Webhook Error] Failed to send webhook (${response.status} ${response.statusText})`
      );
    }
  } catch (err) {
    console.error("[Webhook Exception] Error triggering webhook:", err);
  }
}

/**
 * Subscription Agreement Webhook Dispatcher
 *
 * Dispatches subscription agreement legal payload to the Make webhook for PDF generation and delivery.
 * Uses MAKE_SUBSCRIPTION_AGREEMENT_WEBHOOK_URL or falls back to MAKE_WEBHOOK_URL.
 */
export async function sendSubscriptionAgreementWebhook(payload) {
  const webhookUrl =
    process.env.MAKE_SUBSCRIPTION_AGREEMENT_WEBHOOK_URL ||
    process.env.MAKE_WEBHOOK_URL;
  const apiKey = process.env.WEBHOOK_API_KEY || "";

  if (!webhookUrl) {
    console.warn(
      "[Webhook] Neither MAKE_SUBSCRIPTION_AGREEMENT_WEBHOOK_URL nor MAKE_WEBHOOK_URL is configured."
    );
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-make-apikey": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[Subscription Agreement Webhook Error] HTTP ${response.status} ${response.statusText}`
      );
    }
  } catch (err) {
    console.error(
      "[Subscription Agreement Webhook Exception] Error sending payload:",
      err
    );
  }
}

/**
 * Allocation Confirmation Webhook Dispatcher
 *
 * Uses MAKE_ALLOCATION_CONFIRMATION_WEBHOOK_URL or falls back to MAKE_WEBHOOK_URL.
 * Sends header x-make-apikey: process.env.WEBHOOK_API_KEY.
 * If neither env var is configured, logs and returns without failing the close.
 */
export async function sendAllocationConfirmationWebhook(payload) {
  const webhookUrl =
    process.env.MAKE_ALLOCATION_CONFIRMATION_WEBHOOK_URL ||
    process.env.MAKE_WEBHOOK_URL;
  const apiKey = process.env.WEBHOOK_API_KEY || "";

  if (!webhookUrl) {
    console.warn(
      "[Allocation Webhook] Neither MAKE_ALLOCATION_CONFIRMATION_WEBHOOK_URL nor MAKE_WEBHOOK_URL is configured; skipping webhook."
    );
    return { skipped: true };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-make-apikey": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[Allocation Webhook Error] HTTP ${response.status} ${response.statusText}`
      );
      return { ok: false, status: response.status };
    }
    return { ok: true, status: response.status };
  } catch (err) {
    console.error("[Allocation Webhook Exception] Error sending payload:", err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Project Close Error Alert Webhook Dispatcher (when close_attempts >= 2)
 */
export async function sendProjectCloseErrorWebhook(payload) {
  const webhookUrl =
    process.env.MAKE_CLOSE_ERROR_WEBHOOK_URL ||
    process.env.MAKE_WEBHOOK_URL;
  const apiKey = process.env.WEBHOOK_API_KEY || "";

  if (!webhookUrl) {
    console.warn(
      "[Close Error Alert] No MAKE_CLOSE_ERROR_WEBHOOK_URL or MAKE_WEBHOOK_URL configured; logged error only:",
      payload
    );
    return { skipped: true };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-make-apikey": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[Close Error Alert Webhook] HTTP ${response.status} ${response.statusText}`
      );
    }
    return { ok: response.ok, status: response.status };
  } catch (err) {
    console.error("[Close Error Alert Webhook Exception]:", err);
    return { ok: false, error: err?.message || String(err) };
  }
}

