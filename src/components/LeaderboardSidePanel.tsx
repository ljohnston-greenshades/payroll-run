"use client";

import { useEffect, useRef, useState } from "react";
import type { LeaderboardEntry } from "@/lib/db";

interface Props {
  initialEntries: LeaderboardEntry[];
  initialTotal: number;
  eventSlug: string;
}

const POLL_INTERVAL_MS = 10_000;
const HIGHLIGHT_DURATION_MS = 5_000;
const MEDALS = ["🏆", "🥈", "🥉"];
const MAX_ROWS = 10;

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

function entryKey(entry: LeaderboardEntry): string {
  return `${entry.screen_name}:${entry.high_score}`;
}

// Compact leaderboard panel that sits beside the game canvas on the
// xl+ booth-display layout. Same polling cadence and highlight
// animation as LeaderboardTV but with denser rows so it fits in
// ~360px of horizontal space.
export function LeaderboardSidePanel({
  initialEntries,
  initialTotal,
  eventSlug,
}: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const previousKeys = useRef(new Set(initialEntries.map(entryKey)));

  useEffect(() => {
    let cancelled = false;
    const url = `/api/leaderboard?event=${encodeURIComponent(eventSlug)}`;
    const tick = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as LeaderboardResponse;
        if (cancelled) return;

        const incoming = new Set(data.entries.map(entryKey));
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
        // Network blip — keep the last good state.
      }
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [eventSlug]);

  return (
    <aside className="hidden h-full w-[320px] flex-col rounded-lg border border-gsGreen/30 bg-white/[0.04] p-4 xl:flex 2xl:w-[380px] 2xl:p-5">
      <div className="mb-3 border-b border-gsGreen/20 pb-2 2xl:mb-4 2xl:pb-3">
        <h2 className="font-pixel text-sm text-gsGreen 2xl:text-base">
          LEADERBOARD
        </h2>
        <p className="mt-1 font-serif text-xs text-white/45 2xl:text-sm">
          updates live
        </p>
      </div>
      {entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-pixel text-xs text-white/40">Be the first!</p>
        </div>
      ) : (
        <ol className="flex-1 space-y-1.5 overflow-hidden">
          {entries.slice(0, MAX_ROWS).map((entry, idx) => {
            const key = entryKey(entry);
            const medal = MEDALS[idx];
            const isHighlight = highlighted.has(key);
            return (
              <li
                key={key}
                className={`flex items-center gap-2 rounded px-2 py-1 transition-colors duration-700 ${
                  isHighlight ? "bg-gsGreen/30" : ""
                }`}
              >
                <span className="w-6 shrink-0 text-center font-pixel text-sm text-gsGreen 2xl:text-base">
                  {medal ?? idx + 1}
                </span>
                <span className="flex-1 truncate font-pixel text-xs text-white 2xl:text-sm">
                  {entry.screen_name}
                </span>
                <span className="shrink-0 font-pixel text-xs text-gsGreen 2xl:text-sm">
                  ${entry.high_score.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 border-t border-white/10 pt-2 font-pixel text-[0.55rem] uppercase tracking-widest text-white/40 2xl:mt-4 2xl:pt-3 2xl:text-xs">
        <span className="text-gsGreen">{total.toLocaleString()}</span>{" "}
        players today
      </p>
    </aside>
  );
}
