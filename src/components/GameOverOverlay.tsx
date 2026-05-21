"use client";

import Link from "next/link";

export interface ScoreResult {
  position?: number;
  total?: number;
  personalBest?: number;
  isNewPersonalBest?: boolean;
  error?: true;
}

interface Props {
  result: ScoreResult | null;
  submitting: boolean;
  onRetry: () => void;
  // Booth mode hides the buttons — retry and leaderboard are handled
  // automatically there (game returns to attract; the player's phone
  // auto-redirects to Play Again).
  hideControls?: boolean;
}

export function GameOverOverlay({ result, submitting, onRetry, hideControls }: Props) {
  return (
    <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-4">
      <div className="font-pixel text-[0.55rem] uppercase tracking-wider text-white/80">
        {submitting ? (
          <span>Saving score…</span>
        ) : result?.error ? (
          <span className="text-red-300">Couldn&apos;t save — try again</span>
        ) : result?.position && result.personalBest ? (
          <span>
            {result.isNewPersonalBest ? "New best · " : "Best "}
            ${result.personalBest.toLocaleString()} · #
            {result.position.toLocaleString()} of{" "}
            {result.total?.toLocaleString()}
          </span>
        ) : null}
      </div>
      {hideControls ? null : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="whitespace-nowrap rounded-md bg-gsGreen px-5 py-2 font-pixel text-[0.55rem] uppercase tracking-wider text-gsNavy transition hover:brightness-110"
          >
            Try Again
          </button>
          <Link
            href="/leaderboard"
            className="whitespace-nowrap rounded-md border border-gsGreen px-5 py-2 font-pixel text-[0.55rem] uppercase tracking-wider text-gsGreen transition hover:bg-gsGreen/10"
          >
            Leaderboard
          </Link>
        </div>
      )}
    </div>
  );
}
