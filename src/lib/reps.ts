// Map of HubSpot owner email → that rep's HubSpot Meetings booking
// URL. Looked up after we read `hubspot_owner_id` off the contact
// record. Keeps the meeting URLs in code (not env) because they're
// short, stable, and version-controlled with the rest of the rep
// list.
const REP_MEETING_URLS: Record<string, string> = {
  "wdigiovanni@greenshades.com": "https://meetings.hubspot.com/will-digiovanni",
  "mmurdock@greenshades.com": "https://meetings.hubspot.com/matt-murdock",
  "jthibedeau@greenshades.com": "https://meetings.hubspot.com/jodi-thibedeau",
  "drattigan@greenshades.com":
    "https://meetings.hubspot.com/drattigan/dylans-zoom-meetings",
};

export function getMeetingUrlForEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return REP_MEETING_URLS[email.toLowerCase()] ?? null;
}
