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
}

export function GameOverOverlay({ result, submitting, onRetry }: Props) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
      <div className="font-pixel text-[0.55rem] uppercase tracking-wider text-white/80">
        {submitting ? (
          <span>Saving score…</span>
        ) : result?.error ? (
          <span className="text-red-300">Couldn&apos;t save — try again</span>
        ) : result?.position ? (
          <span>
            Rank #{result.position.toLocaleString()} of{" "}
            {result.total?.toLocaleString()}
            {result.isNewPersonalBest ? " · New best!" : ""}
          </span>
        ) : null}
      </div>
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
    </div>
  );
}
