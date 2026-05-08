"use server";

import { revalidatePath } from "next/cache";
import { isValidAdminKey } from "@/lib/admin";
import {
  deleteScore,
  getFailedHubspotPlayers,
  markHubspotSubmitted,
} from "@/lib/db";
import { submitToHubSpot } from "@/lib/hubspot";

function assertAdmin(formData: FormData): void {
  const key = formData.get("key");
  if (typeof key !== "string" || !isValidAdminKey(key)) {
    throw new Error("unauthorized");
  }
}

export async function deleteScoreAction(formData: FormData): Promise<void> {
  assertAdmin(formData);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new Error("invalid_id");
  }
  await deleteScore(id);
  revalidatePath("/admin");
}

export async function retryHubspotAction(formData: FormData): Promise<void> {
  assertAdmin(formData);
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? eventSlug ?? "";
  if (!eventSlug) throw new Error("event_slug_missing");

  const players = await getFailedHubspotPlayers(eventSlug);
  // Sequential to keep rate friendly; HubSpot Forms API has no published
  // limit but bursting hundreds of submissions in parallel is impolite.
  for (const p of players) {
    const ok = await submitToHubSpot({
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      company: p.company ?? "",
      eventSlug,
      eventName,
    });
    if (ok) {
      await markHubspotSubmitted(p.id);
    }
  }
  revalidatePath("/admin");
}
