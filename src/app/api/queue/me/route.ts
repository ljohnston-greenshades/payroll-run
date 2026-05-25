import { NextRequest, NextResponse } from "next/server";
import {
  getQueueEntry,
  getQueuePosition,
  getRollingAvgDuration,
} from "@/lib/db";

// Phone polls this with its queue token. Returns position and a soft
// ETA estimate. Position #1 = you're up next; position #0 = currently
// playing; -1 = done/expired.
const HANDOFF_SECONDS = 8;
const FALLBACK_DURATION = 45;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }
  const entry = await getQueueEntry(token);
  if (!entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const position = await getQueuePosition(entry);
  const avgDuration =
    (await getRollingAvgDuration(entry.event_slug)) ?? FALLBACK_DURATION;

  let waitSeconds = 0;
  if (entry.status === "waiting") {
    const ahead = Math.max(0, position - 1);
    waitSeconds = ahead * (avgDuration + HANDOFF_SECONDS);
    // 10% buffer + round up to the next 30s bucket so the displayed
    // ETA leans pessimistic.
    waitSeconds = Math.ceil((waitSeconds * 1.1) / 30) * 30;
  }

  return NextResponse.json({
    status: entry.status,
    position,
    screenName: entry.screen_name,
    waitSeconds,
    eventSlug: entry.event_slug,
  });
}
