import { NextRequest, NextResponse } from "next/server";
import { markQueuePlaying } from "@/lib/db";

// Booth calls this when the player presses JUMP from the READY screen.
// Flips the ready entry to playing.
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { entryId?: unknown };
  try {
    body = (await req.json()) as { entryId?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.entryId !== "string") {
    return NextResponse.json({ error: "missing_entry_id" }, { status: 400 });
  }
  const entry = await markQueuePlaying(body.entryId);
  if (!entry) {
    return NextResponse.json({ error: "not_ready" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
