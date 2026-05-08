export interface HubSpotRegistration {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  eventSlug: string;
  eventName: string;
}

const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;
const FORM_ID = process.env.HUBSPOT_GAME_FORM_ID;
const UTM_MEDIUM = process.env.UTM_MEDIUM || "event";
const UTM_CAMPAIGN = process.env.UTM_CAMPAIGN || "payroll-run-game";
const GAME_URL =
  process.env.NEXT_PUBLIC_GAME_URL || "https://payrollrun.greenshades.com";

// Submits the registration to the dedicated HubSpot form. Returns true if
// HubSpot accepted the payload, false otherwise. Failures are logged and
// swallowed so the booth flow continues working when HubSpot is down.
//
// Only four hidden attribution fields are sent: lead_acquisition_channel,
// utm_medium, utm_source, utm_campaign. No first_touch_* fields — sending
// those would overwrite existing contacts' real first-touch data. See
// CLAUDE.md §6 for the rationale.
export async function submitToHubSpot(input: HubSpotRegistration): Promise<boolean> {
  if (!PORTAL_ID || !FORM_ID) {
    console.warn("HubSpot env vars missing — skipping submission.");
    return false;
  }

  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_ID}`;
  const payload = {
    fields: [
      { name: "firstname", value: input.firstName },
      { name: "lastname", value: input.lastName },
      { name: "email", value: input.email },
      { name: "company", value: input.company },
      { name: "lead_acquisition_channel", value: "Event" },
      { name: "utm_medium", value: UTM_MEDIUM },
      { name: "utm_source", value: input.eventSlug },
      { name: "utm_campaign", value: UTM_CAMPAIGN },
    ],
    context: {
      pageUri: GAME_URL,
      pageName: `Payroll Run — ${input.eventName}`,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`HubSpot Forms API ${res.status}: ${text.slice(0, 500)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("HubSpot submission failed:", err);
    return false;
  }
}
