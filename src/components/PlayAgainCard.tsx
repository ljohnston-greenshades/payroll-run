"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  eventSlug: string;
  screenName: string;
  personalBest?: number;
  personalRank?: number;
  personalTotal?: number;
  // Whether this player has already tapped "Request a Demo" — read
  // from the players row server-side so a refresh shows the right
  // confirmation state.
  initialDemoRequested?: boolean;
}

const BULLETS = [
  "Built for payroll complexity",
  "Compliance-first by design",
  "Integrates with your systems",
];

export function PlayAgainCard({
  eventSlug,
  screenName,
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
      // If clearing fails, reload anyway — the form will show on a
      // fresh navigation.
    }
    router.refresh();
  };

  const hasStats = personalBest > 0 && personalRank > 0 && personalTotal > 0;

  return (
    <div className="w-full max-w-md">
      <div className="text-center">
        <p className="font-pixel text-[0.6rem] uppercase tracking-widest text-white/55">
          Welcome back
        </p>
        <p className="mt-1 font-pixel text-2xl text-gsGreen">{screenName}</p>
      </div>

      {hasStats ? (
        <div className="mt-3 rounded-md border border-gsGreen/30 bg-white/[0.04] px-4 py-2.5 text-center">
          <p className="font-pixel text-xs text-white">
            <span className="text-white/55">Best </span>
            <span className="text-gsGreen">
              ${personalBest.toLocaleString()}
            </span>
            <span className="text-white/30"> · </span>
            <span className="text-gsGreen">
              #{personalRank}
            </span>
            <span className="text-white/55">
              {" "}
              of {personalTotal}
            </span>
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onPlayAgain}
        disabled={playBusy}
        className="mt-4 w-full rounded-md bg-gsGreen px-6 py-3 font-pixel text-sm uppercase tracking-wider text-gsNavy shadow-lg shadow-gsGreen/20 transition hover:brightness-110 hover:shadow-gsGreen/40 active:translate-y-px disabled:opacity-60"
      >
        {playBusy ? "Getting in line…" : "Play Again →"}
      </button>

      {playError ? (
        <p className="mt-2 text-center text-xs text-red-300" role="alert">
          {playError}
        </p>
      ) : null}

      {/* Demo callout — visually distinct card so it reads as a
          related-but-separate offer, not part of the game UI. */}
      <div className="mt-5 rounded-lg border border-gsGreen/40 bg-gsNavy/60 p-4">
        <p className="font-pixel text-xs uppercase tracking-widest text-gsGreen">
          Thanks for playing!
        </p>
        <p className="mt-1.5 font-serif text-base text-white">
          Want a real Compliance Shield for your team?
        </p>
        <ul className="mt-3 space-y-1.5">
          {BULLETS.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 font-serif text-sm text-white/80"
            >
              <span aria-hidden className="mt-0.5 text-gsGreen">
                ✓
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {demoRequested ? (
          <div
            className="mt-3 rounded-md border border-gsGreen/50 bg-gsGreen/10 px-3 py-2 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="font-pixel text-[0.6rem] uppercase tracking-widest text-gsGreen">
              You&apos;re on the list
            </p>
            <p className="mt-0.5 font-serif text-xs text-white/85">
              We&apos;ll reach out within 24 hours.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRequestDemo}
            disabled={demoBusy}
            className="mt-3 w-full rounded-md border border-gsGreen px-4 py-2.5 font-pixel text-xs uppercase tracking-wider text-gsGreen transition hover:bg-gsGreen/10 active:translate-y-px disabled:opacity-60"
          >
            {demoBusy ? "Sending…" : "Request a Demo →"}
          </button>
        )}

        {demoError ? (
          <p className="mt-2 text-center text-xs text-red-300" role="alert">
            {demoError}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onSwitchPlayer}
        className="mt-3 w-full text-center text-xs text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
      >
        Not you? Start over.
      </button>
    </div>
  );
}
