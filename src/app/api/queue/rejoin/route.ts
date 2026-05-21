import { NextResponse } from "next/server";
import { enqueueForBooth } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";

// "Play Again" path: returning player on the booth QR flow taps the
// big green button on their phone, which calls this. We trust the
// session cookie (set when they first registered) and re-enqueue
// without a fresh form submission. No HubSpot re-submission — that
// would create a duplicate-lead workflow trigger.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(): Promise<NextResponse> {
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  if (!eventSlug) {
    return NextResponse.json({ error: "event_slug_missing" }, { status: 500 });
  }
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  if (player.event_slug !== eventSlug) {
    // Their session is from a prior event. Force them through the
    // form so the new event captures them fresh.
    return NextResponse.json({ error: "event_mismatch" }, { status: 409 });
  }
  const entry = await enqueueForBooth(player.id, player.screen_name, eventSlug);
  return NextResponse.json({ ok: true, queueToken: entry.queue_token });
}
