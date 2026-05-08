import { NextRequest, NextResponse } from "next/server";
import { validateRegistration } from "@/lib/validation";
import {
  createPlayer,
  findPlayerByEmailAndEvent,
  markHubspotSubmitted,
} from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { submitToHubSpot } from "@/lib/hubspot";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME || eventSlug;
  if (!eventSlug) {
    return NextResponse.json(
      { error: "Server misconfigured: NEXT_PUBLIC_EVENT_SLUG missing." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validateRegistration(body as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const { firstName, lastName, email, company, screenName } = result.data;

  const existing = await findPlayerByEmailAndEvent(email, eventSlug);
  if (existing) {
    setSessionCookie(existing.session_token);
    return NextResponse.json({ ok: true, returning: true });
  }

  const player = await createPlayer({
    firstName,
    lastName,
    email,
    company,
    screenName,
    eventSlug,
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
    eventSlug,
    eventName: eventName ?? eventSlug,
  });
  if (submitted) {
    await markHubspotSubmitted(player.id);
  }

  return NextResponse.json({ ok: true, returning: false });
}
