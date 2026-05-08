export type GameState = "title" | "playing" | "gameover";

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  grounded: boolean;
  ducking: boolean;
  legFrame: number;
  sunglassesGlint: number;
  invincible: number;
  trailTimer: number;
}

export type ObstacleType = "tax" | "deadline" | "garnishment";

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: ObstacleType;
  nearMissed: boolean;
  passed: boolean;
}

export type CollectibleType = "paycheck" | "w2" | "shield";

export interface Collectible {
  x: number;
  y: number;
  w: number;
  h: number;
  type: CollectibleType;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

export interface PalmTree {
  x: number;
  size: number;
  layer: 0 | 1;
}

export interface BgBuilding {
  x: number;
  w: number;
  h: number;
  color: string;
  windows: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameOverInfo {
  score: number;
  durationSeconds: number;
  rankTitle: string;
}
