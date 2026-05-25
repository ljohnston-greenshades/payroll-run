const FALLBACK_BLOCKLIST = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "protonmail.com", "mail.com", "live.com", "msn.com",
  "ymail.com", "inbox.com", "zohomail.com", "tutanota.com",
  "guerrillamail.com", "tempmail.com", "mailinator.com",
];

const envBlocklist = (process.env.BLOCKED_EMAIL_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const BLOCKED_DOMAINS = new Set(envBlocklist.length ? envBlocklist : FALLBACK_BLOCKLIST);

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)$/;

// Event slugs become URL segments (e.g. /booth/bullhorn-engage-2026) so we
// keep them ASCII-safe and short. Reserved roots that would shadow other
// routes are rejected up front.
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "booth",
  "leaderboard",
  "play",
  "queue",
]);

export function isValidEventSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 50) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return SLUG_REGEX.test(slug);
}

export interface ParsedEmail {
  local: string;
  domain: string;
  normalized: string;
}

export function parseEmail(raw: string): ParsedEmail | null {
  const trimmed = raw.trim().toLowerCase();
  const match = EMAIL_REGEX.exec(trimmed);
  if (!match) return null;
  const domain = match[1];
  const local = trimmed.slice(0, trimmed.lastIndexOf("@"));
  return { local, domain, normalized: `${local}@${domain}` };
}

export function isFreeEmailDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.has(domain.toLowerCase());
}

// "acme.com" → "Acme", "acme.co.uk" → "Acme". Best-effort guess for the
// company field — the user can edit it before submitting.
export function inferCompanyFromDomain(domain: string): string {
  const parts = domain.split(".").filter(Boolean);
  if (parts.length === 0) return "";
  const root = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return root.charAt(0).toUpperCase() + root.slice(1);
}

const SCREEN_NAME_REGEX = /^[A-Za-z0-9 ]{2,12}$/;

const PROFANITY = [
  "fuck", "shit", "bitch", "asshole", "cunt", "nigger", "faggot",
  "dick", "cock", "pussy", "slut", "whore", "retard", "nazi",
];

export type ScreenNameResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

export function sanitizeScreenName(raw: string): ScreenNameResult {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) return { ok: false, reason: "Screen name must be at least 2 characters." };
  if (trimmed.length > 12) return { ok: false, reason: "Max 12 characters." };
  if (!SCREEN_NAME_REGEX.test(trimmed)) {
    return { ok: false, reason: "Letters, numbers, and spaces only." };
  }
  const collapsed = trimmed.toLowerCase().replace(/[^a-z]/g, "");
  for (const word of PROFANITY) {
    if (collapsed.includes(word)) {
      return { ok: false, reason: "Pick a friendlier name." };
    }
  }
  return { ok: true, value: trimmed };
}

export interface RegistrationInput {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  company?: unknown;
  screenName?: unknown;
}

export interface SanitizedRegistration {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  screenName: string;
}

export type ValidationResult =
  | { ok: true; data: SanitizedRegistration }
  | { ok: false; errors: Record<string, string> };

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

export function validateRegistration(input: RegistrationInput): ValidationResult {
  const errors: Record<string, string> = {};

  const firstName = asString(input.firstName).trim();
  if (firstName.length < 2) errors.firstName = "First name must be at least 2 characters.";
  if (firstName.length > 50) errors.firstName = "First name is too long.";

  const lastName = asString(input.lastName).trim();
  if (lastName.length < 2) errors.lastName = "Last name must be at least 2 characters.";
  if (lastName.length > 50) errors.lastName = "Last name is too long.";

  const parsed = parseEmail(asString(input.email));
  let email = "";
  let domain = "";
  if (!parsed) {
    errors.email = "Enter a valid email address.";
  } else if (isFreeEmailDomain(parsed.domain)) {
    errors.email = "We need a work email to play — your IT team would approve 😎";
  } else {
    email = parsed.normalized;
    domain = parsed.domain;
  }

  const rawCompany = asString(input.company).trim();
  const company = (rawCompany || (domain ? inferCompanyFromDomain(domain) : "")).slice(0, 255);
  if (!company) errors.company = "Company is required.";

  const desiredScreenName = asString(input.screenName).trim() || firstName;
  const screen = sanitizeScreenName(desiredScreenName);
  let screenName = "";
  if (!screen.ok) {
    errors.screenName = screen.reason;
  } else {
    screenName = screen.value;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { firstName, lastName, email, company, screenName } };
}
