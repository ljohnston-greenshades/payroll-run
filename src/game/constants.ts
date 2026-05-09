// W, H, GROUND_Y are mutable via setDimensions so the canvas can swap
// between landscape (800x400, default) and mobile portrait (450x800)
// at runtime. ESM live bindings ensure consumers see the updated
// values; the GameCanvas component calls setDimensions before
// constructing the Game.
export let W = 800;
export let H = 400;
export let GROUND_Y = H - 60;

export function setDimensions(width: number, height: number): void {
  W = width;
  H = height;
  GROUND_Y = height - 60;
  // Desktop has a wider visual field, so identical pixels/frame reads
  // as faster. Start the desktop layout slower; mobile keeps the
  // current pace. Ramp rate is re-derived so peak speed is reached at
  // the same total distance regardless of base.
  BASE_SPEED = width > 600 ? BASE_SPEED_DESKTOP : BASE_SPEED_MOBILE;
  SPEED_RAMP_PER_DISTANCE =
    (MAX_SPEED - BASE_SPEED) / SPEED_RAMP_DISTANCE;
}
export const GRAVITY = 0.55;
export const JUMP_FORCE = -14;
export const DUCK_H = 32;

export const BASE_SPEED_MOBILE = 4.5;
export const BASE_SPEED_DESKTOP = 2.5;
export let BASE_SPEED = BASE_SPEED_MOBILE;
export const MAX_SPEED = 10;
// Distance over which speed ramps from BASE → MAX. Held constant so
// the time-to-max feels similar on both layouts; the rate is
// re-derived in setDimensions when BASE_SPEED changes.
export const SPEED_RAMP_DISTANCE = 30000;
export let SPEED_RAMP_PER_DISTANCE =
  (MAX_SPEED - BASE_SPEED) / SPEED_RAMP_DISTANCE;

// Spawn pacing is driven by distance traveled (not speed) so the
// difficulty curve is independent of how fast the world is moving.
// Holds easy spacing for SPAWN_RAMP_START distance, then linearly
// ramps tighter through SPAWN_RAMP_END. Density only roughly halves
// from start to peak (slight tightening, not extreme).
export const SPAWN_TIMER_AT_BASE = 600;
export const SPAWN_TIMER_AT_MAX = 300;
export const SPAWN_RAMP_START = 4000;
export const SPAWN_RAMP_END = 30000;
export const SPAWN_MIN_GAP_PX = 120;

export const COMBO_WINDOW_FRAMES = 90;
export const NEAR_MISS_PX = 8;
export const NEAR_MISS_BONUS = 50;

export const INVINCIBILITY_FRAMES = 300;

export const TARGET_FPS = 60;

export const Colors = {
  navy: "#062a47",
  green: "#85c441",
  greenDark: "#0a8944",
  deepGreen: "#214622",
  orange: "#ed7c2e",
  yellow: "#f5d50c",
  teal: "#0d9389",
  warmGray: "#ede6dd",
  sage: "#cbe3aa",
  white: "#ffffff",
  charcoal: "#2f2f2f",
  pink: "#ff6b9d",
  hotPink: "#ff3d7f",
  coral: "#ff7f7f",
  sand: "#f0d9a0",
  sandDark: "#c9a96e",
  red: "#ff4444",
} as const;

export interface RankTier {
  threshold: number;
  title: string;
}

export const RANK_TIERS: readonly RankTier[] = [
  { threshold: 0, title: "Payroll Intern" },
  { threshold: 500, title: "Junior Accountant" },
  { threshold: 1500, title: "Payroll Specialist" },
  { threshold: 3000, title: "HR Manager" },
  { threshold: 6000, title: "VP of People Ops" },
  { threshold: 10000, title: "Chief Payroll Officer" },
];

export function rankFor(score: number): string {
  let title = RANK_TIERS[0].title;
  for (const tier of RANK_TIERS) {
    if (score >= tier.threshold) title = tier.title;
  }
  return title;
}

export function rankIndexFor(score: number): number {
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (score >= RANK_TIERS[i].threshold) idx = i;
  }
  return idx;
}

// Distance-based spawn interval. Easy intro for SPAWN_RAMP_START
// distance, then linearly tightens. Independent of speed so the
// difficulty curve is predictable rather than coupled to the
// speed multiplier.
export function spawnIntervalFor(distance: number): number {
  if (distance < SPAWN_RAMP_START) return SPAWN_TIMER_AT_BASE;
  const t = Math.max(
    0,
    Math.min(
      1,
      (distance - SPAWN_RAMP_START) / (SPAWN_RAMP_END - SPAWN_RAMP_START),
    ),
  );
  return SPAWN_TIMER_AT_BASE - t * (SPAWN_TIMER_AT_BASE - SPAWN_TIMER_AT_MAX);
}
