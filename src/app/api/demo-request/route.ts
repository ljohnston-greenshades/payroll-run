import { NextResponse } from "next/server";
import {
  getPersonalBest,
  markDemoRequested,
} from "@/lib/db";
import { findContactOwnerByEmail } from "@/lib/hubspot-crm";
import { getCurrentPlayer } from "@/lib/session";
import { notifyEventsTeam } from "@/lib/slack-notify";

// "Request a Demo" CTA on the Play Again screen. Stores the intent
// on the player row so the events team can audit who tapped. If the
// contact ISN'T yet routed in HubSpot at click time (Clay slow,
// missing rep mapping, or the player just impatient), we also
// Slack-notify the events team so they can manually QB.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(): Promise<NextResponse> {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  await markDemoRequested(player.id);

  // Check current routing status. If routed already, the client
  // is opening the rep's calendar directly — no Slack needed.
  // If not routed, alert the events team to manually triage.
  const ownerId = await findContactOwnerByEmail(player.email);
  if (!ownerId) {
    const bestScore = await getPersonalBest(player.id, player.event_slug);
    await notifyEventsTeam({
      playerName: `${player.first_name} ${player.last_name}`,
      email: player.email,
      company: player.company,
      eventName: player.event_slug,
      bestScore: bestScore > 0 ? bestScore : null,
    });
  }

  return NextResponse.json({ ok: true });
}
