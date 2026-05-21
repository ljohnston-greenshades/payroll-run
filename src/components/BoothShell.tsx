"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "./GameCanvas";
import { LeaderboardTV } from "./LeaderboardTV";
import { QRCode } from "./QRCode";
import { useGamepadButtons } from "@/hooks/useGamepadButtons";
import type { LeaderboardEntry } from "@/lib/db";

interface Props {
  eventName: string;
  eventSlug: string;
  gameUrl: string;
  initialEntries: LeaderboardEntry[];
  initialTotal: number;
}

type Phase = "attract" | "ready" | "playing" | "gameover";

interface QueueNextResponse {
  entry: { id: string; screenName: string; status: "ready" | "playing" } | null;
  depth: number;
}

const POLL_INTERVAL_MS = 2_000;
const READY_TTL_SECONDS = 30;

export function BoothShell({
  eventName,
  eventSlug,
  gameUrl,
  initialEntries,
  initialTotal,
}: Props) {
  const [phase, setPhase] = useState<Phase>("attract");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [activeScreenName, setActiveScreenName] = useState<string | null>(null);
  const [queueDepth, setQueueDepth] = useState(0);
  const [readyCountdown, setReadyCountdown] = useState(READY_TTL_SECONDS);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Poll /api/queue/next while we're attract/ready. Once a player is
  // promoted to "ready" we stop polling — the screen sits on that
  // player until they press JUMP or the TTL expires.
  useEffect(() => {
    if (phase !== "attract") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/queue/next", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as QueueNextResponse;
        if (cancelled) return;
        setQueueDepth(data.depth);
        if (data.entry?.status === "ready") {
          setActiveEntryId(data.entry.id);
          setActiveScreenName(data.entry.screenName);
          setReadyCountdown(READY_TTL_SECONDS);
          setPhase("ready");
        } else if (data.entry?.status === "playing") {
          // Orphaned `playing` row from a previous booth session that
          // crashed or refreshed mid-game. The server won't promote
          // anyone new while this row blocks the spotlight, so expire
          // it client-side and let the next poll pick up the real
          // next player.
          fetch("/api/queue/skip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entryId: data.entry.id }),
          }).catch(() => {});
        }
      } catch {
        // Network blip — keep last good state.
      }
    };
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase]);

  // Ready-phase countdown. When it hits zero, server will already have
  // expired the entry on its next poll; we just bail back to attract.
  useEffect(() => {
    if (phase !== "ready") return;
    const id = setInterval(() => {
      setReadyCountdown((s) => Math.max(0, s - 1));
    }, 1_000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "ready" && readyCountdown <= 0) {
      // Explicitly expire on the server before going back to attract.
      // Otherwise the next poll can re-serve the same still-`ready`
      // row before the server's lazy reap catches up, looking like a
      // flicker between attract and a freshly-restarted countdown.
      const entryToExpire = activeEntryId;
      setActiveEntryId(null);
      setActiveScreenName(null);
      setPhase("attract");
      if (entryToExpire) {
        fetch("/api/queue/skip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: entryToExpire }),
        }).catch(() => {});
      }
    }
  }, [phase, readyCountdown, activeEntryId]);

  const startGame = useCallback(async () => {
    if (!activeEntryId) return;
    try {
      const res = await fetch("/api/queue/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: activeEntryId }),
      });
      if (!res.ok) return;
      setPhase("playing");
    } catch {
      // Stay on the ready screen — they can press again.
    }
  }, [activeEntryId]);

  const skipActive = useCallback(async () => {
    if (!activeEntryId) return;
    try {
      await fetch("/api/queue/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: activeEntryId }),
      });
    } catch {
      // Best-effort; if it failed, the TTL will catch it.
    }
    setActiveEntryId(null);
    setActiveScreenName(null);
    setPhase("attract");
  }, [activeEntryId]);

  // Gamepad: on READY, B0 starts the game; B0+B1 held = skip.
  useGamepadButtons({
    onB0: () => {
      if (phaseRef.current === "ready") startGame();
    },
    onBothHeld: () => {
      if (phaseRef.current === "ready") skipActive();
    },
    enabled: phase === "ready",
  });

  // Keyboard fallback for testing without the arcade controller:
  // Space/Enter starts the game from READY; Esc skips.
  useEffect(() => {
    if (phase !== "ready") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        startGame();
      } else if (e.code === "Escape") {
        e.preventDefault();
        skipActive();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, startGame, skipActive]);

  // After a run finishes, GameCanvas fires onGameOver → we wait a beat
  // for the player to read their score, then return to attract (which
  // will pick up the next person in line, or sit on the attract
  // screen).
  const onGameOver = useCallback(() => {
    setPhase("gameover");
    setTimeout(() => {
      setActiveEntryId(null);
      setActiveScreenName(null);
      setPhase("attract");
    }, 8_000);
  }, []);

  return (
    <div className="relative z-10 flex h-full flex-col">
      {phase === "attract" ? (
        <AttractScreen
          eventName={eventName}
          eventSlug={eventSlug}
          gameUrl={gameUrl}
          depth={queueDepth}
          initialEntries={initialEntries}
          initialTotal={initialTotal}
        />
      ) : phase === "ready" ? (
        <ReadyScreen
          screenName={activeScreenName ?? ""}
          secondsLeft={readyCountdown}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-4 pb-6 pt-4">
          <GameCanvas
            screenName={activeScreenName ?? undefined}
            mode="booth"
            autoStart
            onGameOver={onGameOver}
          />
        </div>
      )}
    </div>
  );
}

function AttractScreen({
  eventName,
  eventSlug,
  gameUrl,
  depth,
  initialEntries,
  initialTotal,
}: {
  eventName: string;
  eventSlug: string;
  gameUrl: string;
  depth: number;
  initialEntries: LeaderboardEntry[];
  initialTotal: number;
}) {
  const qrUrl = gameUrl ? `${gameUrl}/?mode=booth` : "";
  return (
    <div className="flex h-full flex-col items-stretch gap-6 px-8 py-6 lg:px-12 lg:py-8 xl:px-16">
      <header className="flex items-baseline justify-between">
        <h1 className="font-pixel text-3xl text-gsGreen lg:text-5xl xl:text-6xl">
          PAYROLL RUN
        </h1>
        <p className="font-serif text-sm uppercase tracking-[0.25em] text-white/70 lg:text-lg">
          {eventName}
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-[1.5fr,1fr]">
        <section className="flex flex-col rounded-lg border border-gsGreen/30 bg-white/[0.04] p-6 lg:p-8">
          <h2 className="mb-4 font-pixel text-base uppercase tracking-wider text-gsGreen lg:text-xl">
            Leaderboard
          </h2>
          <div className="flex-1 overflow-hidden">
            <LeaderboardTV
              initialEntries={initialEntries}
              initialTotal={initialTotal}
              eventSlug={eventSlug}
            />
          </div>
          <p className="mt-4 border-t border-white/10 pt-3 font-pixel text-xs uppercase tracking-widest text-white/55 lg:text-sm">
            <span className="text-gsGreen">{initialTotal.toLocaleString()}</span>{" "}
            players today
          </p>
        </section>

        <section className="flex flex-col items-center justify-center rounded-lg border-2 border-gsGreen bg-gsNavy/70 p-6 text-center lg:p-8">
          <div className="font-pixel text-lg uppercase tracking-wider text-gsGreen lg:text-2xl">
            Scan to play
          </div>
          <p className="mt-3 font-serif text-sm text-white/85 lg:text-base">
            Register on your phone — we&apos;ll call you up when it&apos;s your
            turn.
          </p>
          {qrUrl ? (
            <div className="mt-5 rounded-md bg-white p-4 lg:p-5">
              <QRCode value={qrUrl} size={220} />
            </div>
          ) : null}
          <div className="mt-5 font-pixel text-xs uppercase tracking-widest text-white/70 lg:text-sm">
            {depth === 0 ? (
              <>No one in line — you&apos;re up first</>
            ) : (
              <>
                <span className="text-gsGreen">{depth}</span>{" "}
                in line
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReadyScreen({
  screenName,
  secondsLeft,
}: {
  screenName: string;
  secondsLeft: number;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <p className="font-pixel text-xs uppercase tracking-[0.4em] text-white/70 lg:text-base">
        You&apos;re up
      </p>
      <div className="mt-4 font-pixel text-6xl text-gsGreen lg:text-8xl xl:text-9xl">
        {screenName}
      </div>
      <p className="mt-10 font-serif text-2xl text-white/90 lg:text-4xl">
        Press the{" "}
        <span className="font-pixel uppercase text-gsGreen">JUMP</span>{" "}
        button to begin
      </p>
      <div className="mt-12 font-pixel text-base uppercase tracking-widest text-white/55 lg:text-xl">
        Starting in {secondsLeft}s…
      </div>
    </div>
  );
}
