import { sql } from "@vercel/postgres";
import { randomUUID } from "node:crypto";

// ── Events ─────────────────────────────────────────────────────────────

export interface Event {
  slug: string;
  name: string;
  created_at: Date;
  archived_at: Date | null;
  // Schedule + location are nullable so admins can spin up a slug
  // (and start testing the booth URL) before they've nailed down the
  // exact dates. Events with null starts_at don't appear on the
  // public homepage — that's how we "stage" pre-announce slugs.
  starts_at: Date | null;
  ends_at: Date | null;
  location: string | null;
}

export async function getEvent(slug: string): Promise<Event | null> {
  const { rows } = await sql<Event>`
    SELECT * FROM events WHERE slug = ${slug} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listActiveEvents(): Promise<Event[]> {
  const { rows } = await sql<Event>`
    SELECT * FROM events
    WHERE archived_at IS NULL
    ORDER BY created_at DESC
  `;
  return rows;
}

export async function listAllEvents(): Promise<Event[]> {
  const { rows } = await sql<Event>`
    SELECT * FROM events
    ORDER BY archived_at NULLS FIRST, created_at DESC
  `;
  return rows;
}

// Homepage list: current + upcoming events only, with "test" slugs
// and names filtered out so a staging event we forgot to archive
// doesn't end up on payrollrunner.com.
//
// Sort: live events first (so visitors landing during a conference
// see the LIVE badge immediately), then upcoming events soonest
// first. Past events (ends_at < today) and dateless events are
// excluded entirely.
export async function listPublicEvents(): Promise<Event[]> {
  const { rows } = await sql<Event>`
    SELECT * FROM events
    WHERE archived_at IS NULL
      AND starts_at IS NOT NULL
      AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
      AND LOWER(slug) NOT LIKE '%test%'
      AND LOWER(name) NOT LIKE '%test%'
    ORDER BY
      CASE
        WHEN starts_at <= CURRENT_DATE
         AND (ends_at IS NULL OR ends_at >= CURRENT_DATE) THEN 0
        ELSE 1
      END,
      starts_at ASC
  `;
  return rows;
}

export async function createEvent(
  slug: string,
  name: string,
  startsAt: string | null,
  endsAt: string | null,
  location: string | null,
): Promise<Event> {
  const { rows } = await sql<Event>`
    INSERT INTO events (slug, name, starts_at, ends_at, location)
    VALUES (${slug}, ${name}, ${startsAt}, ${endsAt}, ${location})
    RETURNING *
  `;
  return rows[0];
}

// Edits the schedule fields on an existing event row in one shot.
// Pass null to clear any of the three values (e.g. "we don't know
// the end date yet"). The slug + name aren't touched here — those
// stay immutable so URLs and HubSpot UTM history remain stable.
export async function updateEventSchedule(
  slug: string,
  startsAt: string | null,
  endsAt: string | null,
  location: string | null,
): Promise<void> {
  await sql`
    UPDATE events
    SET starts_at = ${startsAt},
        ends_at = ${endsAt},
        location = ${location}
    WHERE slug = ${slug}
  `;
}

export async function archiveEvent(slug: string): Promise<void> {
  await sql`UPDATE events SET archived_at = NOW() WHERE slug = ${slug}`;
}

export async function unarchiveEvent(slug: string): Promise<void> {
  await sql`UPDATE events SET archived_at = NULL WHERE slug = ${slug}`;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  screen_name: string;
  event_slug: string;
  hubspot_submitted: boolean;
  created_at: Date;
  session_token: string;
  current_game_started_at: Date | null;
  last_score_submitted_at: Date | null;
  demo_requested: boolean;
  demo_requested_at: Date | null;
}

export async function markDemoRequested(playerId: string): Promise<void> {
  await sql`
    UPDATE players
    SET demo_requested = TRUE, demo_requested_at = NOW()
    WHERE id = ${playerId}
  `;
}

// Wipes a player and all their data — scores + queue entries cascade
// via ON DELETE CASCADE on the players.id FK. Used by the admin panel
// to clean up test rows / fake registrations.
export async function deletePlayer(playerId: string): Promise<void> {
  await sql`DELETE FROM players WHERE id = ${playerId}`;
}

export interface Score {
  id: string;
  player_id: string;
  screen_name: string;
  score: number;
  duration_seconds: number;
  rank_title: string | null;
  event_slug: string;
  created_at: Date;
}

export interface LeaderboardEntry {
  screen_name: string;
  high_score: number;
  rank_title: string | null;
}

export interface NewPlayerInput {
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  screenName: string;
  eventSlug: string;
}

export async function createPlayer(input: NewPlayerInput): Promise<Player> {
  const sessionToken = randomUUID();
  const { rows } = await sql<Player>`
    INSERT INTO players
      (first_name, last_name, email, company, screen_name, event_slug, session_token)
    VALUES
      (${input.firstName}, ${input.lastName}, ${input.email}, ${input.company},
       ${input.screenName}, ${input.eventSlug}, ${sessionToken})
    RETURNING *
  `;
  return rows[0];
}

export async function findPlayerByEmailAndEvent(
  email: string,
  eventSlug: string,
): Promise<Player | null> {
  const { rows } = await sql<Player>`
    SELECT * FROM players
    WHERE email = ${email} AND event_slug = ${eventSlug}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findPlayerBySession(token: string): Promise<Player | null> {
  const { rows } = await sql<Player>`
    SELECT * FROM players WHERE session_token = ${token} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function markHubspotSubmitted(playerId: string): Promise<void> {
  await sql`UPDATE players SET hubspot_submitted = TRUE WHERE id = ${playerId}`;
}

export interface NewScoreInput {
  playerId: string;
  screenName: string;
  score: number;
  durationSeconds: number;
  rankTitle: string;
  eventSlug: string;
}

export async function insertScore(input: NewScoreInput): Promise<Score> {
  const { rows } = await sql<Score>`
    INSERT INTO scores
      (player_id, screen_name, score, duration_seconds, rank_title, event_slug)
    VALUES
      (${input.playerId}, ${input.screenName}, ${input.score},
       ${input.durationSeconds}, ${input.rankTitle}, ${input.eventSlug})
    RETURNING *
  `;
  return rows[0];
}

// Returns each screen_name's personal best for the event, top N by score.
// The plan's GROUP BY would emit a row per (screen_name, rank_title) pair,
// which double-counts a player whose runs span rank tiers — DISTINCT ON
// keeps it to one row per screen_name (their highest score's rank).
export async function getLeaderboard(
  eventSlug: string,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const { rows } = await sql<LeaderboardEntry>`
    SELECT screen_name, high_score, rank_title FROM (
      SELECT DISTINCT ON (screen_name)
        screen_name,
        score AS high_score,
        rank_title
      FROM scores
      WHERE event_slug = ${eventSlug}
      ORDER BY screen_name, score DESC
    ) AS player_bests
    ORDER BY high_score DESC
    LIMIT ${limit}
  `;
  return rows;
}

export async function getPlayerCount(eventSlug: string): Promise<number> {
  const { rows } = await sql<{ count: string }>`
    SELECT COUNT(DISTINCT screen_name)::text AS count
    FROM scores
    WHERE event_slug = ${eventSlug}
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function recordGameStart(playerId: string): Promise<void> {
  await sql`
    UPDATE players SET current_game_started_at = NOW() WHERE id = ${playerId}
  `;
}

export async function recordScoreSubmitted(playerId: string): Promise<void> {
  await sql`
    UPDATE players
    SET last_score_submitted_at = NOW(),
        current_game_started_at = NULL
    WHERE id = ${playerId}
  `;
}

export async function getPersonalBest(
  playerId: string,
  eventSlug: string,
): Promise<number> {
  const { rows } = await sql<{ best: number | null }>`
    SELECT MAX(score) AS best
    FROM scores
    WHERE player_id = ${playerId} AND event_slug = ${eventSlug}
  `;
  return rows[0]?.best ?? 0;
}

// The player's most recent run at this event — used by the Play Again
// card to show "you just scored $X" alongside their PB so the two
// numbers don't get conflated.
export async function getMostRecentScore(
  playerId: string,
  eventSlug: string,
): Promise<number | null> {
  const { rows } = await sql<{ score: number }>`
    SELECT score FROM scores
    WHERE player_id = ${playerId} AND event_slug = ${eventSlug}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0]?.score ?? null;
}

// Position is the player's rank when their personal best is compared
// against everyone else's personal best in the event. 1 = top of board.
export async function getLeaderboardPosition(
  eventSlug: string,
  score: number,
): Promise<{ position: number; total: number }> {
  const { rows } = await sql<{ ahead: string; total: string }>`
    WITH player_bests AS (
      SELECT screen_name, MAX(score) AS best
      FROM scores
      WHERE event_slug = ${eventSlug}
      GROUP BY screen_name
    )
    SELECT
      (SELECT COUNT(*)::text FROM player_bests WHERE best > ${score}) AS ahead,
      (SELECT COUNT(*)::text FROM player_bests) AS total
  `;
  const ahead = Number(rows[0]?.ahead ?? 0);
  const total = Number(rows[0]?.total ?? 0);
  return { position: ahead + 1, total };
}

// ── Admin queries ─────────────────────────────────────────────────────

export interface PlayerWithStats {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  screen_name: string;
  hubspot_submitted: boolean;
  demo_requested: boolean;
  created_at: Date;
  best_score: number | null;
  game_count: number;
}

export async function getAllPlayersWithStats(
  eventSlug: string,
): Promise<PlayerWithStats[]> {
  const { rows } = await sql<PlayerWithStats>`
    SELECT
      p.id, p.first_name, p.last_name, p.email, p.company, p.screen_name,
      p.hubspot_submitted, p.demo_requested, p.created_at,
      MAX(s.score) AS best_score,
      COUNT(s.id)::int AS game_count
    FROM players p
    LEFT JOIN scores s
      ON s.player_id = p.id AND s.event_slug = ${eventSlug}
    WHERE p.event_slug = ${eventSlug}
    GROUP BY p.id
    ORDER BY MAX(s.score) DESC NULLS LAST, p.created_at DESC
  `;
  return rows;
}

export interface EventStats {
  total_players: number;
  total_games: number;
  avg_score: number;
  max_score: number;
}

export async function getEventStats(eventSlug: string): Promise<EventStats> {
  const { rows } = await sql<{
    total_players: string;
    total_games: string;
    avg_score: string;
    max_score: string;
  }>`
    SELECT
      (SELECT COUNT(*)::text FROM players WHERE event_slug = ${eventSlug}) AS total_players,
      (SELECT COUNT(*)::text FROM scores WHERE event_slug = ${eventSlug}) AS total_games,
      (SELECT COALESCE(ROUND(AVG(score)), 0)::text FROM scores WHERE event_slug = ${eventSlug}) AS avg_score,
      (SELECT COALESCE(MAX(score), 0)::text FROM scores WHERE event_slug = ${eventSlug}) AS max_score
  `;
  const r = rows[0];
  return {
    total_players: Number(r?.total_players ?? 0),
    total_games: Number(r?.total_games ?? 0),
    avg_score: Number(r?.avg_score ?? 0),
    max_score: Number(r?.max_score ?? 0),
  };
}

export interface RecentScore {
  id: string;
  screen_name: string;
  score: number;
  duration_seconds: number;
  rate: number;
  created_at: Date;
}

export async function getRecentScores(
  eventSlug: string,
  limit = 50,
): Promise<RecentScore[]> {
  const { rows } = await sql<RecentScore>`
    SELECT
      id, screen_name, score, duration_seconds,
      (score::float / NULLIF(duration_seconds, 0)) AS rate,
      created_at
    FROM scores
    WHERE event_slug = ${eventSlug}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

export async function deleteScore(scoreId: string): Promise<void> {
  await sql`DELETE FROM scores WHERE id = ${scoreId}`;
}

// ── Booth queue ────────────────────────────────────────────────────────

export type QueueStatus =
  | "waiting"
  | "ready"
  | "playing"
  | "done"
  | "expired";

export interface QueueEntry {
  id: string;
  player_id: string;
  screen_name: string;
  event_slug: string;
  status: QueueStatus;
  queue_token: string;
  queued_at: Date;
  ready_at: Date | null;
  claimed_at: Date | null;
  finished_at: Date | null;
}

// Booth promotes a "waiting" entry to "ready" if there's no active
// ready/playing entry. 30-second TTL on the ready state — if the player
// doesn't press JUMP in time, the booth flips them to expired and
// promotes the next one.
const READY_TTL_MS = 30_000;
const PLAYING_WATCHDOG_MS = 5 * 60_000;

export async function enqueueForBooth(
  playerId: string,
  screenName: string,
  eventSlug: string,
): Promise<QueueEntry> {
  const { rows } = await sql<QueueEntry>`
    INSERT INTO play_queue (player_id, screen_name, event_slug)
    VALUES (${playerId}, ${screenName}, ${eventSlug})
    RETURNING *
  `;
  return rows[0];
}

export async function getQueueEntry(token: string): Promise<QueueEntry | null> {
  const { rows } = await sql<QueueEntry>`
    SELECT * FROM play_queue WHERE queue_token = ${token} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getQueuePosition(
  entry: QueueEntry,
): Promise<number> {
  if (entry.status === "ready") return 1;
  if (entry.status === "playing") return 0;
  if (entry.status === "done" || entry.status === "expired") return -1;
  // entry.queued_at may arrive from pg as a Date or an ISO string
  // depending on driver flags; pass either through to the parameter
  // and let pg cast.
  const queuedAt =
    entry.queued_at instanceof Date
      ? entry.queued_at.toISOString()
      : (entry.queued_at as unknown as string);
  const { rows } = await sql<{
    waiting_ahead: string;
    active_ahead: string;
  }>`
    SELECT
      (SELECT COUNT(*)::text FROM play_queue
        WHERE event_slug = ${entry.event_slug}
          AND status = 'waiting'
          AND queued_at < ${queuedAt}) AS waiting_ahead,
      (SELECT COUNT(*)::text FROM play_queue
        WHERE event_slug = ${entry.event_slug}
          AND status IN ('ready', 'playing')) AS active_ahead
  `;
  const waitingAhead = Number(rows[0]?.waiting_ahead ?? 0);
  const activeAhead = Number(rows[0]?.active_ahead ?? 0);
  return waitingAhead + activeAhead + 1;
}

export async function getQueueDepth(eventSlug: string): Promise<number> {
  const { rows } = await sql<{ count: string }>`
    SELECT COUNT(*)::text AS count
    FROM play_queue
    WHERE event_slug = ${eventSlug}
      AND status IN ('waiting', 'ready', 'playing')
  `;
  return Number(rows[0]?.count ?? 0);
}

// Average duration of the last 20 completed plays at this event, used
// to compute ETAs. Returns null if there aren't enough samples yet —
// callers fall back to a sensible default.
export async function getRollingAvgDuration(
  eventSlug: string,
): Promise<number | null> {
  const { rows } = await sql<{ avg: string | null; n: string }>`
    SELECT AVG(duration_seconds)::text AS avg, COUNT(*)::text AS n
    FROM (
      SELECT duration_seconds
      FROM scores
      WHERE event_slug = ${eventSlug}
      ORDER BY created_at DESC
      LIMIT 20
    ) AS recent
  `;
  const n = Number(rows[0]?.n ?? 0);
  if (n < 3) return null;
  return Number(rows[0]?.avg ?? 0);
}

// Time-out any stale entries before reading queue state. ready entries
// older than READY_TTL_MS become expired; playing entries older than
// PLAYING_WATCHDOG_MS also expire (booth crash protection).
export async function reapStaleQueueEntries(eventSlug: string): Promise<void> {
  await sql`
    UPDATE play_queue
    SET status = 'expired'
    WHERE event_slug = ${eventSlug}
      AND status = 'ready'
      AND ready_at < NOW() - (${READY_TTL_MS} || ' milliseconds')::interval
  `;
  await sql`
    UPDATE play_queue
    SET status = 'expired'
    WHERE event_slug = ${eventSlug}
      AND status = 'playing'
      AND claimed_at < NOW() - (${PLAYING_WATCHDOG_MS} || ' milliseconds')::interval
  `;
}

// Returns whichever entry is currently in the spotlight on the booth:
// the playing one if any, else the ready one if any, else promotes the
// next waiting entry to ready and returns it.
export async function getOrPromoteNextEntry(
  eventSlug: string,
): Promise<QueueEntry | null> {
  await reapStaleQueueEntries(eventSlug);

  const active = await sql<QueueEntry>`
    SELECT * FROM play_queue
    WHERE event_slug = ${eventSlug}
      AND status IN ('playing', 'ready')
    ORDER BY
      CASE status WHEN 'playing' THEN 0 ELSE 1 END,
      queued_at ASC
    LIMIT 1
  `;
  if (active.rows[0]) return active.rows[0];

  const next = await sql<QueueEntry>`
    UPDATE play_queue
    SET status = 'ready', ready_at = NOW()
    WHERE id = (
      SELECT id FROM play_queue
      WHERE event_slug = ${eventSlug}
        AND status = 'waiting'
      ORDER BY queued_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
  return next.rows[0] ?? null;
}

export async function markQueuePlaying(entryId: string): Promise<QueueEntry | null> {
  const { rows } = await sql<QueueEntry>`
    UPDATE play_queue
    SET status = 'playing', claimed_at = NOW()
    WHERE id = ${entryId} AND status = 'ready'
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function markQueueDone(entryId: string): Promise<void> {
  await sql`
    UPDATE play_queue
    SET status = 'done', finished_at = NOW()
    WHERE id = ${entryId}
  `;
}

export async function markQueueExpired(entryId: string): Promise<void> {
  await sql`
    UPDATE play_queue
    SET status = 'expired', finished_at = NOW()
    WHERE id = ${entryId}
  `;
}

// Close out the playing queue entry for a specific player. Called from
// /api/score so only that player's own booth run gets finished; a
// concurrent self-serve player's score submission won't kick the booth
// queue forward.
export async function markPlayerActiveRunDone(
  playerId: string,
  eventSlug: string,
): Promise<void> {
  await sql`
    UPDATE play_queue
    SET status = 'done', finished_at = NOW()
    WHERE player_id = ${playerId}
      AND event_slug = ${eventSlug}
      AND status = 'playing'
  `;
}

export async function getFailedHubspotPlayers(
  eventSlug: string,
): Promise<Player[]> {
  const { rows } = await sql<Player>`
    SELECT * FROM players
    WHERE event_slug = ${eventSlug} AND hubspot_submitted = FALSE
    ORDER BY created_at ASC
  `;
  return rows;
}
