-- Captures whether the player tapped the "Request a Demo" CTA on
-- their Play Again screen. Per-event since players are keyed by
-- (email, event_slug) — a demo request at HR Tech doesn't mean they
-- want one at every event.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS demo_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS demo_requested_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_players_demo_requested
  ON players(event_slug, demo_requested)
  WHERE demo_requested = TRUE;
