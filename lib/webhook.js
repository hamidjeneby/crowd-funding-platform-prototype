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
