import { NextResponse } from "next/server";
import {
  getEvent,
  getPersonalBest,
  markDemoRequested,
} from "@/lib/db";
import { sendToClay } from "@/lib/clay";
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
  // Only the first tap counts as a new hand-raise — the routed CTA
  // can be tapped repeatedly to re-open the rep's calendar.
  const isFirstRequest = !player.demo_requested;
  await markDemoRequested(player.id);

  if (isFirstRequest) {
    // Awaited (with a short timeout inside sendToClay) so the request
    // isn't cut off when the serverless function returns.
    const event = await getEvent(player.event_slug);
    await sendToClay({
      trigger: "demo_request",
      firstName: player.first_name,
      lastName: player.last_name,
      email: player.email,
      company: player.company,
      eventSlug: player.event_slug,
      eventName: event?.name ?? player.event_slug,
      demoRequested: true,
    });
  }

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
