# payroll-run

Payroll Runner is a retro pixel-art side-scrolling runner game designed for
Greenshades conference booths. A flamingo in sunglasses dashes through a
tropical payroll landscape collecting paychecks, W-2 forms, and bonus
multipliers while dodging tax penalties, missed deadlines, and compliance
violations.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture, PII rules, and
phased build plan. The game prototype lives in
[`prototype.html`](./prototype.html).

## Getting started

```bash
cp .env.example .env.local   # fill in real values
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript without emit

## Tech

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Vercel Postgres (`@vercel/postgres`)
- HubSpot Forms API (no SDK — direct `fetch`)

## Build status

Phase 1 (scaffold) is in place. Subsequent phases are tracked in `CLAUDE.md`.
