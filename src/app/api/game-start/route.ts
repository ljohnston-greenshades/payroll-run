import { NextResponse } from "next/server";
import { recordGameStart } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";

export async function POST(): Promise<NextResponse> {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  await recordGameStart(player.id);
  return NextResponse.json({ ok: true });
}
