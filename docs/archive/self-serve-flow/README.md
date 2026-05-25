# Archived: env-var self-serve registration

These files capture the pre-multi-event registration flow, where the
homepage `/` rendered a registration form scoped to whichever event was
configured in `NEXT_PUBLIC_EVENT_SLUG`. Replaced when we shipped the
events table and moved to per-event URLs at `/[eventSlug]`.

Kept for reference in case the booth-only motion ever needs to support
a non-event "casual play" page again, or for porting bits of UI into
a future use case.

- `page.tsx.bak` — the homepage `/` content immediately before the
  multi-event rollout (commit `aca458f`).

The `/play` route remains live with env-var fallback so this style of
flow is still wired end-to-end; it just no longer has a UI entry
point on the marketing landing.
