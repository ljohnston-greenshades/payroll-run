"use server";

import { revalidatePath } from "next/cache";
import {
  archiveEvent,
  createEvent,
  getEvent,
  unarchiveEvent,
} from "@/lib/db";
import { isValidAdminKey } from "@/lib/admin";
import { isValidEventSlug } from "@/lib/validation";

interface ActionResult {
  ok: boolean;
  error?: string;
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
  const existing = await getEvent(slug);
  if (existing) {
    return { ok: false, error: "That slug already exists." };
  }
  await createEvent(slug, name);
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
