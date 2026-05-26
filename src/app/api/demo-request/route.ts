import { NextResponse } from "next/server";
import { markDemoRequested } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";

// "Request a Demo" CTA on the Play Again screen. Stores the intent
// on the player row so the events team can triage manually until we
// wire up Clay enrichment + HubSpot Meetings calendar embed.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(): Promise<NextResponse> {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  await markDemoRequested(player.id);
  return NextResponse.json({ ok: true });
}
