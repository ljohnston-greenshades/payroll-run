-- Per-event UTM parameters. They're added to the booth QR code link
-- (/<slug>?mode=booth&utm_medium=...&utm_source=...&utm_campaign=...)
-- and sent with the HubSpot form submission at registration.
-- NULL means "use the default": medium = event, source = the event
-- slug, campaign = UTM_CAMPAIGN env var (payroll-runner-game).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);
