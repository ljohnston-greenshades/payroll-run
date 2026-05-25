import { NextResponse } from "next/server";
import { enqueueForBooth, getEvent } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";

// "Play Again" path: returning player on the booth QR flow taps the
// big green button on their phone, which calls this. We trust the
// session cookie (set when they first registered) and re-enqueue
// without a fresh form submission. No HubSpot re-submission — that
// would create a duplicate-lead workflow trigger.
//
// The event slug must match the player's registered event — Bob can't
// rejoin event-B with a session from event-A.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request): Promise<NextResponse> {
  let body: { eventSlug?: unknown };
  try {
    body = (await req.json()) as { eventSlug?: unknown };
  } catch {
    body = {};
  }
  const requestedSlug =
    typeof body.eventSlug === "string"
      ? body.eventSlug
      : process.env.NEXT_PUBLIC_EVENT_SLUG;
  if (!requestedSlug) {
    return NextResponse.json(
      { error: "event_slug_missing" },
      { status: 400 },
    );
  }
  const event = await getEvent(requestedSlug);
  if (!event || event.archived_at) {
    return NextResponse.json(
      { error: "event_not_found" },
      { status: 404 },
    );
  }
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  if (player.event_slug !== event.slug) {
    return NextResponse.json({ error: "event_mismatch" }, { status: 409 });
  }
  const entry = await enqueueForBooth(player.id, player.screen_name, event.slug);
  return NextResponse.json({ ok: true, queueToken: entry.queue_token });
}
