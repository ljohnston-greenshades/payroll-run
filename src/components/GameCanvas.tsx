"use client";

import { useEffect, useRef, useState } from "react";
import { Game, type GameOverInfo } from "@/game/engine";
import { GameOverOverlay, type ScoreResult } from "./GameOverOverlay";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas, {
      onPlayStart: () => {
        setGameOverInfo(null);
        setScoreResult(null);
        setSubmitting(false);
        fetch("/api/game-start", { method: "POST" }).catch(() => {
          // Anti-cheat ping is best-effort. If it fails, the score
          // submission will skip the wall-clock check.
        });
      },
      onGameOver: async (info) => {
        setGameOverInfo(info);
        setSubmitting(true);
        try {
          const res = await fetch("/api/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(info),
          });
          if (!res.ok) {
            setScoreResult({ error: true });
            return;
          }
          const data = (await res.json()) as ScoreResult;
          setScoreResult(data);
        } catch {
          setScoreResult({ error: true });
        } finally {
          setSubmitting(false);
        }
      },
    });
    gameRef.current = game;
    game.start();
    return () => {
      game.stop();
      gameRef.current = null;
    };
  }, []);

  const handleRetry = () => {
    gameRef.current?.restart();
  };

  return (
    <div className="relative mx-auto aspect-[2/1] w-full max-w-[800px]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full rounded-lg shadow-2xl outline-none"
        style={{ imageRendering: "pixelated" }}
        tabIndex={0}
        aria-label="Payroll Run game canvas"
      />
      {gameOverInfo ? (
        <GameOverOverlay
          result={scoreResult}
          submitting={submitting}
          onRetry={handleRetry}
        />
      ) : null}
    </div>
  );
}
