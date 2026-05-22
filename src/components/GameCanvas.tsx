"use client";

import { useEffect, useRef, useState } from "react";
import { Game, type GameOverInfo } from "@/game/engine";
import { setDimensions } from "@/game/constants";
import { GameOverOverlay, type ScoreResult } from "./GameOverOverlay";
import { NewRecordCelebration } from "./NewRecordCelebration";
import { RulesCard } from "./RulesCard";

interface GameCanvasProps {
  screenName?: string;
  // event = self-serve (current behavior, default)
  // booth = TV/queue flow: auto-start, notify parent on game over
  // casual = no score submission (404 page / embeds)
  mode?: "event" | "booth" | "casual";
  autoStart?: boolean;
  onGameOver?: () => void;
}

function readSoundParam(): boolean {
  if (typeof window === "undefined") return true;
  return new URLSearchParams(window.location.search).get("sound") !== "off";
}

function isPortraitViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerHeight > window.innerWidth && window.innerWidth < 900;
}

export function GameCanvas({
  screenName,
  mode = "event",
  autoStart = false,
  onGameOver: onGameOverProp,
}: GameCanvasProps) {
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
      hideSessionBest: mode === "booth",
      onPlayStart: () => {
        setGameOverInfo(null);
        setScoreResult(null);
        setSubmitting(false);
        setNewRecordInfo(null);
        if (mode !== "casual") {
          fetch("/api/game-start", { method: "POST" }).catch(() => {});
        }
      },
      onGameOver: async (info) => {
        setGameOverInfo(info);
        if (mode === "casual") {
          // No backend submission for embedded / 404 mode.
          onGameOverProp?.();
          return;
        }
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
          // Celebrate only when the server confirms this run produced
          // a new #1 — i.e., the just-played score beat every other
          // player's best at this event.
          if (data.isNewBoothRecord) {
            setNewRecordInfo(info);
            gameRef.current?.celebrateNewRecord();
          }
        } catch {
          setScoreResult({ error: true });
        } finally {
          setSubmitting(false);
          onGameOverProp?.();
        }
      },
    });
    gameRef.current = game;
    game.start();
    if (autoStart) {
      // Skip the title screen — go straight into a playthrough. Used
      // by the booth flow where the player has already been promoted
      // and the TV said "press JUMP."
      game.restart();
    }
    return () => {
      game.stop();
      gameRef.current = null;
    };
  }, [screenName, mode, autoStart, onGameOverProp]);

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
      <div className="relative mx-auto aspect-[9/16] max-h-[calc(100svh-140px)] w-full max-w-md md:aspect-[2/1] md:max-h-[calc(100dvh-220px)] md:max-w-[1000px] xl:max-w-[1280px] 2xl:max-w-[1500px]">
        <canvas
          ref={canvasRef}
          className="block h-full w-full rounded-lg shadow-2xl outline-none touch-none"
          style={{ imageRendering: "pixelated" }}
          tabIndex={0}
          aria-label="Payroll Runner game canvas"
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
            runScore={gameOverInfo.score}
            submitting={submitting}
            onRetry={handleRetry}
            hideControls={mode === "booth"}
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
