import { NextRequest, NextResponse } from "next/server";
import { validateRegistration } from "@/lib/validation";
import { createPlayer, findPlayerByEmailAndEvent } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
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

  // HubSpot Forms API submission lands in Phase 4.

  return NextResponse.json({ ok: true, returning: false });
}
