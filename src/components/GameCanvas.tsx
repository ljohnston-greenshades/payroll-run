"use client";

import { useEffect, useRef } from "react";
import { Game, type GameOverInfo } from "@/game/engine";

interface GameCanvasProps {
  onGameOver?: (info: GameOverInfo) => void;
}

export function GameCanvas({ onGameOver }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas, {
      onGameOver: (info) => onGameOverRef.current?.(info),
    });
    game.start();
    return () => game.stop();
  }, []);

  return (
    <div className="mx-auto aspect-[2/1] w-full max-w-[800px]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full rounded-lg shadow-2xl outline-none"
        style={{ imageRendering: "pixelated" }}
        tabIndex={0}
        aria-label="Payroll Run game canvas"
      />
    </div>
  );
}
