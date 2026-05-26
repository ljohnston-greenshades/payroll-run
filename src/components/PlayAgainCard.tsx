"use client";

import Image from "next/image";
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
  const isNewBest =
    runScore != null && runScore >= personalBest && runScore > 0;

  return (
    <div className="relative w-full">
      <BackgroundConfetti />

      <div className="relative">
        {/* Welcome banner with star decorations */}
        <div className="relative text-center">
          <Star className="absolute left-4 top-1 h-4 w-4 text-yellow-300/80" />
          <Star className="absolute right-4 top-1 h-3 w-3 text-yellow-300/60" />
          <p className="font-pixel text-xs uppercase tracking-widest text-white/65">
            Welcome back,
          </p>
          <p className="relative mt-2 font-pixel text-4xl text-gsGreen sm:text-5xl">
            {screenName}
          </p>
        </div>

        {/* Greenshades trophy PNG with radiating glow behind */}
        <div className="relative mt-6 flex justify-center">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(133,196,65,0.40), transparent 65%)",
            }}
          />
          <Image
            src="/trophy.png"
            alt=""
            width={240}
            height={240}
            unoptimized
            priority
            className="h-28 w-auto sm:h-32"
          />
        </div>

        {/* Score card */}
        <div className="mt-6 rounded-lg border border-gsGreen/30 bg-white/[0.04] p-5">
          <p className="text-center font-pixel text-xs uppercase tracking-widest text-white/65">
            {isNewBest && runScore != null && runScore > 0
              ? "New personal best!"
              : "Nice work!"}
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

        {/* Play Again — full-width green card-button */}
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
              Click here to get back in line. No need to fill out the form
              again. We&apos;ll let you know when you&apos;re up.
            </span>
          </span>
        </button>
        {playError ? (
          <p className="mt-1 text-center text-xs text-red-300" role="alert">
            {playError}
          </p>
        ) : null}

        {/* Get a real compliance shield — white card-button */}
        {demoRequested ? (
          <div className="mt-3 flex items-center gap-4 rounded-lg border border-gsGreen/40 bg-gsGreen/10 p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gsGreen text-gsNavy">
              <CheckIcon className="h-6 w-6" />
            </span>
            <span className="flex-1">
              <span className="block font-pixel text-sm text-gsGreen">
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
              <ShieldIcon className="h-6 w-6 text-white" />
            </span>
            <span className="flex-1">
              <span className="flex items-center justify-between gap-2 font-pixel text-xs text-gsNavy sm:text-sm">
                <span className="whitespace-nowrap">
                  {demoBusy ? "SENDING…" : "GET A REAL COMPLIANCE SHIELD"}
                </span>
                <span aria-hidden>→</span>
              </span>
              <span className="mt-1 block font-serif text-xs text-gsNavy/75">
                See how Greenshades can simplify payroll and workforce
                management for your team!
              </span>
            </span>
          </button>
        )}
        {demoError ? (
          <p className="mt-1 text-center text-xs text-red-300" role="alert">
            {demoError}
          </p>
        ) : null}

        {/* AirPods prize callout — same circle-icon pattern as the
            CTAs above for visual consistency */}
        <div className="mt-3 flex items-center gap-4 rounded-lg border border-white/15 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
            <HeadphonesIcon className="h-6 w-6 text-white/85" />
          </span>
          <div className="flex-1">
            <p className="font-serif text-sm text-gsGreen">
              You&apos;re in the running to win AirPods!
            </p>
            <p className="mt-0.5 font-serif text-xs text-white/55">
              Winners will be notified after the event.
            </p>
          </div>
        </div>

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
    </div>
  );
}

// ───────── decorations + icons ─────────

// Animated background confetti — slowly drifts down across the
// whole screen forever. Pieces sit BEHIND the Play Again content
// (pointer-events disabled) and loop indefinitely so the page feels
// celebratory the entire time the player is on it.
function BackgroundConfetti() {
  const pieces = useMemo(() => buildConfettiPieces(28), []);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-0 overflow-hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: p.left,
            top: 0,
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: 1,
            opacity: p.opacity,
            animation: `confettiDrift ${p.duration}s linear ${p.delay}s infinite`,
            ["--rot-start" as never]: `${p.rotStart}deg`,
            ["--sway" as never]: `${p.sway}px`,
          }}
        />
      ))}
    </div>
  );
}

interface ConfettiPiece {
  left: string;
  w: number;
  h: number;
  color: string;
  rotStart: number;
  sway: number;
  duration: number;
  delay: number;
  opacity: number;
}

function buildConfettiPieces(count: number): ConfettiPiece[] {
  const colors = ["#85c441", "#5ea832", "#b6ff5a", "#f5d50c", "#ff6b9d"];
  // Deterministic so SSR + hydration agree on positions.
  let s = 1337;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, () => ({
    left: `${rand() * 100}%`,
    w: 5 + Math.floor(rand() * 6),
    h: 9 + Math.floor(rand() * 8),
    color: colors[Math.floor(rand() * colors.length)],
    rotStart: Math.floor(rand() * 360),
    sway: Math.floor((rand() - 0.5) * 200),
    duration: 12 + rand() * 10,
    delay: -rand() * 15,
    opacity: 0.35 + rand() * 0.4,
  }));
}

function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l2.4 6.9 7.1.2-5.6 4.3 2 6.8L12 16l-5.9 4.2 2-6.8-5.6-4.3 7.1-.2z" />
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

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l8 3v7c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V5l8-3z" />
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

function HeadphonesIcon({ className = "" }: { className?: string }) {
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
      {/* Headband arc */}
      <path d="M4 14v-2a8 8 0 0116 0v2" />
      {/* Left earcup */}
      <rect x="3" y="14" width="4" height="6" rx="1.5" fill="currentColor" />
      {/* Right earcup */}
      <rect x="17" y="14" width="4" height="6" rx="1.5" fill="currentColor" />
    </svg>
  );
}
