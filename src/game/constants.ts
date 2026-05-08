export const W = 800;
export const H = 400;

export const GROUND_Y = H - 60;
export const GRAVITY = 0.65;
export const JUMP_FORCE = -13;
export const DUCK_H = 32;

export const BASE_SPEED = 4.5;
export const MAX_SPEED = 12;
export const SPEED_RAMP_PER_DISTANCE = 0.0003;

export const SPAWN_TIMER_AT_BASE = 280;
export const SPAWN_TIMER_AT_MAX = 120;
export const SPAWN_MIN_GAP_PX = 100;

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

// Linear interp from base spawn timer at BASE_SPEED to faster spawn at MAX_SPEED.
export function spawnIntervalFor(speed: number): number {
  const t = Math.max(
    0,
    Math.min(1, (speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)),
  );
  return SPAWN_TIMER_AT_BASE - t * (SPAWN_TIMER_AT_BASE - SPAWN_TIMER_AT_MAX);
}
