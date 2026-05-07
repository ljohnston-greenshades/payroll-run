# PAYROLL RUN — Conference Lead Capture Game
## Full Build Plan for Claude Code (v2)

---

## 1. THE CONCEPT

**Payroll Run** is a retro pixel-art side-scrolling runner game designed for Greenshades conference booths. A flamingo in sunglasses dashes through a tropical payroll landscape collecting paychecks, W-2 forms, and bonus multipliers while dodging tax penalties, missed deadlines, and compliance violations.

**Why it works at a booth:**
- Instantly playable — zero learning curve (Space to jump, Down to duck)
- Runs get faster and harder — creates "one more try" addiction
- Leaderboard creates competitive energy that draws a crowd
- Score ranks give people titles to laugh about ("Payroll Intern" → "Chief Payroll Officer")
- Work email gate feels worth it because the game is genuinely fun
- 30-60 second runs = high throughput at the booth

---

## 2. ARCHITECTURE OVERVIEW

```
┌──────────────────────────────────────────────────────────────┐
│                      VERCEL (Frontend)                        │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐   │
│  │ Registration  │──▶│  Game View   │──▶│  Leaderboard   │   │
│  │ (Email Gate)  │   │  (Canvas)    │   │  (Public TV)   │   │
│  └──────┬────────┘   └──────┬───────┘   └────────────────┘   │
│         │                   │                                 │
│  ┌──────▼───────────────────▼─────────────────────────────┐  │
│  │            Vercel Serverless API Routes                 │  │
│  │    /api/register    /api/score    /api/leaderboard      │  │
│  └──────┬──────────────────┬──────────────────────────────┘  │
│         │                  │                                  │
└─────────┼──────────────────┼──────────────────────────────────┘
          │                  │
    ┌─────▼──────┐    ┌──────▼──────┐
    │  HubSpot   │    │   Vercel    │
    │  Forms API │    │  Postgres   │
    │ (UTM-based │    │ (Scores DB) │
    │ submission)│    │             │
    └────────────┘    └─────────────┘
```

**Tech Stack:**
- **Framework:** Next.js 14+ (App Router)
- **Game Engine:** Vanilla Canvas API (no dependencies — fast, lightweight)
- **Database:** Vercel Postgres (leaderboard scores, session management)
- **CRM:** HubSpot Forms API (form submission with UTM hidden fields — triggers existing attribution workflows)
- **Hosting:** Vercel (edge-fast, zero-config deploys)
- **Repo:** GitHub (CI/CD via Vercel integration)

---

## 3. PII HANDLING & DATA ARCHITECTURE

This is a lead capture tool running at public events. PII discipline is non-negotiable.

### The Two-Database Rule

PII lives in **one place** (Vercel Postgres, server-side only) and gets pushed to **one CRM** (HubSpot, via form submission). The public-facing leaderboard never touches PII.

| Data Point | Stored In | Exposed Publicly | Sent to HubSpot |
|---|---|---|---|
| Work email | Postgres `players` table | NEVER | Yes (form field) |
| First name | Postgres `players` table | NEVER | Yes (form field) |
| Last name | Postgres `players` table | NEVER | Yes (form field) |
| Company | Postgres `players` table | NEVER | Yes (form field) |
| Screen name | Postgres `players` table + `scores` table | YES (leaderboard) | No |
| High score | Postgres `scores` table | YES (leaderboard) | Optional (custom prop) |
| Session token | Postgres `players` table + httpOnly cookie | NEVER | No |

### Data Flow Principles

1. **PII never leaves the server.** The `/api/leaderboard` endpoint returns screen names and scores only — no joins to PII fields. The leaderboard query should SELECT from the scores table joined to players on `player_id`, but only return `screen_name` and `score`. Never return `email`, `full_name`, or `company` from any public endpoint.

2. **Session tokens are httpOnly cookies.** Not localStorage, not URL params. The token is a UUID — not a JWT containing PII. The server looks up the player by token on each request.

3. **HubSpot gets PII once, at registration.** After that, the game only talks to Postgres. If you want to update HubSpot with high scores post-event, do it as a batch job from the admin panel — not in real-time from the client.

4. **Admin panel is the only place PII and scores appear together.** Protected by a server-side secret, not accessible from the public game URL.

5. **Profanity filter on screen names.** Since screen names are the only user-generated content shown publicly on the TV, run them through a blocklist. Reject and ask for a new name — don't silently modify.

6. **No analytics/tracking pixels on the game pages.** Keep it clean. The HubSpot form submission handles attribution. Don't add Google Analytics, Facebook Pixel, etc. to the game — it's a booth experience, not a website funnel.

7. **Data retention.** Add a `scripts/purge-pii.ts` script that strips PII from the players table after 90 days (keeps screen_name + scores for historical leaderboards, removes email/name/company). Run it quarterly.

---

## 4. USER FLOW — THREE SCREENS

### Screen 1: Registration Gate
**URL:** `payrollrun.greenshades.com` (or subdomain of your choice)

**What the player sees:**
- Greenshades branding (navy header, green accent)
- Big pixel-art flamingo animation (idle bouncing)
- Title: "PAYROLL RUN" in retro font
- Tagline: "How long can you keep payroll running?"
- Input fields:
  - **First Name** (required) — sent to HubSpot as `firstname`
  - **Last Name** (required) — sent to HubSpot as `lastname`
  - **Work Email** (required) — validated as non-free-email. Sent to HubSpot as `email`
  - **Company** (required) — auto-extracted from email domain, editable. Sent to HubSpot as `company`
  - **Screen Name** (optional, max 12 chars) — displayed on TV leaderboard. Default: first name if left blank. NOT sent to HubSpot.
- Big green CTA: "START RUNNING →"
- Fine print: "By playing, you agree to receive info from Greenshades about our payroll and HR solutions. We'll never share your data with third parties."

**Validation rules:**
- Work email required — reject `@gmail.com`, `@yahoo.com`, `@hotmail.com`, `@outlook.com`, `@aol.com`, `@icloud.com`, `@protonmail.com`, `@mail.com`, `@live.com`, `@msn.com`, `@ymail.com`, `@inbox.com`, `@zohomail.com`, `@tutanota.com`, `@guerrillamail.com`, `@tempmail.com`, `@mailinator.com`
- Show friendly message: "We need a work email to play — your IT team would approve 😎"
- First + last name: at least 2 characters each
- Screen name: alphanumeric + spaces only, max 12 chars, profanity filter (basic blocklist), trimmed and sanitized before storage
- Rate limit: 1 registration per email address per event. If email already exists, welcome them back and reuse their session.

**What happens on submit:**
1. Server-side validation of all fields
2. Generate a session UUID, store in Postgres `players` table
3. Submit to HubSpot Forms API with UTM hidden fields (see Section 6)
4. Set httpOnly session cookie
5. Redirect to `/play`

### Screen 2: The Game
**URL:** `payrollrun.greenshades.com/play`
(Requires valid session cookie — redirects to `/` if missing)

**The game itself (Canvas-based, ~800x400 viewport scaled to screen):**

**Player Character:**
- Pink flamingo with sunglasses — pixel art style
- SPACE / TAP = jump (avoid ground obstacles)
- DOWN ARROW / left-side tap zone = duck (avoid flying obstacles)
- Legs animate while running, wings flap on jump, sunglasses glint periodically

**Collectibles (positive):**
| Item | Points | Visual | Frequency |
|------|--------|--------|-----------|
| Paycheck ($) | 100 × combo | Green check with $ sign | Common (~40% of spawns) |
| W-2 Form | 250 × combo | White document with "W-2" header | Uncommon (~15% of spawns) |
| Bonus Star (2X) | 500 + 5s invincibility | Golden spinning star | Rare (~5% of spawns) |

**Obstacles (game over on hit):**
| Obstacle | Visual | Behavior |
|----------|--------|----------|
| Tax Penalty | Red warning sign with "TAX" | Ground level, must jump over |
| Missed Deadline | Flying alarm clock with wings | Mid-air, must duck under |
| Compliance Violation | Stack of red tape with skull | Ground, taller — must jump high |

**Game Design — Difficulty Curve & Addiction Mechanics:**

The goal is to make this feel like "one more try" every time. Here's how:

- **Speed ramp:** Starts at 4.5 px/frame, increases +0.0003 per distance unit, caps at 12. The first 15 seconds feel easy. By 45 seconds, it's intense. By 60+ seconds, only skilled players survive.
- **Obstacle density ramp:** Spawn timer starts generous (~280 frames between obstacles) and tightens to ~120 frames at max speed. Never spawn two obstacles closer than 100px apart (always give the player a fair chance).
- **Combo system:** Collecting items within 1.5 seconds of each other builds a combo multiplier. Paychecks go from $100 → $200 → $300 per pickup. This creates a risk/reward loop — do you jump for that paycheck in a dangerous position? The combo counter displays visually above the flamingo ("3x COMBO!") with increasing intensity.
- **Near-miss dopamine:** When the flamingo passes within 8px of an obstacle without dying, flash "CLOSE CALL!" text. This makes even dodging feel rewarding.
- **Invincibility power fantasy:** The Bonus Star triggers a 5-second rainbow glow + speed boost where you can plow through obstacles. It feels amazing and gives players a taste of "what if I could always do this?" that keeps them playing.
- **Death should feel dramatic, not frustrating:** Big particle explosion, screen shake, dramatic "PAYROLL FAILED!" — then instant retry. No loading screens, no delays. The faster someone can restart, the more they'll play.
- **Score milestones:** At $1000, $2500, $5000 and $10000, flash a brief celebration ("PROMOTED!" + new rank title). This gives sub-goals within each run.

**Score Ranks (shown on game over + milestones):**
| Score Range | Title |
|-------------|-------|
| $0 – $499 | Payroll Intern |
| $500 – $1,499 | Junior Accountant |
| $1,500 – $2,999 | Payroll Specialist |
| $3,000 – $5,999 | HR Manager |
| $6,000 – $9,999 | VP of People Ops |
| $10,000+ | Chief Payroll Officer |

**Game Over screen (overlay on final frame — don't clear the canvas):**
- "PAYROLL FAILED!" header with screen shake aftereffect
- Final score with rank title
- "NEW HIGH SCORE!" flash if applicable
- Your leaderboard position: "#7 of 142 players"
- "TRY AGAIN" button (goes straight to new game, no re-registration)
- "VIEW LEADERBOARD" button

**What happens on game over:**
- POST to `/api/score` with session token (from cookie) + score + duration
- Server validates anti-cheat rules (see Section 7)
- Saves score. Returns leaderboard position and personal best.

### Screen 3: Leaderboard (TV Display Mode)
**URL:** `payrollrun.greenshades.com/leaderboard`

**This is the screen that runs on the booth TV.** Designed for a large display viewed from 5-10 feet away. No interactive elements. No PII.

**Layout:**
- Greenshades navy header with logo
- "PAYROLL RUN — LEADERBOARD" title in retro pixel font
- Event name + date displayed (from env var)

**Leaderboard table (top 20):**
| Rank | Screen Name | Score | Title |
|------|-------------|-------|-------|
| 🏆 1 | FlamingoKing | $12,450 | Chief Payroll Officer |
| 🥈 2 | PayrollPro | $9,880 | VP of People Ops |
| 🥉 3 | TaxDodger99 | $7,210 | VP of People Ops |
| 4 | GreenMachine | $6,100 | HR Manager |
| ... | ... | ... | ... |

**What's displayed (NO PII):**
- Rank number
- Screen name only
- Score (formatted as dollars)
- Rank title

**Auto-refresh:** Polls `/api/leaderboard` every 10 seconds. New entries animate in with a green highlight flash that fades after 5 seconds.

**Total player count** at the bottom: "142 players today"

**QR code** in bottom-right corner linking to the game URL so spectators can play on their phones.

---

## 5. DATABASE SCHEMA (Vercel Postgres)

```sql
-- ============================================
-- Players table — contains PII, server-side only
-- ============================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  screen_name VARCHAR(12) NOT NULL,
  event_slug VARCHAR(50) NOT NULL,           -- e.g., 'hr-tech-2026'
  hubspot_submitted BOOLEAN DEFAULT FALSE,   -- track if form submission succeeded
  created_at TIMESTAMP DEFAULT NOW(),
  session_token UUID NOT NULL UNIQUE,

  -- One registration per email per event
  UNIQUE(email, event_slug)
);

-- ============================================
-- Scores table — one row per game played
-- NO PII in this table. Screen name is denormalized
-- here so the leaderboard query never needs to
-- touch the players table.
-- ============================================
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  screen_name VARCHAR(12) NOT NULL,          -- denormalized for safe leaderboard queries
  score INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,         -- anti-cheat: validate score vs time
  rank_title VARCHAR(30),
  event_slug VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_scores_leaderboard ON scores(event_slug, score DESC);
CREATE INDEX idx_scores_player ON scores(player_id);
CREATE INDEX idx_players_email_event ON players(email, event_slug);
CREATE INDEX idx_players_session ON players(session_token);
```

**Leaderboard query — PII-free by design:**
```sql
-- Returns ONLY screen_name and score. No joins to PII.
SELECT
  screen_name,
  MAX(score) as high_score,
  rank_title
FROM scores
WHERE event_slug = $1
GROUP BY screen_name, rank_title
ORDER BY high_score DESC
LIMIT 20;
```

**Note:** `screen_name` is denormalized into the `scores` table specifically so the leaderboard query never needs to JOIN to the `players` table. This is an intentional architectural decision — even if someone got read access to the scores table or the leaderboard API, there's no path from screen name back to email/name/company without access to the players table.

---

## 6. HUBSPOT INTEGRATION — FORMS API

### How This Differs From Your Website UTM Flow

On `greenshades.com`, UTMs work like this: visitor arrives with query params → JS stores them in the browser (first-touch locked, last-touch overwritten) → at form submission, JS reads from browser storage and injects values into hidden fields.

**The game is a completely different context.** It's a standalone app on its own domain, not a page on your website. There's no prior browsing session, no stored UTMs from previous visits, no cookie-reading JS. Every player arrives fresh at a conference booth.

This means we should **not** try to replicate the full first-touch/last-touch UTM machinery. Instead, we send only what's needed to answer three questions:

| Question | How We Answer It | HubSpot Field |
|----------|-----------------|---------------|
| What channel did this lead come from? | Direct property set to "event" | `lead_acquisition_channel` |
| Which specific event? | Last-touch UTM source | `utm_source` |
| Was it the game (vs. badge scan, etc.)? | Last-touch UTM campaign | `utm_campaign` |

### Why We Skip First-Touch UTM Fields

Your website JS protects first-touch values — it only writes them once per visitor. But the Forms API has no such guard. If we send `first_touch_utm_source = hr-tech-2026` and the contact already exists in HubSpot from a Google Ads click six months ago, we'd **overwrite their real first touch** with event data. That corrupts your attribution.

By omitting the `first_touch_*` fields entirely:
- **New contacts** → HubSpot's built-in "Original Source" tracking captures this form submission as their first interaction automatically. No hidden field needed.
- **Existing contacts** → Their original first-touch data stays intact. The regular (last-touch) UTMs update correctly to reflect "this person was also at our booth."

### Setup: Create a Dedicated HubSpot Form

**Before building,** create a new HubSpot form in the HubSpot portal (Portal ID: `24081706`):

1. Go to Marketing → Forms → Create Form
2. Name it: **"Payroll Run — Conference Game Registration"**
3. Add these **visible fields:**
   - `firstname` (First name) — required
   - `lastname` (Last name) — required
   - `email` (Email) — required
   - `company` (Company name)
4. Add these **hidden fields:**
   - `lead_acquisition_channel` — direct attribution, always `event`
   - `utm_medium` — always `event`
   - `utm_source` — the event slug (e.g., `hr-tech-2026`)
   - `utm_campaign` — always `payroll-run-game`
5. **Do NOT add** `first_touch_*` fields, `gclid_field`, `utm_content`, or `utm_term`. They're unnecessary here and could cause data quality issues (see above).
6. Save and note the **Form ID** (the GUID)

### API Submission Code

```typescript
// src/lib/hubspot.ts

const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;       // "24081706"
const HUBSPOT_FORM_ID = process.env.HUBSPOT_GAME_FORM_ID;      // from step above
const HUBSPOT_FORMS_URL = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`;

interface GameRegistration {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  eventSlug: string;    // e.g., "hr-tech-2026"
  eventName: string;    // e.g., "HR Tech 2026"
}

export async function submitToHubSpot(data: GameRegistration): Promise<boolean> {
  try {
    const response = await fetch(HUBSPOT_FORMS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: [
          // ── Contact identity ──
          { name: 'firstname', value: data.firstName },
          { name: 'lastname', value: data.lastName },
          { name: 'email', value: data.email },
          { name: 'company', value: data.company },

          // ── Attribution (3 fields, that's it) ──
          { name: 'lead_acquisition_channel', value: 'event' },
          { name: 'utm_medium', value: 'event' },
          { name: 'utm_source', value: data.eventSlug },
          { name: 'utm_campaign', value: 'payroll-run-game' },

          // No first_touch_* fields — see "Why We Skip First-Touch" above
          // No gclid — no paid ads involved
          // No utm_content or utm_term — unnecessary granularity
        ],
        context: {
          pageUri: `https://payrollrun.greenshades.com`,
          pageName: `Payroll Run — ${data.eventName}`,
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('HubSpot form submission failed:', error);
    return false; // Game must still work if HubSpot is down
  }
}
```

### What This Gives You in HubSpot

For any contact who played the game, you can segment on:

- **`lead_acquisition_channel = event`** → all event leads across all conferences
- **`utm_source = hr-tech-2026`** → leads from a specific conference
- **`utm_campaign = payroll-run-game`** → leads specifically from the game (vs. badge scans or other booth capture)
- **Combine them:** `lead_acquisition_channel = event` AND `utm_campaign = payroll-run-game` AND `utm_source = hr-tech-2026` → game leads from HR Tech 2026

For existing contacts who came through the website first:
- Their `first_touch_*` / "Original Source" data is **preserved** (e.g., Google Ads)
- Their last-touch UTMs update to reflect the event interaction
- `lead_acquisition_channel` updates to `event` (this is correct — it reflects their most recent acquisition channel)

### Key Design Decisions

- **Forms API, not CRM API.** No HubSpot private app token needed — the Forms API uses portal ID + form ID. Simpler, fewer secrets.
- **Fire and forget.** If HubSpot is down, the game still works. We track `hubspot_submitted` as a boolean in Postgres so you can retry failures from the admin panel.
- **No HubSpot SDK needed.** It's one `fetch` call. No `@hubspot/api-client` dependency.
- **Existing contacts are handled automatically.** HubSpot's Forms API does upsert by email. If Jane already exists from a webinar, her contact updates with the new last-touch UTMs — but her first-touch data stays untouched.
- **Only 4 hidden fields.** Clean, intentional, nothing that could misfire. Every field has a clear purpose.

### Values by Event

When deploying for different conferences, only the env vars change:

| Env Var | HR Tech 2026 | Paycom Summit | SHRM Annual |
|---------|-------------|---------------|-------------|
| `EVENT_SLUG` | `hr-tech-2026` | `paycom-summit-2026` | `shrm-2026` |
| `EVENT_NAME` | `HR Tech 2026` | `Paycom Summit 2026` | `SHRM Annual 2026` |

Everything else stays the same: `lead_acquisition_channel=event`, `utm_medium=event`, `utm_campaign=payroll-run-game`.

### Optional: Post-Event Score Push

If you want reps to see game scores in HubSpot for personalized outreach, create two custom contact properties:
- `payroll_run_high_score` (Number)
- `payroll_run_rank` (Single-line text)

Then run a batch update from the admin panel after the event using the CRM API (this is the one place you'd use a private app token):

```typescript
// scripts/push-scores-to-hubspot.ts
// Run manually after the event, not in real-time
// Uses HubSpot CRM API (needs HUBSPOT_ACCESS_TOKEN)

for (const player of playersWithScores) {
  await hubspot.crm.contacts.basicApi.update(player.hubspot_contact_id, {
    properties: {
      payroll_run_high_score: String(player.highScore),
      payroll_run_rank: player.rankTitle,
    }
  });
}
```

This keeps the real-time game path simple (Forms API only) while giving you the CRM enrichment when you need it.

---

## 7. ANTI-CHEAT STRATEGY

Conference games will get messed with. Here's a layered defense:

1. **Server-side score validation** — Score is validated against game duration. The theoretical maximum is roughly $300/second at sustained peak play. Reject anything above $350/second.

2. **Session binding** — Scores are tied to a session token (httpOnly cookie) that was created at registration. No valid session = no score submission. Session tokens are UUIDs, not guessable.

3. **Rate limiting** — Max 1 score submission per 5 seconds per session. Prevents rapid-fire fake score posts.

4. **Duration floor** — Game must have been played for at least 5 seconds. A score of $10,000 in 2 seconds is clearly fabricated.

5. **Score ceiling** — Hard reject any score above $50,000 (extremely unlikely even for a 3+ minute run at maximum skill).

6. **Monotonic game clock** — Track start time server-side when the game page loads (via a `/api/game-start` ping). Compare against score submission time. If the elapsed wall-clock time doesn't match the reported `durationSeconds` within a reasonable tolerance (±5s), flag it.

7. **Admin purge** — Build a simple admin route (`/admin?key=SECRET`) that lets you view and delete suspicious scores during the event. Show score-to-duration ratio and flag outliers.

---

## 8. BOOTH SETUP & TV DISPLAY

### TV Configuration
- **Resolution:** 1920×1080 (the game canvas scales to fill)
- **Browser:** Chrome in kiosk mode (`--kiosk --disable-pinch --overscroll-history-navigation=0`)
- **URL:** `payrollrun.greenshades.com/leaderboard`
- **Auto-refresh:** Built into the page (10-second polling)
- **Prevent sleep:** Use a "caffeine" Chrome extension or OS setting to keep the screen awake

### Player Station
- Tablet (iPad) or laptop at the booth counter
- Chrome open to `payrollrun.greenshades.com`
- Optional: USB keyboard plugged into tablet for tactile Space/Down controls
- **Lock down the device:** Use Guided Access (iPad) or kiosk mode (Chrome) so players can't navigate away

### Booth Flow
1. Attendee walks up → booth rep says "Want to play our game? See if you can make the leaderboard!"
2. Attendee enters name + work email on tablet (~15 seconds)
3. Attendee plays (30-60 seconds per run)
4. Score appears on TV leaderboard → crowd reacts
5. Attendee tries again or walks away → lead is captured either way
6. Rep follows up with "Nice score! While you're here, let me show you what we actually do..."

### Multiple Player Stations
If you have 2-3 tablets at the booth:
- All point to the same URL and same database
- Leaderboard on TV updates from all stations
- Creates a competitive energy when players can see each other's scores going up in real time

---

## 9. PROJECT STRUCTURE FOR CLAUDE CODE

```
payroll-run/
├── README.md
├── package.json
├── next.config.js
├── vercel.json
├── .env.local                     # Local dev env vars
├── .env.example                   # Template for team
├── CLAUDE.md                      # Claude Code context file (paste key sections of this plan)
│
├── sql/
│   ├── 001-create-tables.sql      # Players + scores schema
│   └── 002-indexes.sql            # Performance indexes
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (fonts, metadata, no analytics)
│   │   ├── page.tsx               # Registration gate (Screen 1)
│   │   ├── play/
│   │   │   └── page.tsx           # Game wrapper (Screen 2, requires session)
│   │   ├── leaderboard/
│   │   │   └── page.tsx           # TV leaderboard display (Screen 3, PII-free)
│   │   └── admin/
│   │       └── page.tsx           # Score management (server-side auth)
│   │
│   ├── app/api/
│   │   ├── register/route.ts      # POST — validate, save player, submit HubSpot form
│   │   ├── game-start/route.ts    # POST — log game start time (anti-cheat)
│   │   ├── score/route.ts         # POST — validate + save score
│   │   └── leaderboard/route.ts   # GET — public, returns screen names + scores ONLY
│   │
│   ├── game/
│   │   ├── engine.ts              # Core game loop, physics, spawning, difficulty curve
│   │   ├── renderer.ts            # All Canvas drawing functions
│   │   ├── sprites.ts             # Flamingo, obstacles, collectibles pixel art
│   │   ├── input.ts               # Keyboard + touch input handler
│   │   ├── particles.ts           # Particle system + floating text
│   │   ├── constants.ts           # Colors, speeds, thresholds, rank tiers
│   │   └── types.ts               # TypeScript interfaces
│   │
│   ├── lib/
│   │   ├── hubspot.ts             # HubSpot Forms API submission (see Section 6)
│   │   ├── db.ts                  # Vercel Postgres client + typed queries
│   │   ├── validation.ts          # Email domain blocklist, profanity filter, input sanitization
│   │   ├── anti-cheat.ts          # Score validation logic
│   │   └── session.ts             # httpOnly cookie session management
│   │
│   └── components/
│       ├── RegistrationForm.tsx    # Email gate form component
│       ├── GameCanvas.tsx          # React wrapper around canvas game
│       ├── GameOverOverlay.tsx     # Score display + retry/leaderboard buttons
│       ├── Leaderboard.tsx         # Leaderboard table component
│       ├── LeaderboardTV.tsx       # Full-screen TV display version
│       └── QRCode.tsx              # QR code for phone play
│
├── public/
│   └── fonts/
│       └── PressStart2P.woff2     # Retro pixel font (self-hosted, no Google Fonts call)
│
└── scripts/
    ├── seed-db.ts                 # Initialize database tables
    ├── reset-event.ts             # Clear scores for new event (keeps player records)
    ├── purge-pii.ts               # Remove PII from players older than 90 days
    └── push-scores-to-hubspot.ts  # Batch update HubSpot contacts with scores (post-event)
```

---

## 10. ENVIRONMENT VARIABLES

```env
# ── Database ──
DATABASE_URL=postgres://...                     # Vercel Postgres connection string

# ── HubSpot Forms API (no private token needed) ──
HUBSPOT_PORTAL_ID=24081706                      # Your HubSpot portal ID
HUBSPOT_GAME_FORM_ID=xxxxxxxx-xxxx-xxxx-xxxx   # Form ID from the game registration form you create

# ── Event Configuration (change per conference) ──
NEXT_PUBLIC_EVENT_SLUG=hr-tech-2026             # Used as utm_source + DB event_slug
NEXT_PUBLIC_EVENT_NAME=HR Tech 2026             # Display name on leaderboard

# ── UTM Defaults (rarely change) ──
UTM_MEDIUM=event                                # Always "event" for conference games
UTM_CAMPAIGN=payroll-run-game                   # Campaign name for all game leads

# ── Security ──
ADMIN_SECRET=random-long-string-here            # Protects /admin panel
SESSION_COOKIE_NAME=pr_session                  # httpOnly cookie name

# ── Game URL (for QR code generation) ──
NEXT_PUBLIC_GAME_URL=https://payrollrun.greenshades.com

# ── Free Email Domain Blocklist ──
BLOCKED_EMAIL_DOMAINS=gmail.com,yahoo.com,hotmail.com,outlook.com,aol.com,icloud.com,protonmail.com,mail.com,live.com,msn.com,ymail.com,inbox.com,zohomail.com,tutanota.com,guerrillamail.com,tempmail.com,mailinator.com
```

---

## 11. CLAUDE CODE BUILD INSTRUCTIONS

Use these as prompts/tasks for Claude Code. Feed them in order. Reference this plan and the prototype `payroll-run.html` file as context.

**Important:** Before starting, create a `CLAUDE.md` file in the repo root with the key sections of this plan (architecture, PII rules, HubSpot integration code, DB schema). Claude Code uses this as persistent context.

### Phase 1: Project Scaffold
```
Initialize a Next.js 14 project with TypeScript, Tailwind CSS, and the App
Router. Add @vercel/postgres as the only external dependency (no HubSpot SDK
needed — we use the Forms API via fetch). Set up the folder structure from
the plan. Create .env.example with all environment variables documented.
Self-host the Press Start 2P font in /public/fonts (don't use Google Fonts
CDN). Create CLAUDE.md with project context.
```

### Phase 2: Database & Session
```
Create SQL migration files for the players and scores tables per the schema
in the plan. Key rules: players table holds PII (email, name, company),
scores table holds screen_name denormalized (no PII). Session tokens are
UUIDs stored in players.session_token and set as httpOnly cookies. Build
src/lib/db.ts with typed query helpers and src/lib/session.ts for cookie
management. Create seed and reset scripts.
```

### Phase 3: Registration Flow + Validation
```
Build the registration page at / with first name, last name, work email,
company (auto-filled from email domain), and optional screen name (max 12
chars, defaults to first name). Validate work email against the blocklist
of free email domains from env vars. Sanitize screen name: alphanumeric +
spaces only, profanity filter, trim whitespace. Style with Greenshades
branding: navy #062a47 header, green #85c441 accent, PT Serif headings,
Source Sans Pro body, pixel-art flamingo animation in background. On
submit, POST to /api/register.
```

### Phase 4: HubSpot Forms API Integration
```
In /api/register, after saving the player to Postgres, submit to the
HubSpot Forms API. This is NOT the CRM API — it's a POST to
https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formId}
with field values. Send only 4 hidden fields for attribution:
lead_acquisition_channel="event", utm_medium="event", utm_source=
EVENT_SLUG (from env), utm_campaign="payroll-run-game". Do NOT send
first_touch_* fields — the game is a standalone app, not on the main
website, and sending first-touch values would overwrite real first-touch
data for existing contacts. Fire and forget — if HubSpot fails, log the
error and set hubspot_submitted=false in the player record so we can
retry later. The game must work even if HubSpot is down. See the
submitToHubSpot function in the plan for the exact payload shape.
```

### Phase 5: The Game Engine
```
Build the Payroll Run game as a Canvas-based side-scroller in src/game/.
Reference the prototype payroll-run.html for the core mechanics and pixel
art. Key systems: flamingo with jump (Space/tap) and duck (Down/left-tap),
collectibles (paychecks $100×combo, W-2s $250×combo, bonus stars $500 +
invincibility), obstacles (tax signs, flying clocks, red tape stacks),
combo multiplier, speed acceleration (4.5→12), near-miss detection (8px
threshold, flash "CLOSE CALL!"), milestone celebrations at rank-up
thresholds, particle effects, screen shake on death. Difficulty curve:
spawn timer starts at 280 frames, tightens to 120, never closer than
100px gap. Wrap in GameCanvas.tsx React component.
```

### Phase 6: Score Submission & Anti-Cheat
```
POST /api/game-start on page load to record start time server-side.
On game over, POST /api/score with session token (from cookie), score, and
duration_seconds. Server validates: score/duration ratio < 350, duration > 5
seconds, score < 50000, wall-clock time matches reported duration ±5s, rate
limit 1 submission per 5 seconds. Save to scores table with denormalized
screen_name. Return leaderboard position and personal best. Build the game
over overlay with score, rank, position, retry button, and leaderboard link.
```

### Phase 7: Leaderboard (TV Display)
```
Build /leaderboard as a full-screen, TV-optimized display. Query /api/
leaderboard which returns ONLY screen_name, score, and rank_title — no PII
ever leaves the server on this endpoint. Top 20 personal bests per event.
Auto-refresh every 10 seconds. New entries highlight with a green flash.
Large retro font readable from 10 feet. Greenshades branding. Show total
player count. Generate a QR code in the bottom-right pointing to
NEXT_PUBLIC_GAME_URL. No interactive elements on this page.
```

### Phase 8: Admin Panel
```
Build /admin protected by ADMIN_SECRET query param (server-side check).
This is the ONLY place PII and scores appear together. Show: all players
with scores, HubSpot submission status, score/duration ratio (flag outliers),
ability to delete individual scores, bulk retry failed HubSpot submissions,
and a button to export leads as CSV. Also show event stats: total players,
total games played, average score, highest score.
```

### Phase 9: Polish & Deploy
```
Responsive design: game must work on iPad (booth) and phones (QR code).
Touch controls: right side of screen = jump, left side = duck. Add
optional retro sound effects (Web Audio API): jump bleep, coin collect
chime, death buzz, combo escalation tones. Sound ON by default for
?sound=on URL param (booth tablet), OFF by default otherwise. Set up
Vercel deployment with GitHub integration. Configure custom domain.
Test full flow end-to-end. Make sure /leaderboard works in Chrome kiosk
mode without scrollbars or UI chrome.
```

---

## 12. POST-EVENT MARKETING PLAYS

Once the conference is over, you have a goldmine of engaged leads:

**HubSpot segmentation (all powered by existing UTM workflows + direct attribution):**
- Primary filter: `lead_acquisition_channel = event` — catches all event leads regardless of UTM parsing
- Granular filter: `utm_source = {event-slug}` + `utm_campaign = payroll-run-game` — isolates a specific conference's game leads
- Your existing workflows handle lifecycle stage, MQL attribution, and routing
- Optionally run `scripts/push-scores-to-hubspot.ts` to enrich contacts with game data

**Immediate (same day) automated email:**
- Trigger a workflow on form submission where `utm_campaign = payroll-run-game`
- "Thanks for playing Payroll Run at [Event]! Here's what Greenshades can do for your payroll..."
- Include a link to keep playing (keep the game live for a week post-event)

**Sales enablement:**
- Reps filter their HubSpot view by `lead_acquisition_channel = event` + the event's `utm_source` value
- If you pushed scores: sort by `payroll_run_high_score` DESC to find most-engaged leads
- Personalized outreach: "I saw you hit VP of People Ops on our leaderboard — nice run! Curious if you've ever wished your actual payroll ran that smoothly?"

**Reuse for every conference:**
- Change 2 env vars (`EVENT_SLUG` and `EVENT_NAME`), redeploy
- Leaderboard resets per event, all leads accumulate in HubSpot
- Game code never changes

---

## 13. DECISIONS TO MAKE BEFORE BUILDING

1. **Domain:** `payrollrun.greenshades.com`? `game.greenshades.com`? Something else?

2. **HubSpot form:** Create the dedicated form (Section 6) and note the Form ID before starting Phase 4.

3. **Custom HubSpot properties:** Do you want `payroll_run_high_score` and `payroll_run_rank` on contacts for sales enablement? If yes, create them in HubSpot Settings → Properties before running the post-event score push script.

4. **Email blocking:** The blocklist in the plan covers major free providers. Your Google Workspace customers will be fine (`@company.com` passes). Do you want to also block `@test.com` and other obviously fake domains?

5. **Prize tiers:** If you're giving away swag at score thresholds, what are the tiers? (e.g., sticker for playing, t-shirt for $5,000+, AirPods for top 3). This affects the game over screen messaging and the leaderboard display.

6. **Sound on by default at booth?** Plan suggests `?sound=on` URL param for the booth tablet. Confirm this approach works for your setup.

7. **Consent language:** The fine print on the registration page needs legal review. Draft is: "By playing, you agree to receive info from Greenshades about our payroll and HR solutions. We'll never share your data with third parties."

---

*This plan is designed for handoff to Claude Code. Each phase is self-contained. The prototype game (payroll-run.html) serves as the reference for Phase 5. Create the CLAUDE.md file first so Claude Code has persistent context across sessions.*
