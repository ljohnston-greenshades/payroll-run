// Posts a lead row to the Clay webhook table (CLAY_WEBHOOK_URL).
// No-op when the env var is unset. Never throws — Clay being slow or
// down must not break registration or the demo CTA.
//
// Two triggers send rows:
//   "registration"   — new player signs up (demoRequested: false)
//   "demo_request"   — player taps the demo CTA for the first time
//                      (demoRequested: true)
// Both rows carry the same email, so Clay can dedupe/update on it.
export interface ClayLeadPayload {
  trigger: "registration" | "demo_request";
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  eventSlug: string;
  eventName: string;
  demoRequested: boolean;
}

export function getClayWebhookUrl(): string | null {
  return process.env.CLAY_WEBHOOK_URL || null;
}

export async function sendToClay(
  payload: ClayLeadPayload,
  timeoutMs = 3000,
): Promise<void> {
  const url = getClayWebhookUrl();
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`Clay webhook returned ${res.status} (${payload.trigger})`);
    }
  } catch (err) {
    console.warn(`Clay webhook failed (${payload.trigger}):`, err);
  }
}
