-- Players table — contains PII, server-side only.
-- Never joined into the public leaderboard query.
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  screen_name VARCHAR(12) NOT NULL,
  event_slug VARCHAR(50) NOT NULL,
  hubspot_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  session_token UUID NOT NULL UNIQUE,
  UNIQUE(email, event_slug)
);

-- Scores table — no PII. screen_name is denormalized so the leaderboard
-- query never has to touch the players table.
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  screen_name VARCHAR(12) NOT NULL,
  score INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  rank_title VARCHAR(30),
  event_slug VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
