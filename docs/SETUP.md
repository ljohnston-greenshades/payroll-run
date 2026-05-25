# Payroll Runner — Setup

This is a multi-event booth-experience codebase. The flow is:

1. Create the event in `/admin` (once per conference).
2. Point the booth station's Chrome to `/booth/<slug>` and run it kiosked.
3. Attendees scan the on-screen QR, register on their phones at `/<slug>`,
   wait in line, and play one run per turn.

---

## Quick reference — URLs

| URL | What it serves |
|---|---|
| `/` | Event-neutral marketing landing; lists active events |
| `/<slug>` | Event-scoped registration page (target of the booth QR) |
| `/booth/<slug>` | Booth TV display (attract → ready → playing → game over) |
| `/leaderboard/<slug>` | Public leaderboard archive view |
| `/admin?key=…` | Admin (players, scores, HubSpot retries) |
| `/admin/events?key=…` | Create / archive events |
| `/queue/<token>` | Phone-side "you're in line" wait page |

Legacy `/booth` (no slug) still redirects to whichever event is in
`NEXT_PUBLIC_EVENT_SLUG` for backwards compatibility with the original
test setup. Once everyone is on slugged URLs that file can be removed.

---

## Day-one setup (one time)

In Vercel → Production env vars:

```env
NEXT_PUBLIC_GAME_URL=https://payrollrunner.com   # used for QR generation
NEXT_PUBLIC_EVENT_SLUG=test-event-2026           # legacy fallback only
NEXT_PUBLIC_EVENT_NAME=Test Event 2026           # legacy fallback only
HUBSPOT_PORTAL_ID=24081706
HUBSPOT_GAME_FORM_ID=...
ADMIN_SECRET=…
POSTGRES_URL=…
UTM_MEDIUM=event
UTM_CAMPAIGN=payroll-run-game
```

Run `sql/005-events.sql` in Neon (the migration also seeds the existing
test event row so nothing breaks during the migration).

---

## Spinning up a new event

1. Open `https://payrollrunner.com/admin/events?key=<ADMIN_SECRET>`
2. Fill in:
   - **Event name** → e.g. "Bullhorn Engage 2026" (the slug field auto-suggests)
   - **URL slug** → e.g. `bullhorn-engage-2026`
3. Click **Create Event**.

That's it. `https://payrollrunner.com/booth/bullhorn-engage-2026` is now
live. No redeploy, no env var edit.

---

## At the booth (per event)

1. Plug the controller into the laptop's USB port.
2. Open Chrome to `https://payrollrunner.com/booth/<slug>`.
3. F11 for full-screen.
4. Press B0 once on the controller to wake the Gamepad API.
5. The attract screen should show the leaderboard for that event and a
   QR code encoding `https://payrollrunner.com/<slug>?mode=booth`.

Attendees scan the QR → register on their own phones → land on the
queue wait page → are called up one at a time on the TV → press JUMP →
play one run → repeat.

---

## Archiving an event

Open `/admin/events?key=…` → click **Archive** on the event row.

What happens:
- The event still has its own archive leaderboard at `/leaderboard/<slug>` (existing scores remain).
- New registrations on `/<slug>` are rejected with an "event closed" message.
- `/booth/<slug>` still renders the historical leaderboard but the queue stops promoting new players.
- The event drops off the home page's "Where to find us" list.

Re-open the event later via **Unarchive** if needed.

---

## Switching event scopes in the admin

The admin (`/admin?key=…`) shows the data for one event at a time.
A dropdown in the header (visible when 2+ active events exist) lets
you switch which event you're viewing leads / scores for.

The CSV export and "Retry HubSpot" button both respect the currently-
selected event.

---

## Multi-event scenarios

The old `mode="casual"` GameCanvas prop still exists for future 404 /
marketing embeds — see `docs/archive/self-serve-flow/` for reference.
The events motion is the primary flow now; casual mode is dormant.

---

## Troubleshooting

**TV doesn't see the controller.** Press any button once after Chrome
opens — browsers gate the Gamepad API behind a user gesture.

**Phone is stuck on "Loading your spot."** Open the booth's DevTools
console and check whether `/api/queue/me` is succeeding. If 404, the
queue token doesn't match any row — usually means the player's session
was wiped or the event was archived.

**Queue stuck on an old player.** Press Esc on the booth laptop (or
hold B0+B1 on the controller) to skip. Or clear stale rows via:

```sql
UPDATE play_queue
SET status = 'expired'
WHERE event_slug = '<slug>' AND status IN ('ready', 'playing');
```

**ETA looks wildly off.** ETAs use a rolling 20-game average per event,
with a 45s fallback before there are ≥3 completed runs. After a few
real games the estimate locks in.
