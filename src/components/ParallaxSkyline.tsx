"use client";

import { useMemo } from "react";

// Pixel-art skyline strip that drifts slowly across the bottom of the
// attract screen. Two layers (far + near) drift at different speeds,
// anchored to the bottom edge so they don't compete with the
// foreground content. Buildings interleave with the occasional palm
// tree, and a subtle warm-to-cool gradient suggests sunset behind it
// all.

type SkylineElement =
  | {
      kind: "building";
      x: number;
      w: number;
      h: number;
      color: string;
      windowCols: number;
      windowRows: number;
    }
  | {
      kind: "palm";
      x: number;
      h: number;
    };

const FAR_PALETTE = ["#0c3a5a", "#0e4268"];
const NEAR_PALETTE = ["#0a3251", "#0d3d61"];

function randomSeeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateSkyline({
  seed,
  palette,
  spread,
  minHeight,
  maxHeight,
  palmChance,
}: {
  seed: number;
  palette: string[];
  spread: number;
  minHeight: number;
  maxHeight: number;
  palmChance: number;
}): SkylineElement[] {
  const rand = randomSeeded(seed);
  const out: SkylineElement[] = [];
  let x = 0;
  while (x < spread) {
    if (rand() < palmChance) {
      const h = 90 + Math.floor(rand() * 50);
      out.push({ kind: "palm", x, h });
      // Palms get a wide gap after them — they're meant to read as
      // standalone silhouettes, not a row of poles.
      x += 60 + 180 + Math.floor(rand() * 160);
    } else {
      const w = 60 + Math.floor(rand() * 100);
      const h = minHeight + Math.floor(rand() * (maxHeight - minHeight));
      out.push({
        kind: "building",
        x,
        w,
        h,
        color: palette[Math.floor(rand() * palette.length)],
        windowCols: Math.max(2, Math.floor(w / 24)),
        windowRows: Math.max(2, Math.floor(h / 30)),
      });
      // Sparse spacing — 200–450px between elements keeps the skyline
      // breathing instead of reading as a solid wall.
      x += w + 200 + Math.floor(rand() * 250);
    }
  }
  return out;
}

function PalmSilhouette({ height }: { height: number }) {
  // Simple pixel-style palm. Trunk in warm brown, fronds in two
  // greens for a hint of depth. Sized via the `height` prop so it
  // scales with the skyline layer.
  return (
    <svg
      width={height * 0.55}
      height={height}
      viewBox="0 0 44 80"
      style={{ display: "block" }}
      aria-hidden
    >
      {/* Fronds (drawn first so the trunk overlaps cleanly) */}
      <path d="M22,18 Q6,12 0,2 L4,2 Q12,14 24,18 Z" fill="#3a7d32" />
      <path d="M22,18 Q38,12 44,2 L40,2 Q32,14 24,18 Z" fill="#3a7d32" />
      <path d="M22,18 Q14,4 18,-1 L24,-1 Q24,8 24,20 Z" fill="#4a9d3f" />
      <path d="M22,18 Q8,8 2,16 L6,18 Q14,14 24,20 Z" fill="#4a9d3f" />
      <path d="M22,18 Q36,8 42,16 L38,18 Q30,14 24,20 Z" fill="#4a9d3f" />
      {/* Coconuts */}
      <rect x="16" y="17" width="4" height="4" fill="#5c3d0a" />
      <rect x="24" y="15" width="4" height="4" fill="#5c3d0a" />
      {/* Trunk */}
      <rect x="20" y="18" width="6" height="62" fill="#8B6914" />
      <rect x="22" y="18" width="2" height="62" fill="#a07d1c" />
      {/* Trunk segments */}
      <rect x="17" y="30" width="12" height="2" fill="#6d5010" />
      <rect x="17" y="44" width="12" height="2" fill="#6d5010" />
      <rect x="17" y="58" width="12" height="2" fill="#6d5010" />
      <rect x="17" y="72" width="12" height="2" fill="#6d5010" />
    </svg>
  );
}

function SkylineLayer({
  elements,
  width,
  height,
  durationSec,
  opacity,
  bottomOffset,
}: {
  elements: SkylineElement[];
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
      {[0, width].map((offsetX) => (
        <div
          key={offsetX}
          className="absolute bottom-0"
          style={{ left: `${offsetX}px`, width: `${width}px`, height: `${height}px` }}
        >
          {elements.map((el, idx) => {
            if (el.kind === "palm") {
              return (
                <div
                  key={idx}
                  className="absolute bottom-0"
                  style={{ left: `${el.x}px`, height: `${el.h}px` }}
                >
                  <PalmSilhouette height={el.h} />
                </div>
              );
            }
            return (
              <div
                key={idx}
                className="absolute bottom-0"
                style={{
                  left: `${el.x}px`,
                  width: `${el.w}px`,
                  height: `${el.h}px`,
                  background: el.color,
                }}
              >
                <div
                  className="absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: `repeat(${el.windowCols}, 1fr)`,
                    gridTemplateRows: `repeat(${el.windowRows}, 1fr)`,
                    padding: "8px 6px",
                    gap: "4px",
                  }}
                >
                  {Array.from({ length: el.windowCols * el.windowRows }).map(
                    (_, wi) => (
                      <div
                        key={wi}
                        style={{
                          background:
                            (wi * 7 + el.x) % 3 === 0
                              ? "rgba(245, 213, 12, 0.55)"
                              : "transparent",
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ParallaxSkyline() {
  const farElements = useMemo(
    () =>
      generateSkyline({
        seed: 13,
        palette: FAR_PALETTE,
        spread: 2800,
        minHeight: 80,
        maxHeight: 160,
        palmChance: 0.15,
      }),
    [],
  );
  const nearElements = useMemo(
    () =>
      generateSkyline({
        seed: 29,
        palette: NEAR_PALETTE,
        spread: 2600,
        minHeight: 120,
        maxHeight: 220,
        palmChance: 0.3,
      }),
    [],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 overflow-hidden"
      style={{ height: "380px" }}
    >
      {/* Sunset gradient — sits behind everything else in the strip.
          Warm orange at the horizon fades up through a hint of pink
          and a whisper of dusk-purple before going clear. Kept low
          opacity so it's atmosphere, not a focal element. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "380px",
          background:
            "linear-gradient(to top, rgba(237, 124, 46, 0.22) 0%, rgba(255, 138, 110, 0.14) 25%, rgba(255, 107, 157, 0.08) 55%, rgba(130, 90, 180, 0.05) 80%, transparent 100%)",
        }}
      />
      {/* Soft golden glow right at the horizon line to suggest sun. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "80px",
          background:
            "linear-gradient(to top, rgba(245, 213, 12, 0.10), transparent)",
        }}
      />
      <SkylineLayer
        elements={farElements}
        width={2800}
        height={160}
        durationSec={260}
        opacity={0.3}
        bottomOffset={20}
      />
      <SkylineLayer
        elements={nearElements}
        width={2600}
        height={220}
        durationSec={170}
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
