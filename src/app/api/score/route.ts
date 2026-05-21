import { NextRequest, NextResponse } from "next/server";
import { validateScore } from "@/lib/anti-cheat";
import {
  getLeaderboardPosition,
  getPersonalBest,
  insertScore,
  markPlayerActiveRunDone,
  recordScoreSubmitted,
} from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";

interface ScorePayload {
  score?: unknown;
  durationSeconds?: unknown;
  rankTitle?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  if (!eventSlug) {
    return NextResponse.json(
      { error: "event_slug_missing" },
      { status: 500 },
    );
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  let body: ScorePayload;
  try {
    body = (await req.json()) as ScorePayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const score = typeof body.score === "number" ? Math.floor(body.score) : NaN;
  const durationSeconds =
    typeof body.durationSeconds === "number"
      ? Math.floor(body.durationSeconds)
      : NaN;
  const rankTitle =
    typeof body.rankTitle === "string" ? body.rankTitle.slice(0, 30) : "";

  const verdict = validateScore({
    score,
    durationSeconds,
    rankTitle,
    startedAt: player.current_game_started_at
      ? new Date(player.current_game_started_at)
      : null,
    lastSubmissionAt: player.last_score_submitted_at
      ? new Date(player.last_score_submitted_at)
      : null,
  });

  if (!verdict.ok) {
    console.warn(
      `Score rejected for ${player.id} (${player.screen_name}): ${verdict.reason}`,
    );
    return NextResponse.json(
      { error: verdict.reason },
      { status: verdict.status },
    );
  }

  await insertScore({
    playerId: player.id,
    screenName: player.screen_name,
    score,
    durationSeconds,
    rankTitle,
    eventSlug,
  });
  await recordScoreSubmitted(player.id);
  // If this score came from a booth playthrough, close out the queue
  // entry so the next person can be promoted. No-op for self-serve.
  await markPlayerActiveRunDone(player.id, eventSlug);

  const personalBest = await getPersonalBest(player.id, eventSlug);
  // Rank against the leaderboard reflects the player's *current
  // standing* (their personal best), not this specific run's score.
  // Showing the run's rank breaks down on replays — a low replay
  // score would be "ahead = N (including their own PB)" but "total =
  // N", producing nonsense like "#12 of 11". Best-rank is always
  // consistent and matches what Play Again on the phone shows.
  const { position, total } = await getLeaderboardPosition(
    eventSlug,
    personalBest,
  );
  const isNewPersonalBest = score >= personalBest;

  return NextResponse.json({
    ok: true,
    position,
    total,
    personalBest,
    isNewPersonalBest,
  });
}
