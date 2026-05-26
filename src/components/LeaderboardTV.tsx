"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LeaderboardEntry } from "@/lib/db";

const POLL_INTERVAL_MS = 10_000;
const HIGHLIGHT_DURATION_MS = 5_000;
const SHUFFLE_DURATION_MS = 700;
const MEDALS = ["🏆", "🥈", "🥉"];

interface Props {
  initialEntries: LeaderboardEntry[];
  initialTotal: number;
  eventSlug: string;
  // Optional hard ceiling on how many rows ever render. The actual
  // visible count is the min of this and what the available container
  // height can fit (measured at runtime via ResizeObserver). On a 1080p
  // TV the natural cap is ~20; on a phone it might be ~6.
  maxVisible?: number;
  // Called whenever the polled total changes, so the parent can show
  // a live player count footer outside this component.
  onTotalChange?: (total: number) => void;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

function entryKey(entry: LeaderboardEntry): string {
  return `${entry.screen_name}:${entry.high_score}`;
}

export function LeaderboardTV({
  initialEntries,
  initialTotal,
  eventSlug,
  maxVisible,
  onTotalChange,
}: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const previousKeys = useRef(new Set(initialEntries.map(entryKey)));

  // FLIP refs — track each row's previous top so we can animate the
  // delta when rankings shuffle. Keyed by screen_name (stable per
  // player) so a player who improves their PB keeps the same row
  // identity and animates from old rank to new rank.
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const lastTops = useRef<Map<string, number>>(new Map());

  // Responsive row cap. We measure the container's actual height
  // and divide by the actual rendered row height to figure out how
  // many rows fit without pushing adjacent UI off the viewport. A
  // ResizeObserver keeps this in sync across page-load, window
  // resize, and orientation changes; a second layout effect keyed on
  // `entries` re-measures after the first row has actually painted
  // so the row-height read isn't stuck at the conservative fallback.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fittingRows, setFittingRows] = useState<number>(12);
  const recalcFit = useRef<() => void>(() => {});
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const recalc = () => {
      const h = container.clientHeight;
      if (h <= 0) return;
      const firstRow = rowRefs.current.values().next().value as
        | HTMLTableRowElement
        | undefined;
      const rowH = firstRow?.offsetHeight ?? 0;
      const perRow = rowH > 0 ? rowH : 48;
      const fits = Math.max(3, Math.floor(h / perRow));
      setFittingRows((prev) => (prev === fits ? prev : fits));
    };
    recalcFit.current = recalc;
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(container);
    window.addEventListener("resize", recalc);
    window.addEventListener("orientationchange", recalc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
      window.removeEventListener("orientationchange", recalc);
    };
  }, []);
  // Names of players whose score actually changed on the most recent
  // poll. Only THESE rows get animated — when a fresh PB displaces 5
  // other players, animating all 6 at once feels chaotic, so the
  // displaced rows snap silently to their new positions while only
  // the riser gets the spotlight.
  const freshScreenNames = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    const liveScreenNames = new Set<string>();
    rowRefs.current.forEach((el, screenName) => {
      liveScreenNames.add(screenName);
      const currentTop = el.offsetTop;
      const prevTop = lastTops.current.get(screenName);
      const shouldAnimate =
        prevTop !== undefined &&
        prevTop !== currentTop &&
        freshScreenNames.current.has(screenName);
      if (shouldAnimate) {
        const dy = prevTop! - currentTop;
        el.style.transition = "none";
        el.style.transform = `translateY(${dy}px)`;
        // Force a synchronous reflow so the browser actually paints
        // the offset before we animate back to 0.
        void el.getBoundingClientRect();
        requestAnimationFrame(() => {
          el.style.transition = `transform ${SHUFFLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
          el.style.transform = "";
        });
      }
      lastTops.current.set(screenName, currentTop);
    });
    // Drop refs for rows that left the visible list so the map
    // doesn't grow forever.
    for (const key of Array.from(lastTops.current.keys())) {
      if (!liveScreenNames.has(key)) lastTops.current.delete(key);
    }
  }, [entries]);

  // After the entries actually paint, re-measure to refine the
  // fitting-row count using the now-known row height. Cheap; just
  // calls the same recalc the ResizeObserver runs.
  useLayoutEffect(() => {
    recalcFit.current();
  }, [entries]);

  useEffect(() => {
    let cancelled = false;
    // Animations + highlights should fire only on the FIRST poll
    // after this component mounts. That moment lines up with the
    // booth returning to attract after a game — which is exactly
    // when the player wants to see what just changed. Subsequent
    // polls update the data silently so the leaderboard doesn't
    // flicker every 10 seconds.
    //
    // To diff the first poll against pre-game state (not just the
    // server-rendered initialEntries), we stash the latest known
    // keys in sessionStorage on every poll. When the component
    // unmounts (game starts) and remounts (game ends), sessionStorage
    // still has the pre-game snapshot, so the first poll's diff
    // surfaces exactly what changed during the playthrough.
    let isFirstPoll = true;
    const storageKey = `lb-baseline:${eventSlug}`;
    let baselineKeys: Set<string>;
    try {
      const stored = sessionStorage.getItem(storageKey);
      baselineKeys = stored
        ? new Set(JSON.parse(stored) as string[])
        : new Set(initialEntries.map(entryKey));
    } catch {
      baselineKeys = new Set(initialEntries.map(entryKey));
    }
    previousKeys.current = baselineKeys;

    const url = `/api/leaderboard?event=${encodeURIComponent(eventSlug)}`;
    const tick = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as LeaderboardResponse;
        if (cancelled) return;

        const incoming = new Set(data.entries.map(entryKey));

        // Diff against the stored baseline only on the very first
        // poll after mount. All subsequent polls update silently.
        const fresh = new Set<string>();
        const freshNames = new Set<string>();
        if (isFirstPoll) {
          for (const entry of data.entries) {
            const key = entryKey(entry);
            if (!previousKeys.current.has(key)) {
              fresh.add(key);
              freshNames.add(entry.screen_name);
            }
          }
          isFirstPoll = false;
        }
        previousKeys.current = incoming;
        freshScreenNames.current = freshNames;

        // Persist the current state so the NEXT mount can diff
        // against this poll instead of the server-rendered snapshot.
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify(Array.from(incoming)),
          );
        } catch {
          // sessionStorage write failed (private mode?). Continue.
        }

        setEntries(data.entries);
        setTotal(data.total);
        onTotalChange?.(data.total);

        if (fresh.size > 0) {
          setHighlighted((prev) => {
            const next = new Set(prev);
            fresh.forEach((k) => next.add(k));
            return next;
          });
          setTimeout(() => {
            if (cancelled) return;
            setHighlighted((prev) => {
              const next = new Set(prev);
              fresh.forEach((k) => next.delete(k));
              return next;
            });
          }, HIGHLIGHT_DURATION_MS);
        }
      } catch {
        // Network blip — keep showing the last good state.
      }
    };
    // Fire the first poll immediately on mount so the post-game
    // animation lands the moment the booth returns to attract — not
    // 10 seconds later.
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // initialEntries is read once via the closure inside the effect
    // (for the sessionStorage fallback baseline); it doesn't need to
    // re-trigger the effect when the parent passes a new reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug]);

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-pixel text-3xl text-white/40">Be the first to score!</p>
      </div>
    );
  }

  // Effective cap = the smaller of (a) what the container can fit,
  // measured at runtime, and (b) the optional ceiling passed in via
  // maxVisible. If neither is set, every API entry renders.
  const measuredCap = fittingRows;
  const effectiveCap =
    typeof maxVisible === "number"
      ? Math.min(maxVisible, measuredCap)
      : measuredCap;
  const visibleEntries = entries.slice(0, effectiveCap);

  return (
    <div ref={containerRef} className="h-full overflow-hidden">
      <table className="w-full">
        <tbody>
          {visibleEntries.map((entry, idx) => {
            const key = entryKey(entry);
            const medal = MEDALS[idx];
            const isHighlight = highlighted.has(key);
            return (
              <tr
                // Stable per-player key keeps row identity across
                // score updates, so FLIP can animate the slide.
                key={entry.screen_name}
                ref={(el) => {
                  if (el) rowRefs.current.set(entry.screen_name, el);
                  else rowRefs.current.delete(entry.screen_name);
                }}
                className={`border-b border-white/5 transition-colors duration-700 ${
                  isHighlight ? "bg-gsGreen/30" : ""
                }`}
              >
                <td className="w-12 py-2 text-center font-pixel text-lg text-gsGreen sm:w-16 md:w-24 md:py-3 md:text-3xl">
                  {medal ?? `${idx + 1}`}
                </td>
                <td className="py-2 font-pixel text-sm text-white sm:text-base md:py-3 md:text-2xl">
                  {entry.screen_name}
                </td>
                <td className="py-2 text-right font-pixel text-sm text-gsGreen sm:text-base md:py-3 md:text-2xl">
                  ${entry.high_score.toLocaleString()}
                </td>
                <td className="hidden py-3 pl-8 font-serif text-xl text-white/70 lg:table-cell">
                  {entry.rank_title}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sr-only">Total players: {total}</p>
    </div>
  );
}
