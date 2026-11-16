// Posts a new registration to the Clay webhook table
// (CLAY_WEBHOOK_URL) so Clay can enrich the lead and assign its
// HubSpot owner. No-op when the env var is unset. Never throws —
// Clay being slow or down must not break registration.
export interface ClayLeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  eventSlug: string;
  eventName: string;
}

export async function sendToClay(
  payload: ClayLeadPayload,
  timeoutMs = 3000,
): Promise<void> {
  const url = process.env.CLAY_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`Clay webhook returned ${res.status}`);
    }
  } catch (err) {
    console.warn("Clay webhook failed:", err);
  }
}
