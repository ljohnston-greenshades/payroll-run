"use client";

import { useEffect, useRef } from "react";

interface Options {
  onB0?: () => void;
  onB1?: () => void;
  onBothHeld?: () => void;
  bothHeldMs?: number;
  enabled?: boolean;
}

// Polls the first connected gamepad each animation frame and fires:
//   - onB0 / onB1 on button-down edges (B0 = Xbox A / arcade primary)
//   - onBothHeld once after B0 and B1 are held together for ms (skip)
// Use from screens where the game engine is not running (attract,
// ready, game-over) so the booth station still responds to the
// controller without keyboard input.
export function useGamepadButtons({
  onB0,
  onB1,
  onBothHeld,
  bothHeldMs = 1500,
  enabled = true,
}: Options): void {
  const cbs = useRef({ onB0, onB1, onBothHeld });
  cbs.current = { onB0, onB1, onBothHeld };

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;

    let raf = 0;
    let prevB0 = false;
    let prevB1 = false;
    let holdStart = 0;
    let holdFired = false;

    const poll = () => {
      const pads = navigator.getGamepads();
      let pad: Gamepad | null = null;
      for (const p of pads) {
        if (p && p.connected) {
          pad = p;
          break;
        }
      }
      if (pad) {
        const b0 = pad.buttons[0]?.pressed ?? false;
        const b1 = pad.buttons[1]?.pressed ?? false;
        if (b0 && !prevB0) cbs.current.onB0?.();
        if (b1 && !prevB1) cbs.current.onB1?.();
        if (b0 && b1) {
          if (!holdStart) holdStart = performance.now();
          else if (!holdFired && performance.now() - holdStart > bothHeldMs) {
            cbs.current.onBothHeld?.();
            holdFired = true;
          }
        } else {
          holdStart = 0;
          holdFired = false;
        }
        prevB0 = b0;
        prevB1 = b1;
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [enabled, bothHeldMs]);
}
