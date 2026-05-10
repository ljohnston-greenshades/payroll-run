"use client";

import { useEffect, useMemo } from "react";

interface Props {
  score: number;
  level: string;
  onDismiss: () => void;
}

const CONFETTI_COLORS = ["#85c441", "#f5d50c", "#ff6b9d", "#0d9389", "#ed7c2e"];

// Full-screen celebration that fires when a player takes the #1 spot
// on the leaderboard. Particles + big "NEW BOOTH RECORD" overlay,
// auto-dismisses so the normal game-over UI takes over after the
// player has had their moment.
export function NewRecordCelebration({ score, level, onDismiss }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(t);
  }, [onDismiss]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 2.5 + Math.random() * 2.5,
        color:
          CONFETTI_COLORS[
            Math.floor(Math.random() * CONFETTI_COLORS.length)
          ],
        rotateStart: Math.random() * 360,
        rotateEnd: Math.random() * 720 + 360,
        sway: Math.random() * 80 - 40,
        size: 6 + Math.random() * 8,
      })),
    [],
  );

  return (
    <div
      role="dialog"
      aria-label="New booth record"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
      onClick={onDismiss}
    >
      {/* Pulsing green wash */}
      <div className="absolute inset-0 animate-pulse bg-gsGreen/15" />

      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-[-5%] block rounded-sm"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 1.5}px`,
              background: p.color,
              animation: `confettiFall ${p.duration}s linear ${p.delay}s forwards`,
              ["--sway" as never]: `${p.sway}px`,
              ["--rot-start" as never]: `${p.rotateStart}deg`,
              ["--rot-end" as never]: `${p.rotateEnd}deg`,
            }}
          />
        ))}
      </div>

      {/* Centered text */}
      <div className="relative px-6 text-center">
        <div className="text-6xl drop-shadow-lg sm:text-7xl md:text-8xl 2xl:text-9xl">
          🏆
        </div>
        <h1
          className="mt-4 font-pixel text-4xl text-gsGreen drop-shadow-[0_4px_18px_rgba(133,196,65,0.7)] sm:text-5xl md:text-6xl 2xl:text-7xl"
          style={{ textShadow: "0 0 24px rgba(133,196,65,0.8)" }}
        >
          NEW
          <br />
          BOOTH RECORD!
        </h1>
        <p className="mt-6 font-pixel text-base text-yellow-300 sm:text-lg md:text-xl 2xl:text-2xl">
          ${score.toLocaleString()} · {level}
        </p>
        <p className="mt-8 font-pixel text-[0.55rem] uppercase tracking-[0.3em] text-white/60 sm:text-xs">
          Tap to continue
        </p>
      </div>
    </div>
  );
}
