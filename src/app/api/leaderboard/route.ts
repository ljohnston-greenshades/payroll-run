import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getPlayerCount } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EVENT_SLUG_PATTERN = /^[a-z0-9-]+$/;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requested = req.nextUrl.searchParams.get("event");
  const eventSlug = requested ?? process.env.NEXT_PUBLIC_EVENT_SLUG;
  if (!eventSlug) {
    return NextResponse.json(
      { error: "event_slug_missing" },
      { status: 500 },
    );
  }
  if (!EVENT_SLUG_PATTERN.test(eventSlug)) {
    return NextResponse.json(
      { error: "invalid_event_slug" },
      { status: 400 },
    );
  }

  const [entries, total] = await Promise.all([
    getLeaderboard(eventSlug, 20),
    getPlayerCount(eventSlug),
  ]);

  return NextResponse.json(
    { entries, total },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
