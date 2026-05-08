"use client";

import { useEffect, useRef, useState } from "react";
import type { LeaderboardEntry } from "@/lib/db";

const POLL_INTERVAL_MS = 10_000;
const HIGHLIGHT_DURATION_MS = 5_000;
const MEDALS = ["🏆", "🥈", "🥉"];

interface Props {
  initialEntries: LeaderboardEntry[];
  initialTotal: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

function entryKey(entry: LeaderboardEntry): string {
  return `${entry.screen_name}:${entry.high_score}`;
}

export function LeaderboardTV({ initialEntries, initialTotal }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const previousKeys = useRef(new Set(initialEntries.map(entryKey)));

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
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
        // Network blip — keep showing the last good state.
      }
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

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
                key={key}
                className={`border-b border-white/5 transition-colors duration-700 ${
                  isHighlight ? "bg-gsGreen/30" : ""
                }`}
              >
                <td className="w-24 py-3 text-center font-pixel text-3xl text-gsGreen">
                  {medal ?? `${idx + 1}`}
                </td>
                <td className="py-3 font-pixel text-2xl text-white">
                  {entry.screen_name}
                </td>
                <td className="py-3 text-right font-pixel text-2xl text-gsGreen">
                  ${entry.high_score.toLocaleString()}
                </td>
                <td className="hidden py-3 pl-8 font-serif text-xl text-white/70 md:table-cell">
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
