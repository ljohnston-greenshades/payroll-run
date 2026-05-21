# Payroll Runner — Setup by Scenario

The same codebase covers four use cases. Pick the right route + env config
per scenario.

---

## Quick reference

| Scenario | URL the visitor sees | URL the booth/page renders | Registration? | Scoring? |
|---|---|---|---|---|
| Booth with single TV + controller | (their phone) | `/booth` on the laptop | Yes, on phone | Yes |
| Booth with self-serve tablet | `/` then `/play` | tablet | Yes, on tablet | Yes |
| Social contest / giveaway | `/?event=<slug>` | n/a | Yes | Yes (to that event) |
| 404 page / embed | n/a | wherever you mount `<GameCanvas mode="casual" />` | No | No |

---

## Scenario 1 — Booth with single TV + custom controller (queue flow)

This is the new flow for shows where the only display is the booth TV and
the play surface is the 2-button arcade controller.

**Hardware:**
- Laptop / Mac Mini under the table, HDMI to TV
- Custom 2-button controller (B0 = Jump, B1 = Duck) on USB
- TV showing the laptop's Chrome window in kiosk mode

**Per-event setup (one time, ~5 min):**

1. In Vercel → project → Settings → Environment Variables, set for **Production**:
   - `NEXT_PUBLIC_EVENT_SLUG` = e.g. `hr-tech-2026`
   - `NEXT_PUBLIC_EVENT_NAME` = e.g. `HR Tech 2026`
   - `NEXT_PUBLIC_GAME_URL` = the live URL (e.g. `https://payrollrun.greenshades.com`)
2. Redeploy from Vercel so the new env vars take effect.
3. Apply the queue migration once (only if you haven't already for this DB):
   open Neon SQL editor and paste the contents of `sql/004-play-queue.sql`,
   then run.

**Day-of setup at the booth:**

1. Plug the controller into the laptop's USB port.
2. Open Chrome on the laptop, navigate to `https://payrollrun.greenshades.com/booth`.
3. Press F11 (or `cmd+ctrl+F` on Mac) for full-screen.
4. Press B0 once on the controller to wake the Gamepad API.
5. You should see the **attract screen**: leaderboard on the left, QR code
   on the right.

**What attendees do:**

1. Walk up, see the QR code on the TV.
2. Scan it with their phone — they get the registration form.
3. Fill in name/email/company/screen name on their own phone, hit submit.
4. Their phone shows their queue position and estimated wait. The TV
   updates "X in line" in real time.
5. When their turn comes, the TV shows their screen name in giant text:
   "FlamingoKing — Press JUMP to begin." Their phone simultaneously says
   "YOU'RE UP! Walk to the booth."
6. They press B0 (Jump). The game starts.
7. After they die or beat their record, the TV shows the game-over
   overlay for a few seconds, then returns to attract mode. If someone
   else is in line, they're promoted automatically.

**Skip a no-show:** hold B0 and B1 together for ~1.5s on the ready screen.
The TV advances to the next person in line.

**Replay:** by design, replay only happens when no one is behind them in
the queue. (We can revisit this if needed.)

---

## Scenario 2 — Booth with self-serve tablet (existing flow, unchanged)

For shows where attendees walk up to a tablet and play right there.
**This is exactly what shipped before — nothing has changed.**

1. Same env vars as Scenario 1 (`NEXT_PUBLIC_EVENT_SLUG`, `NEXT_PUBLIC_EVENT_NAME`).
2. Open the tablet to `https://payrollrun.greenshades.com/` for self-serve
   register-and-play.
3. If you have a second screen, open `/play?board=side` on the tablet to
   show a side leaderboard alongside the game canvas.

---

## Scenario 3 — Social contest / external giveaway

"Play for AirPods, top score wins." This is just a separate event slug;
no code changes needed.

1. Decide on a slug, e.g. `airpods-giveaway-jan-2026`.
2. Either:
   - Deploy a **separate Vercel project / preview deployment** with that
     slug as `NEXT_PUBLIC_EVENT_SLUG`, OR
   - Reuse the existing deployment and update env vars when the contest
     starts (this swaps the production event — only do this between
     conferences).
3. Share the URL on social: `https://payrollrun.greenshades.com/?event=airpods-giveaway-jan-2026`
   (note: today the registration form reads `NEXT_PUBLIC_EVENT_SLUG`
   from server env, so the `?event=` query param is informational. For a
   true multi-tenant setup, run a separate deployment per contest.)
4. View results at `/airpods-giveaway-jan-2026` (historical leaderboard
   archive route already exists).
5. Pick winner from the leaderboard table after the contest closes.

**Tip:** for "come to booth #107" cross-promotion, link to the booth
event slug so social plays count toward the same leaderboard as the
in-booth players.

---

## Scenario 4 — Embed in another page (404 / marketing)

For tributes (Chrome dino on a 404 page) or marketing fun, mount the
game with no registration or score submission.

```tsx
import { GameCanvas } from "@/components/GameCanvas";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">404 — Page not found</h1>
      <p className="mt-2 text-white/70">
        Looks like you wandered off the path. Want to keep running?
      </p>
      <div className="mt-8 w-full max-w-2xl">
        <GameCanvas mode="casual" />
      </div>
      <a href="https://payrollrun.greenshades.com/" className="mt-6 underline">
        Play the real version →
      </a>
    </div>
  );
}
```

**What "casual" mode does:**

- Skips `/api/game-start` (no server session needed).
- Skips `/api/score` (nothing is recorded).
- No registration prompt.
- Otherwise identical gameplay (keyboard, touch, gamepad all work).

---

## Per-event env var cheatsheet

```env
# Production env vars in Vercel.
# Change ONLY these two when moving from one event to the next:
NEXT_PUBLIC_EVENT_SLUG=hr-tech-2026          # used as event_slug everywhere
NEXT_PUBLIC_EVENT_NAME=HR Tech 2026          # display name
NEXT_PUBLIC_GAME_URL=https://payrollrun.greenshades.com   # for QR code

# Set once, rarely changes:
HUBSPOT_PORTAL_ID=24081706
HUBSPOT_GAME_FORM_ID=...
UTM_MEDIUM=event
UTM_CAMPAIGN=payroll-run-game
ADMIN_SECRET=...
POSTGRES_URL=...
```

---

## Troubleshooting

**TV doesn't see the controller.** Press any button once after Chrome
opens — browsers gate the Gamepad API behind a user gesture. If B0/B1
still don't map correctly, the encoder may be wiring them to different
indices. We can swap indices in `src/game/input.ts`.

**Phone is stuck on "Loading your spot."** Check the laptop console
in Chrome DevTools — likely the `/api/queue/me` request is failing.
Verify `POSTGRES_URL` is set and the `play_queue` table exists.

**Queue is stuck on an old player.** Hold B0+B1 on the ready screen
to skip. Or open `/admin?key=<ADMIN_SECRET>` and clear stale entries
manually.

**ETA looks wildly off.** ETAs are based on a rolling 20-game average,
so the first few games at a new event use a fallback of 45 seconds.
After 3+ games at the event, ETA will track reality. If it's still off
after that, check that durations are being recorded correctly in the
`scores` table.
