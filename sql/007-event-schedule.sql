-- Schedule + location metadata so the public homepage can list
-- upcoming Greenshades booths and flip a "LIVE" badge on the event
-- that's happening right now. Booth URLs work as soon as the slug is
-- created (existing behavior); the date fields just control public
-- visibility + the live indicator on payrollrunner.com.
--
-- DATE (not TIMESTAMP) avoids timezone weirdness — conferences are
-- defined as whole-day ranges in the host city's local time, so a
-- naive "between today and today" comparison is what people expect.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS starts_at DATE,
  ADD COLUMN IF NOT EXISTS ends_at DATE,
  ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Index used by the public homepage to filter to current + upcoming.
CREATE INDEX IF NOT EXISTS idx_events_ends_at ON events(ends_at);
