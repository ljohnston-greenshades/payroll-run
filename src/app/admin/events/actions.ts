"use server";

import { revalidatePath } from "next/cache";
import {
  archiveEvent,
  createEvent,
  getEvent,
  unarchiveEvent,
  updateEventSettings,
  type EventSettings,
} from "@/lib/db";
import { isValidAdminKey } from "@/lib/admin";
import { sanitizeUtm } from "@/lib/utm";
import { isValidEventSlug } from "@/lib/validation";

interface ActionResult {
  ok: boolean;
  error?: string;
}

// Accept `YYYY-MM-DD` from the <input type="date"> and store the
// raw string so Postgres parses it as a DATE in its own timezone.
// Returns null for empty strings so optional fields stay clean.
function normalizeDate(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function normalizeLocation(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 255);
}

export async function createEventAction(
  formData: FormData,
): Promise<ActionResult> {
  const key = formData.get("key");
  if (typeof key !== "string" || !isValidAdminKey(key)) {
    return { ok: false, error: "unauthorized" };
  }
  const slug = (formData.get("slug") ?? "").toString().trim().toLowerCase();
  const name = (formData.get("name") ?? "").toString().trim();
  const settings = readSettings(formData);

  if (!isValidEventSlug(slug)) {
    return {
      ok: false,
      error:
        "Slug must be lowercase letters/numbers/hyphens, 3–50 chars, and not collide with a route name.",
    };
  }
  if (name.length < 2 || name.length > 255) {
    return { ok: false, error: "Name must be 2–255 characters." };
  }
  const dateError = checkDates(settings);
  if (dateError) return { ok: false, error: dateError };
  const existing = await getEvent(slug);
  if (existing) {
    return { ok: false, error: "That slug already exists." };
  }
  await createEvent(slug, name, settings);
  revalidatePath("/admin/events");
  revalidatePath("/");
  return { ok: true };
}

function readSettings(formData: FormData): EventSettings {
  return {
    startsAt: normalizeDate(formData.get("starts_at")),
    endsAt: normalizeDate(formData.get("ends_at")),
    location: normalizeLocation(formData.get("location")),
    utmMedium: sanitizeUtm(formData.get("utm_medium")),
    utmSource: sanitizeUtm(formData.get("utm_source")),
    utmCampaign: sanitizeUtm(formData.get("utm_campaign")),
  };
}

function checkDates(s: EventSettings): string | null {
  if (s.startsAt && s.endsAt && s.endsAt < s.startsAt) {
    return "End date can't be before start date.";
  }
  return null;
}

export async function updateEventSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const key = formData.get("key");
  const slug = formData.get("slug");
  if (
    typeof key !== "string" ||
    !isValidAdminKey(key) ||
    typeof slug !== "string" ||
    !isValidEventSlug(slug)
  ) {
    return { ok: false, error: "unauthorized" };
  }
  const settings = readSettings(formData);
  const dateError = checkDates(settings);
  if (dateError) return { ok: false, error: dateError };
  await updateEventSettings(slug, settings);
  revalidatePath("/admin/events");
  revalidatePath("/");
  return { ok: true };
}

export async function archiveEventAction(formData: FormData): Promise<void> {
  const key = formData.get("key");
  const slug = formData.get("slug");
  if (
    typeof key !== "string" ||
    !isValidAdminKey(key) ||
    typeof slug !== "string" ||
    !isValidEventSlug(slug)
  ) {
    return;
  }
  await archiveEvent(slug);
  revalidatePath("/admin/events");
  revalidatePath("/");
}

export async function unarchiveEventAction(formData: FormData): Promise<void> {
  const key = formData.get("key");
  const slug = formData.get("slug");
  if (
    typeof key !== "string" ||
    !isValidAdminKey(key) ||
    typeof slug !== "string" ||
    !isValidEventSlug(slug)
  ) {
    return;
  }
  await unarchiveEvent(slug);
  revalidatePath("/admin/events");
  revalidatePath("/");
}
