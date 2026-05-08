import { NextResponse } from "next/server";
import { getLeaderboard, getPlayerCount } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  if (!eventSlug) {
    return NextResponse.json(
      { error: "event_slug_missing" },
      { status: 500 },
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
