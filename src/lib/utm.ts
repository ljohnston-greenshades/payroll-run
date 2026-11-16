// UTMs for game registrations. The game is only used at trade shows,
// so medium and source are fixed. Only the campaign changes per event:
// it's the event slug.
//
// Medium and source are also set as hidden-field defaults on the
// HubSpot form. We still send them with every submission because
// Forms API submissions only include the fields in the request; the
// form's hidden-field defaults aren't applied to them.
export const UTM_MEDIUM = "event";
export const UTM_SOURCE = "trade show";

const MAX_UTM_LENGTH = 100;

// Trims, drops control characters, and caps length. Returns null for
// empty or non-string input so callers can fall back to the slug.
export function sanitizeUtm(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_UTM_LENGTH);
}

// The link the booth QR code encodes: the event's registration page in
// booth (queue) mode, tagged with utm_campaign = the event slug.
export function buildBoothQueueUrl(gameUrl: string, slug: string): string {
  if (!gameUrl) return "";
  const params = new URLSearchParams({ mode: "booth", utm_campaign: slug });
  return `${gameUrl.replace(/\/$/, "")}/${encodeURIComponent(slug)}?${params}`;
}
