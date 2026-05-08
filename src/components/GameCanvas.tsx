"use client";

import { useEffect, useRef, useState } from "react";
import { Game, type GameOverInfo } from "@/game/engine";
import { GameOverOverlay, type ScoreResult } from "./GameOverOverlay";

function readSoundParam(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("sound") === "on";
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initialSoundOn = readSoundParam();
    setSoundOn(initialSoundOn);

    const game = new Game(canvas, {
      sound: initialSoundOn,
      onPlayStart: () => {
        setGameOverInfo(null);
        setScoreResult(null);
        setSubmitting(false);
        fetch("/api/game-start", { method: "POST" }).catch(() => {});
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

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    gameRef.current?.setSoundEnabled(next);
  };

  return (
    <div className="relative mx-auto aspect-[2/1] w-full max-w-[800px]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full rounded-lg shadow-2xl outline-none touch-none"
        style={{ imageRendering: "pixelated" }}
        tabIndex={0}
        aria-label="Payroll Run game canvas"
      />
      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundOn ? "Mute sound" : "Unmute sound"}
        className="absolute left-3 top-3 rounded-md bg-black/40 px-2 py-1 font-pixel text-[0.55rem] text-gsGreen backdrop-blur transition hover:bg-black/60"
      >
        {soundOn ? "♪ ON" : "♪ OFF"}
      </button>
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
