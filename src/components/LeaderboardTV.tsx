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
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

function entryKey(entry: LeaderboardEntry): string {
  return `${entry.screen_name}:${entry.high_score}`;
}

export function LeaderboardTV({ initialEntries, initialTotal, eventSlug }: Props) {
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

  useLayoutEffect(() => {
    const liveScreenNames = new Set<string>();
    rowRefs.current.forEach((el, screenName) => {
      liveScreenNames.add(screenName);
      const currentTop = el.offsetTop;
      const prevTop = lastTops.current.get(screenName);
      if (prevTop !== undefined && prevTop !== currentTop) {
        const dy = prevTop - currentTop;
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

  useEffect(() => {
    let cancelled = false;
    // The first poll on mount reseeds against the live state — the
    // server-rendered `initialEntries` snapshot may be stale (in
    // particular, /booth unmounts and remounts this component between
    // games and the initial snapshot can be many minutes old by then).
    // Diffing against that stale baseline would flash every change
    // that's happened since the page first loaded, lighting up rows
    // that aren't actually new.
    let isFirstPoll = true;
    const url = `/api/leaderboard?event=${encodeURIComponent(eventSlug)}`;
    const tick = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as LeaderboardResponse;
        if (cancelled) return;

        const incoming = new Set(data.entries.map(entryKey));
        if (isFirstPoll) {
          previousKeys.current = incoming;
          setEntries(data.entries);
          setTotal(data.total);
          isFirstPoll = false;
          return;
        }
        const fresh = new Set<string>();
        for (const key of incoming) {
          if (!previousKeys.current.has(key)) fresh.add(key);
        }
        previousKeys.current = incoming;

        setEntries(data.entries);
        setTotal(data.total);

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
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [eventSlug]);

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-pixel text-3xl text-white/40">Be the first to score!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <tbody>
          {entries.map((entry, idx) => {
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
