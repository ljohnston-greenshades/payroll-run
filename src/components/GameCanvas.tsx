"use client";

import { useEffect, useRef, useState } from "react";
import { Game, type GameOverInfo } from "@/game/engine";
import { setDimensions } from "@/game/constants";
import { GameOverOverlay, type ScoreResult } from "./GameOverOverlay";
import { NewRecordCelebration } from "./NewRecordCelebration";
import { RulesCard } from "./RulesCard";

interface GameCanvasProps {
  screenName?: string;
}

function readSoundParam(): boolean {
  if (typeof window === "undefined") return true;
  return new URLSearchParams(window.location.search).get("sound") !== "off";
}

function isPortraitViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerHeight > window.innerWidth && window.innerWidth < 900;
}

export function GameCanvas({ screenName }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [showMobileButtons, setShowMobileButtons] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [newRecordInfo, setNewRecordInfo] = useState<GameOverInfo | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPortraitViewport()) {
      setDimensions(450, 800);
      setShowMobileButtons(true);
    } else {
      setDimensions(800, 400);
    }

    const initialSoundOn = readSoundParam();
    setSoundOn(initialSoundOn);

    const game = new Game(canvas, {
      sound: initialSoundOn,
      screenName,
      onPlayStart: () => {
        setGameOverInfo(null);
        setScoreResult(null);
        setSubmitting(false);
        setNewRecordInfo(null);
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
          // Top of the leaderboard with at least one prior player =
          // a true booth record. Fire the celebration.
          if (
            data.position === 1 &&
            typeof data.total === "number" &&
            data.total > 1
          ) {
            setNewRecordInfo(info);
            gameRef.current?.celebrateNewRecord();
          }
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
  }, [screenName]);

  const handleRetry = () => {
    gameRef.current?.restart();
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    gameRef.current?.setSoundEnabled(next);
  };

  const buttonHandlers = {
    duckDown: (e: React.PointerEvent) => {
      e.preventDefault();
      gameRef.current?.setDucking(true);
    },
    duckUp: (e: React.PointerEvent) => {
      e.preventDefault();
      gameRef.current?.setDucking(false);
    },
    jumpDown: (e: React.PointerEvent) => {
      e.preventDefault();
      gameRef.current?.pressJump();
    },
  };

  return (
    <div className="flex w-full flex-col items-center gap-2 md:gap-3">
      <div className="relative mx-auto aspect-[9/16] max-h-[calc(100svh-220px)] w-full max-w-md md:aspect-[2/1] md:max-h-none md:max-w-[1000px] xl:max-w-[1280px] 2xl:max-w-[1500px]">
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
          className="absolute bottom-3 right-3 rounded-md bg-black/40 px-2 py-1 font-pixel text-[0.55rem] text-gsGreen backdrop-blur transition hover:bg-black/60"
        >
          {soundOn ? "♪ ON" : "♪ OFF"}
        </button>
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          aria-label="How to play"
          className="absolute bottom-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 font-pixel text-xs text-gsGreen backdrop-blur transition hover:bg-black/60"
        >
          ?
        </button>
        {gameOverInfo ? (
          <GameOverOverlay
            result={scoreResult}
            submitting={submitting}
            onRetry={handleRetry}
          />
        ) : null}
      </div>

      {showMobileButtons ? (
        <div className="grid w-full max-w-md grid-cols-2 gap-3 px-2 md:hidden">
          <button
            type="button"
            onPointerDown={buttonHandlers.duckDown}
            onPointerUp={buttonHandlers.duckUp}
            onPointerLeave={buttonHandlers.duckUp}
            onPointerCancel={buttonHandlers.duckUp}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Duck"
            className="select-none rounded-lg border-2 border-gsGreen bg-gsNavy/80 py-5 font-pixel text-base uppercase tracking-wider text-gsGreen shadow-lg shadow-gsGreen/15 transition active:translate-y-[2px] active:bg-gsGreen/15"
          >
            ▼ Duck
          </button>
          <button
            type="button"
            onPointerDown={buttonHandlers.jumpDown}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Jump"
            className="select-none rounded-lg bg-gsGreen py-5 font-pixel text-base uppercase tracking-wider text-gsNavy shadow-lg shadow-gsGreen/30 transition active:translate-y-[2px] active:brightness-110"
          >
            ▲ Jump
          </button>
        </div>
      ) : null}

      <RulesCard open={rulesOpen} onClose={() => setRulesOpen(false)} />
      {newRecordInfo ? (
        <NewRecordCelebration
          score={newRecordInfo.score}
          level={newRecordInfo.rankTitle}
          onDismiss={() => setNewRecordInfo(null)}
        />
      ) : null}
    </div>
  );
}
