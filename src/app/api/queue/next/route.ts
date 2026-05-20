import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import {
  getOrPromoteNextEntry,
  getQueueDepth,
} from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

// Booth station polls this. Returns the current spotlight entry
// (playing or ready), promoting a waiting entry if the spotlight is
// empty. Also issues a session cookie tied to the spotlight player so
// /api/score and /api/game-start work without booth-side login.
export async function GET(): Promise<NextResponse> {
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  if (!eventSlug) {
    return NextResponse.json({ error: "event_slug_missing" }, { status: 500 });
  }

  const entry = await getOrPromoteNextEntry(eventSlug);
  const depth = await getQueueDepth(eventSlug);

  if (!entry) {
    return NextResponse.json({ entry: null, depth });
  }

  // Bind the booth's session cookie to whoever is in the spotlight so
  // subsequent score submissions land on the right player record.
  const { rows } = await sql<{ session_token: string }>`
    SELECT session_token FROM players WHERE id = ${entry.player_id} LIMIT 1
  `;
  if (rows[0]?.session_token) {
    setSessionCookie(rows[0].session_token);
  }

  return NextResponse.json({
    entry: {
      id: entry.id,
      screenName: entry.screen_name,
      status: entry.status,
      readyAt: entry.ready_at,
    },
    depth,
  });
}
