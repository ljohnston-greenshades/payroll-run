CREATE INDEX IF NOT EXISTS idx_scores_leaderboard ON scores(event_slug, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id);
CREATE INDEX IF NOT EXISTS idx_players_email_event ON players(email, event_slug);
CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_token);
