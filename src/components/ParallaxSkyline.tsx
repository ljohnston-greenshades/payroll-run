"use client";

import { useMemo } from "react";

// Pixel-art skyline strip that drifts slowly across the bottom of the
// attract screen. Two layers, drifting at different speeds, anchored
// to the bottom edge so they don't compete with the leaderboard /
// Scan card above them. Low opacity keeps it as background texture
// rather than a focal element.

interface Building {
  x: number;
  w: number;
  h: number;
  color: string;
  windowCols: number;
  windowRows: number;
}

const FAR_PALETTE = ["#0c3a5a", "#0e4268"];
const NEAR_PALETTE = ["#0a3251", "#0d3d61"];

function randomSeeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateBuildings(
  seed: number,
  palette: string[],
  count: number,
  spread: number,
  minHeight: number,
  maxHeight: number,
): Building[] {
  const rand = randomSeeded(seed);
  const buildings: Building[] = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const w = 60 + Math.floor(rand() * 100);
    const h = minHeight + Math.floor(rand() * (maxHeight - minHeight));
    buildings.push({
      x,
      w,
      h,
      color: palette[i % palette.length],
      windowCols: Math.max(2, Math.floor(w / 24)),
      windowRows: Math.max(2, Math.floor(h / 30)),
    });
    x += w + 4 + Math.floor(rand() * 16);
    if (x > spread) break;
  }
  return buildings;
}

function BuildingLayer({
  buildings,
  width,
  height,
  durationSec,
  opacity,
  bottomOffset,
}: {
  buildings: Building[];
  width: number;
  height: number;
  durationSec: number;
  opacity: number;
  bottomOffset: number;
}) {
  return (
    <div
      className="absolute left-0"
      style={{
        bottom: `${bottomOffset}px`,
        width: `${width * 2}px`,
        height: `${height}px`,
        opacity,
        animation: `skylineDrift ${durationSec}s linear infinite`,
        willChange: "transform",
      }}
    >
      {/* Two passes side by side so the loop is seamless. */}
      {[0, width].map((offsetX) => (
        <div
          key={offsetX}
          className="absolute bottom-0"
          style={{ left: `${offsetX}px`, width: `${width}px`, height: `${height}px` }}
        >
          {buildings.map((b, idx) => (
            <div
              key={idx}
              className="absolute bottom-0"
              style={{
                left: `${b.x}px`,
                width: `${b.w}px`,
                height: `${b.h}px`,
                background: b.color,
              }}
            >
              {/* Windows */}
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${b.windowCols}, 1fr)`,
                  gridTemplateRows: `repeat(${b.windowRows}, 1fr)`,
                  padding: "8px 6px",
                  gap: "4px",
                }}
              >
                {Array.from({ length: b.windowCols * b.windowRows }).map(
                  (_, wi) => (
                    <div
                      key={wi}
                      style={{
                        background:
                          (wi * 7 + b.x) % 3 === 0
                            ? "rgba(245, 213, 12, 0.55)"
                            : "transparent",
                      }}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ParallaxSkyline() {
  const farBuildings = useMemo(
    () => generateBuildings(13, FAR_PALETTE, 24, 1800, 80, 160),
    [],
  );
  const nearBuildings = useMemo(
    () => generateBuildings(29, NEAR_PALETTE, 18, 1600, 120, 220),
    [],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 overflow-hidden"
      style={{ height: "260px" }}
    >
      {/* Soft warm horizon tint at the very bottom to suggest sunset
          and keep the skyline from looking like a flat bar. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "180px",
          background:
            "linear-gradient(to top, rgba(237, 124, 46, 0.10), transparent)",
        }}
      />
      <BuildingLayer
        buildings={farBuildings}
        width={1800}
        height={160}
        durationSec={180}
        opacity={0.32}
        bottomOffset={20}
      />
      <BuildingLayer
        buildings={nearBuildings}
        width={1600}
        height={220}
        durationSec={110}
        opacity={0.42}
        bottomOffset={0}
      />
      <style jsx>{`
        @keyframes skylineDrift {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
