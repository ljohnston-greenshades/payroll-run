export interface HubSpotRegistration {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  eventName: string;
  // Resolved by the caller: URL params first, then the event's
  // configured UTMs, then defaults (see src/lib/utm.ts).
  utmMedium: string;
  utmSource: string;
  utmCampaign: string;
}

const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;
const FORM_ID = process.env.HUBSPOT_GAME_FORM_ID;
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
      { name: "utm_medium", value: input.utmMedium },
      { name: "utm_source", value: input.utmSource },
      { name: "utm_campaign", value: input.utmCampaign },
    ],
    context: {
      pageUri: GAME_URL,
      pageName: `Payroll Runner — ${input.eventName}`,
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
