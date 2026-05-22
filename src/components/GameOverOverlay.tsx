"use client";

import Link from "next/link";

export interface ScoreResult {
  position?: number;
  total?: number;
  personalBest?: number;
  isNewPersonalBest?: boolean;
  isNewBoothRecord?: boolean;
  error?: true;
}

interface Props {
  result: ScoreResult | null;
  // The score from the just-completed run. Displayed alongside the
  // server-confirmed personal best so the player sees both numbers
  // without ambiguity.
  runScore: number;
  submitting: boolean;
  onRetry: () => void;
  // Booth mode hides the buttons — retry and leaderboard are handled
  // automatically there (game returns to attract; the player's phone
  // auto-redirects to Play Again).
  hideControls?: boolean;
}

export function GameOverOverlay({
  result,
  runScore,
  submitting,
  onRetry,
  hideControls,
}: Props) {
  const hasResult =
    !!result?.position && typeof result.personalBest === "number";
  const beatOthers =
    !!result?.isNewBoothRecord ||
    (hasResult && result?.isNewPersonalBest && result.position === 1);

  return (
    <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-1 font-pixel text-[0.6rem] uppercase tracking-wider text-white/80">
        {submitting ? (
          <span>Saving score…</span>
        ) : result?.error ? (
          <span className="text-red-300">Couldn&apos;t save — try again</span>
        ) : hasResult ? (
          <>
            <span>
              <span className="text-white/55">This run </span>
              <span className="text-gsGreen">
                ${runScore.toLocaleString()}
              </span>
              {result?.isNewPersonalBest ? (
                <span className="ml-2 text-yellow-300">New best!</span>
              ) : null}
              {beatOthers && result?.isNewPersonalBest ? (
                <span className="ml-2 text-yellow-300">New record!</span>
              ) : null}
            </span>
            <span>
              <span className="text-white/55">Personal best </span>
              <span className="text-gsGreen">
                ${result!.personalBest!.toLocaleString()}
              </span>
              <span className="text-white/55"> · </span>
              <span className="text-gsGreen">
                #{result!.position!.toLocaleString()} of{" "}
                {result!.total?.toLocaleString()}
              </span>
            </span>
          </>
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
