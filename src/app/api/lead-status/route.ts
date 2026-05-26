import { NextResponse } from "next/server";
import { findContactOwnerByEmail, getOwnerProfile } from "@/lib/hubspot-crm";
import { getMeetingUrlForEmail } from "@/lib/reps";
import { getCurrentPlayer } from "@/lib/session";

// Polled by the Play Again screen every few seconds to see if Clay
// has finished enriching + routing the lead in HubSpot. When the
// contact has an assigned owner AND that owner's email is in our
// rep map, we return the rep's name + meeting link so the demo CTA
// can flip to "Schedule with <Name> →".
//
// Three terminal states:
//   pending         — no owner assigned yet; UI keeps polling
//   routed          — owner assigned + rep meeting URL known
//   routed_unknown  — owner assigned but we don't have their URL
//                     (rep not in REP_MEETING_URLS) → fall back to
//                     generic demo CTA but stop polling
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  const ownerId = await findContactOwnerByEmail(player.email);
  if (!ownerId) {
    return NextResponse.json({ status: "pending" });
  }
  const owner = await getOwnerProfile(ownerId);
  if (!owner) {
    return NextResponse.json({ status: "pending" });
  }
  const meetingUrl = getMeetingUrlForEmail(owner.email);
  if (!meetingUrl) {
    return NextResponse.json({
      status: "routed_unknown",
      owner: {
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
      },
    });
  }
  return NextResponse.json({
    status: "routed",
    owner: {
      firstName: owner.firstName,
      lastName: owner.lastName,
      email: owner.email,
    },
    meetingUrl,
  });
}
