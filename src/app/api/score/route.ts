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
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  // Use the event the player registered for — multi-event setups
  // can't trust a global env var here.
  const eventSlug = player.event_slug;

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

  // The "new booth record" celebration is reserved for when this run
  // takes the #1 spot overall. The unambiguous check: just-played
  // score is strictly greater than the highest score any OTHER player
  // has ever scored at this event. (We're already in scores table
  // after insertScore, so MAX of others' scores excludes this run.)
  const { sql: rawSql } = await import("@vercel/postgres");
  const { rows: otherRows } = await rawSql<{ top: number | null }>`
    SELECT MAX(score)::int AS top
    FROM scores
    WHERE event_slug = ${eventSlug} AND player_id != ${player.id}
  `;
  const otherTopScore = otherRows[0]?.top ?? 0;
  const isNewBoothRecord = score > otherTopScore && total > 1;

  return NextResponse.json({
    ok: true,
    position,
    total,
    personalBest,
    isNewPersonalBest,
    isNewBoothRecord,
  });
}
