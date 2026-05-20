-- Booth queue. One row per registration intent (phone scanned the QR
-- code on the booth TV, submitted the form, and is waiting / playing /
-- done). Separate from `players` because a single player can be
-- enqueued more than once during an event (replay flow).
--
-- queue_token is what the phone polls with — it's distinct from the
-- player's session_token so the queue is addressable without
-- transmitting the session cookie around.
CREATE TABLE IF NOT EXISTS play_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  screen_name VARCHAR(12) NOT NULL,
  event_slug VARCHAR(50) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'waiting',
    -- waiting | ready | playing | done | expired
  queue_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  queued_at TIMESTAMP DEFAULT NOW(),
  ready_at TIMESTAMP,
  claimed_at TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queue_event_status
  ON play_queue(event_slug, status, queued_at);
CREATE INDEX IF NOT EXISTS idx_queue_token
  ON play_queue(queue_token);
