import { sql } from "@vercel/postgres";
import { randomUUID } from "node:crypto";

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
