import { NextRequest, NextResponse } from "next/server";
import { validateRegistration } from "@/lib/validation";
import {
  createPlayer,
  enqueueForBooth,
  findPlayerByEmailAndEvent,
  getEvent,
  markHubspotSubmitted,
} from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { submitToHubSpot } from "@/lib/hubspot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // The event slug now comes from the registration form (which gets it
  // from the URL path /[slug]). Falls back to the env-var default for
  // the legacy /booth (no slug) route that still uses it.
  const requestedSlug =
    typeof (body as Record<string, unknown>).eventSlug === "string"
      ? ((body as Record<string, unknown>).eventSlug as string)
      : process.env.NEXT_PUBLIC_EVENT_SLUG;

  if (!requestedSlug) {
    return NextResponse.json(
      { error: "Missing event slug." },
      { status: 400 },
    );
  }

  // Verify the event exists and isn't archived — otherwise any random
  // slug submitted in the body would create a phantom event silently.
  const event = await getEvent(requestedSlug);
  if (!event || event.archived_at) {
    return NextResponse.json(
      { error: "Event not found or no longer accepting registrations." },
      { status: 404 },
    );
  }

  const result = validateRegistration(body as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const { firstName, lastName, email, company, screenName } = result.data;
  const mode =
    typeof (body as Record<string, unknown>).mode === "string"
      ? ((body as Record<string, unknown>).mode as string)
      : "event";
  const queueing = mode === "booth";

  const existing = await findPlayerByEmailAndEvent(email, event.slug);
  if (existing) {
    setSessionCookie(existing.session_token);
    if (queueing) {
      const entry = await enqueueForBooth(
        existing.id,
        existing.screen_name,
        event.slug,
      );
      return NextResponse.json({
        ok: true,
        returning: true,
        queueToken: entry.queue_token,
      });
    }
    return NextResponse.json({ ok: true, returning: true });
  }

  const player = await createPlayer({
    firstName,
    lastName,
    email,
    company,
    screenName,
    eventSlug: event.slug,
  });

  setSessionCookie(player.session_token);

  // Fire-and-forget in spirit: we await the HubSpot call so we can record
  // the outcome in the players table, but errors never bubble up to the
  // user. The booth flow must keep working if HubSpot is down.
  const submitted = await submitToHubSpot({
    firstName,
    lastName,
    email,
    company,
    eventSlug: event.slug,
    eventName: event.name,
  });
  if (submitted) {
    await markHubspotSubmitted(player.id);
  }

  if (queueing) {
    const entry = await enqueueForBooth(
      player.id,
      player.screen_name,
      event.slug,
    );
    return NextResponse.json({
      ok: true,
      returning: false,
      queueToken: entry.queue_token,
    });
  }

  return NextResponse.json({ ok: true, returning: false });
}
