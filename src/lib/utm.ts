// UTM handling shared by the admin panel, the booth QR code, and
// registration. Each event can override medium/source/campaign; blank
// values fall back to the defaults below.

export interface Utms {
  medium: string;
  source: string;
  campaign: string;
}

export interface EventUtmFields {
  slug: string;
  utm_medium: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
}

export const DEFAULT_UTM_MEDIUM = process.env.UTM_MEDIUM || "event";
export const DEFAULT_UTM_CAMPAIGN =
  process.env.UTM_CAMPAIGN || "payroll-runner-game";

const MAX_UTM_LENGTH = 100;

// Trims, drops control characters, and caps length. Returns null for
// empty or non-string input so callers can fall back to a default.
export function sanitizeUtm(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_UTM_LENGTH);
}

// The event's effective UTMs, with defaults filled in.
export function resolveEventUtms(event: EventUtmFields): Utms {
  return {
    medium: event.utm_medium || DEFAULT_UTM_MEDIUM,
    source: event.utm_source || event.slug,
    campaign: event.utm_campaign || DEFAULT_UTM_CAMPAIGN,
  };
}

// The link the booth QR code encodes: the event's registration page in
// booth (queue) mode, tagged with the event's UTMs.
export function buildBoothQueueUrl(
  gameUrl: string,
  slug: string,
  utms: Utms,
): string {
  if (!gameUrl) return "";
  const params = new URLSearchParams({
    mode: "booth",
    utm_medium: utms.medium,
    utm_source: utms.source,
    utm_campaign: utms.campaign,
  });
  return `${gameUrl.replace(/\/$/, "")}/${encodeURIComponent(slug)}?${params}`;
}
