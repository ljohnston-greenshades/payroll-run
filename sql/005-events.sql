-- Events table — source of truth for the slugs that drive every URL,
-- leaderboard, and queue scoping. The admin panel inserts new rows
-- here; spinning up a conference is a single form submission instead
-- of an env-var change and redeploy.
--
-- We deliberately don't add a FK from scores/players to events so
-- pre-events historical rows (which lived only in env vars) keep
-- working. The events table is authoritative for the route layer;
-- the scores/players tables stay independent for archival simplicity.
CREATE TABLE IF NOT EXISTS events (
  slug VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived_at);

-- Seed the events table with whatever the existing env-var event was,
-- so the test event keeps working after migration without manual
-- intervention. Subsequent events are created via /admin.
INSERT INTO events (slug, name)
VALUES ('test-event-2026', 'Test Event 2026')
ON CONFLICT (slug) DO NOTHING;
