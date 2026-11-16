"use server";

import { revalidatePath } from "next/cache";
import {
  archiveEvent,
  createEvent,
  getEvent,
  unarchiveEvent,
  updateEventSchedule,
} from "@/lib/db";
import { isValidAdminKey } from "@/lib/admin";
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
  const startsAt = normalizeDate(formData.get("starts_at"));
  const endsAt = normalizeDate(formData.get("ends_at"));
  const location = normalizeLocation(formData.get("location"));

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
  if (startsAt && endsAt && endsAt < startsAt) {
    return { ok: false, error: "End date can't be before start date." };
  }
  const existing = await getEvent(slug);
  if (existing) {
    return { ok: false, error: "That slug already exists." };
  }
  await createEvent(slug, name, startsAt, endsAt, location);
  revalidatePath("/admin/events");
  revalidatePath("/");
  return { ok: true };
}

export async function updateEventScheduleAction(
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
  const startsAt = normalizeDate(formData.get("starts_at"));
  const endsAt = normalizeDate(formData.get("ends_at"));
  const location = normalizeLocation(formData.get("location"));
  if (startsAt && endsAt && endsAt < startsAt) {
    return { ok: false, error: "End date can't be before start date." };
  }
  await updateEventSchedule(slug, startsAt, endsAt, location);
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
