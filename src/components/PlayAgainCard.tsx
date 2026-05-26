"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface Props {
  eventSlug: string;
  screenName: string;
  // The just-played run's score (most recent in the scores table for
  // this player+event). When equal to personalBest we know this run
  // set the new top. When less than personalBest, we surface the PB
  // separately for clarity.
  runScore?: number | null;
  personalBest?: number;
  personalRank?: number;
  personalTotal?: number;
  initialDemoRequested?: boolean;
}

export function PlayAgainCard({
  eventSlug,
  screenName,
  runScore,
  personalBest = 0,
  personalRank = 0,
  personalTotal = 0,
  initialDemoRequested = false,
}: Props) {
  const router = useRouter();
  const [playBusy, setPlayBusy] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoRequested, setDemoRequested] = useState(initialDemoRequested);
  const [demoError, setDemoError] = useState<string | null>(null);

  // Deterministic confetti scatter per render so the celebratory bits
  // around the screen name don't flicker between renders.
  const confetti = useMemo(() => buildConfetti(), []);

  const onPlayAgain = async () => {
    setPlayBusy(true);
    setPlayError(null);
    try {
      const res = await fetch("/api/queue/rejoin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.queueToken) {
        setPlayError("Couldn't get you in line. Please try again.");
        setPlayBusy(false);
        return;
      }
      router.push(`/queue/${data.queueToken}`);
    } catch {
      setPlayError("Network error. Please try again.");
      setPlayBusy(false);
    }
  };

  const onRequestDemo = async () => {
    setDemoBusy(true);
    setDemoError(null);
    try {
      const res = await fetch("/api/demo-request", { method: "POST" });
      if (!res.ok) {
        setDemoError("Couldn't send. Please try again.");
        setDemoBusy(false);
        return;
      }
      setDemoRequested(true);
    } catch {
      setDemoError("Network error. Please try again.");
    } finally {
      setDemoBusy(false);
    }
  };

  const onSwitchPlayer = async () => {
    try {
      await fetch("/api/session/clear", { method: "POST" });
    } catch {
      // Reload anyway — the form will show on a fresh navigation.
    }
    router.refresh();
  };

  const hasStats = personalRank > 0 && personalTotal > 0;
  const displayScore = runScore ?? personalBest;
  const isNewBest = runScore != null && runScore >= personalBest && runScore > 0;

  return (
    <div className="w-full">
      {/* Welcome banner with confetti + stars */}
      <div className="relative text-center">
        <Star className="absolute left-4 top-1 h-4 w-4 text-yellow-300/80" />
        <Star className="absolute right-4 top-1 h-3 w-3 text-yellow-300/60" />
        <p className="font-pixel text-xs uppercase tracking-widest text-white/65">
          Welcome back,
        </p>
        <div className="relative mt-2 inline-block">
          {confetti.map((c, i) => (
            <span
              key={i}
              aria-hidden
              className="pointer-events-none absolute rounded-[1px]"
              style={{
                left: c.left,
                top: c.top,
                width: c.w,
                height: c.h,
                background: c.color,
                transform: `rotate(${c.rot}deg)`,
              }}
            />
          ))}
          <p className="relative font-pixel text-4xl text-gsGreen sm:text-5xl">
            {screenName}
          </p>
        </div>
      </div>

      {/* Greenshades trophy with radiating glow */}
      <div className="relative mt-6 flex justify-center">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(133,196,65,0.35), transparent 65%)",
          }}
        />
        <Trophy className="h-24 w-24 sm:h-28 sm:w-28" />
      </div>

      {/* Score card — clearly distinguishes "this run" from "personal best" */}
      <div className="mt-6 rounded-lg border border-gsGreen/30 bg-white/[0.04] p-5">
        <p className="text-center font-pixel text-sm tracking-widest text-gsGreen">
          NICE WORK!
        </p>
        <p className="mt-1 text-center font-serif text-sm text-white/70">
          {isNewBest && runScore != null && runScore > 0
            ? "New personal best!"
            : "You scored"}
        </p>
        <div className="mt-3 flex items-stretch justify-center gap-5">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="font-pixel text-3xl text-gsGreen sm:text-4xl">
              ${displayScore.toLocaleString()}
            </p>
            {!isNewBest && runScore != null && runScore < personalBest ? (
              <p className="mt-1 font-serif text-[0.7rem] uppercase tracking-widest text-white/55">
                Best ${personalBest.toLocaleString()}
              </p>
            ) : null}
          </div>
          {hasStats ? (
            <>
              <div className="w-px self-stretch bg-white/15" />
              <div className="flex flex-col items-center justify-center text-center">
                <p className="font-pixel text-[0.7rem] uppercase tracking-widest text-white/55">
                  Rank
                </p>
                <p className="mt-1 font-pixel text-2xl text-gsGreen sm:text-3xl">
                  #{personalRank}
                </p>
                <p className="mt-0.5 font-serif text-[0.7rem] uppercase tracking-widest text-white/55">
                  of {personalTotal}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Play Again — full-width card-style primary CTA */}
      <button
        type="button"
        onClick={onPlayAgain}
        disabled={playBusy}
        className="mt-4 flex w-full items-center gap-4 rounded-lg bg-gsGreen p-4 text-left shadow-lg shadow-gsGreen/15 transition hover:brightness-105 active:translate-y-px disabled:opacity-60"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gsNavy/15">
          <PlayIcon className="h-6 w-6 text-gsNavy" />
        </span>
        <span className="flex-1">
          <span className="flex items-center justify-between font-pixel text-base text-gsNavy">
            <span>{playBusy ? "GETTING IN LINE…" : "PLAY AGAIN"}</span>
            <span aria-hidden>→</span>
          </span>
          <span className="mt-1 block font-serif text-xs text-gsNavy/75">
            Click play again to get back in line. No need to fill out the form
            again.
          </span>
        </span>
      </button>
      {playError ? (
        <p className="mt-1 text-center text-xs text-red-300" role="alert">
          {playError}
        </p>
      ) : null}

      {/* Request a Demo — white card-style secondary CTA */}
      {demoRequested ? (
        <div className="mt-3 flex items-center gap-4 rounded-lg border border-gsGreen/40 bg-gsGreen/10 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gsGreen text-gsNavy">
            <CheckIcon className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <span className="block font-pixel text-base text-gsGreen">
              YOU&apos;RE ON THE LIST
            </span>
            <span className="mt-1 block font-serif text-xs text-white/80">
              We&apos;ll reach out within 24 hours.
            </span>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onRequestDemo}
          disabled={demoBusy}
          className="mt-3 flex w-full items-center gap-4 rounded-lg bg-white p-4 text-left shadow-lg shadow-black/20 transition hover:bg-white/95 active:translate-y-px disabled:opacity-60"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gsGreen">
            <CalendarIcon className="h-6 w-6 text-white" />
          </span>
          <span className="flex-1">
            <span className="flex items-center justify-between font-pixel text-base text-gsNavy">
              <span>{demoBusy ? "SENDING…" : "REQUEST A DEMO"}</span>
              <span aria-hidden>→</span>
            </span>
            <span className="mt-1 block font-serif text-xs text-gsNavy/75">
              See how Greenshades can simplify payroll and workforce
              management.
            </span>
          </span>
        </button>
      )}
      {demoError ? (
        <p className="mt-1 text-center text-xs text-red-300" role="alert">
          {demoError}
        </p>
      ) : null}

      {/* AirPods prize callout — subtle outlined card */}
      <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/15 px-4 py-3">
        <AirpodsIcon className="h-10 w-10 shrink-0 text-white/85" />
        <div className="flex-1">
          <p className="font-serif text-sm text-gsGreen">
            You&apos;re in the running to win AirPods!
          </p>
          <p className="mt-0.5 font-serif text-xs text-white/55">
            Winners will be notified after the event.
          </p>
        </div>
      </div>

      {/* Switch player link */}
      <p className="mt-5 text-center font-serif text-sm text-white/55">
        Not you?{" "}
        <button
          type="button"
          onClick={onSwitchPlayer}
          className="text-gsGreen underline underline-offset-2 hover:text-white"
        >
          Start over
        </button>
        .
      </p>
    </div>
  );
}

// ───────── decorations + icons ─────────

interface ConfettiPiece {
  left: number;
  top: number;
  w: number;
  h: number;
  color: string;
  rot: number;
}

function buildConfetti(): ConfettiPiece[] {
  // Deterministic pseudo-random so the confetti layout doesn't
  // shift between renders/refreshes.
  const colors = ["#85c441", "#5ea832", "#b6ff5a", "#f5d50c"];
  const seed = 42;
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: 16 }, (_, i) => ({
    left: (rand() - 0.5) * 280,
    top: (rand() - 0.5) * 80,
    w: 5 + Math.floor(rand() * 5),
    h: 8 + Math.floor(rand() * 6),
    color: colors[i % colors.length],
    rot: Math.floor(rand() * 360),
  }));
}

function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l2.4 6.9 7.1.2-5.6 4.3 2 6.8L12 16l-5.9 4.2 2-6.8-5.6-4.3 7.1-.2z" />
    </svg>
  );
}

function Trophy({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden>
      <defs>
        <linearGradient id="cupGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b6ff5a" />
          <stop offset="60%" stopColor="#85c441" />
          <stop offset="100%" stopColor="#5ea832" />
        </linearGradient>
      </defs>
      {/* Light rays */}
      <g stroke="#85c441" strokeWidth="1.5" opacity="0.45">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => {
          const r = a * (Math.PI / 180);
          const cx = 50 + Math.cos(r) * 12;
          const cy = 45 + Math.sin(r) * 12;
          const ex = 50 + Math.cos(r) * 48;
          const ey = 45 + Math.sin(r) * 48;
          return <line key={a} x1={cx} y1={cy} x2={ex} y2={ey} />;
        })}
      </g>
      {/* Cup body */}
      <path
        d="M 28 18 L 72 18 L 70 50 Q 70 64 50 64 Q 30 64 30 50 Z"
        fill="url(#cupGrad)"
        stroke="#3a6b1f"
        strokeWidth="1.5"
      />
      {/* Handles */}
      <path
        d="M 28 22 Q 14 24 14 38 Q 14 50 27 50"
        fill="none"
        stroke="#85c441"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M 72 22 Q 86 24 86 38 Q 86 50 73 50"
        fill="none"
        stroke="#85c441"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Stem */}
      <rect x="44" y="64" width="12" height="10" fill="#5ea832" />
      {/* Base tiers */}
      <rect x="36" y="74" width="28" height="6" rx="1" fill="#5ea832" />
      <rect x="30" y="80" width="40" height="6" rx="1" fill="#3a6b1f" />
      {/* Greenshades "G" mark */}
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="#fff"
      >
        G
      </text>
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M7 5.5v13a1 1 0 001.5.87l11-6.5a1 1 0 000-1.74l-11-6.5A1 1 0 007 5.5z" />
    </svg>
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="5 12 10 17 19 7" />
    </svg>
  );
}

function AirpodsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {/* Case (open) */}
      <path
        d="M 18 38 L 46 38 L 44 56 Q 44 60 40 60 L 24 60 Q 20 60 20 56 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="18"
        y1="44"
        x2="46"
        y2="44"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Left earbud */}
      <ellipse cx="20" cy="22" rx="6" ry="8" fill="currentColor" />
      <rect x="18" y="24" width="4" height="14" rx="2" fill="currentColor" />
      {/* Right earbud */}
      <ellipse cx="44" cy="22" rx="6" ry="8" fill="currentColor" />
      <rect x="42" y="24" width="4" height="14" rx="2" fill="currentColor" />
    </svg>
  );
}
