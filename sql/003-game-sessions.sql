-- Adds two timestamp columns used for anti-cheat:
--   current_game_started_at — set by /api/game-start, used for wall-clock check
--   last_score_submitted_at — set by /api/score, used for rate limiting
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS current_game_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_score_submitted_at TIMESTAMP;
