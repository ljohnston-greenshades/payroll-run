import { NextRequest, NextResponse } from "next/server";
import { markQueueExpired } from "@/lib/db";

// Booth calls this when the rep holds B0+B1 to skip a no-show.
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
  await markQueueExpired(body.entryId);
  return NextResponse.json({ ok: true });
}
