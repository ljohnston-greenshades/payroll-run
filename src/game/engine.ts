import {
  BASE_SPEED,
  COMBO_WINDOW_FRAMES,
  Colors,
  DUCK_H,
  GRAVITY,
  GROUND_Y,
  H,
  INVINCIBILITY_FRAMES,
  JUMP_FORCE,
  MAX_SPEED,
  NEAR_MISS_BONUS,
  NEAR_MISS_PX,
  RANK_TIERS,
  SPAWN_MIN_GAP_PX,
  SPEED_RAMP_PER_DISTANCE,
  W,
  rankFor,
  rankIndexFor,
  spawnIntervalFor,
} from "./constants";
import { InputHandler } from "./input";
import {
  spawnFloatingText,
  spawnParticles,
  updateFloatingTexts,
  updateParticles,
} from "./particles";
import {
  drawBuildings,
  drawClouds,
  drawGameOverOverlay,
  drawGround,
  drawHud,
  drawPalmsLayer,
  drawSky,
  drawSun,
  drawTitleOverlay,
} from "./renderer";
import { SoundEngine } from "./sound";
import {
  drawCollectible,
  drawFlamingo,
  drawObstacle,
  drawPixelText,
  drawRect,
} from "./sprites";
import type {
  BgBuilding,
  Box,
  Cloud,
  Collectible,
  CollectibleType,
  FloatingText,
  GameOverInfo,
  GameState,
  Obstacle,
  ObstacleType,
  PalmTree,
  Particle,
  Player,
} from "./types";

export interface GameOptions {
  onGameOver?: (info: GameOverInfo) => void;
  // Fires whenever a fresh playthrough begins — both from title screen
  // and after a retry. Used to ping /api/game-start so server-side
  // anti-cheat can compare wall-clock elapsed against reported duration.
  onPlayStart?: () => void;
  // If true, procedural sound effects are generated via Web Audio.
  // Default off — booth tablet should opt in via ?sound=on.
  sound?: boolean;
}

const OBSTACLE_TYPES: ObstacleType[] = ["tax", "deadline", "compliance"];
const OBSTACLE_WEIGHTS = [0.4, 0.35, 0.25];
const COLLECTIBLE_BAG: CollectibleType[] = [
  "paycheck",
  "paycheck",
  "paycheck",
  "bonus",
  "w2",
];

export class Game {
  private ctx: CanvasRenderingContext2D;
  private input: InputHandler;
  private sound: SoundEngine;
  private rafId: number | null = null;
  private running = false;

  private state: GameState = "title";
  private score = 0;
  private hiScore = 0;
  private distance = 0;
  private speed = BASE_SPEED;
  private frame = 0;
  private shakeTimer = 0;
  private combo = 0;
  private comboTimer = 0;
  private highestRankIndex = 0;
  private startedAt = 0;

  private player: Player = {
    x: 120,
    y: GROUND_Y,
    w: 40,
    h: 56,
    vy: 0,
    grounded: true,
    ducking: false,
    legFrame: 0,
    sunglassesGlint: 0,
    invincible: 0,
    trailTimer: 0,
  };

  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private clouds: Cloud[] = [];
  private palmTrees: PalmTree[] = [];
  private bgBuildings: BgBuilding[] = [];
  private spawnTimer = 0;
  private collectibleTimer = 0;
  private lastObstacleX = -Infinity;

  constructor(canvas: HTMLCanvasElement, private options: GameOptions = {}) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.input = new InputHandler(canvas);
    this.sound = new SoundEngine(options.sound ?? false);
    this.initBackground();
  }

  setSoundEnabled(enabled: boolean): void {
    this.sound.setEnabled(enabled);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.tick();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.input.detach();
  }

  // Public restart trigger for DOM "Try Again" buttons. No-op while a
  // game is already in progress so a misclick doesn't reset a live run.
  restart(): void {
    if (this.state === "playing") return;
    this.beginPlaythrough();
  }

  private beginPlaythrough(): void {
    this.state = "playing";
    this.resetRun();
    this.options.onPlayStart?.();
  }

  private initBackground(): void {
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * W * 1.5,
        y: 30 + Math.random() * 60,
        w: 40 + Math.random() * 60,
        speed: 0.2 + Math.random() * 0.3,
      });
    }
    this.palmTrees = [];
    for (let i = 0; i < 4; i++) {
      this.palmTrees.push({
        x: 200 + i * 220 + Math.random() * 80,
        size: 1.5 + Math.random() * 0.5,
        layer: Math.random() > 0.5 ? 0 : 1,
      });
    }
    this.bgBuildings = [];
    for (let i = 0; i < 8; i++) {
      this.bgBuildings.push({
        x: i * 120 + Math.random() * 40,
        w: 30 + Math.random() * 40,
        h: 40 + Math.random() * 60,
        color: i % 2 === 0 ? "#0c3a5a" : "#0e4268",
        windows: Math.floor(Math.random() * 3) + 2,
      });
    }
  }

  private resetRun(): void {
    this.score = 0;
    this.distance = 0;
    this.speed = BASE_SPEED;
    this.combo = 0;
    this.comboTimer = 0;
    this.frame = 0;
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.lastObstacleX = -Infinity;
    this.highestRankIndex = 0;
    this.startedAt = performance.now();
    this.player.y = GROUND_Y;
    this.player.vy = 0;
    this.player.grounded = true;
    this.player.ducking = false;
    this.player.invincible = 0;
    this.player.legFrame = 0;
    this.initBackground();
  }

  private tick(): void {
    this.update();
    this.draw();
  }

  private update(): void {
    this.frame++;

    if (this.state === "title") {
      this.player.legFrame += this.speed;
      this.player.sunglassesGlint =
        Math.sin(this.frame * 0.02) > 0.8 ? 1 : 0;
      for (const c of this.clouds) {
        c.x -= c.speed;
        if (c.x < -80) c.x = W + 40;
      }
      if (this.input.consumeJump()) {
        this.beginPlaythrough();
      }
      return;
    }

    if (this.state === "gameover") {
      if (this.input.consumeJump()) {
        this.beginPlaythrough();
      }
      this.particles = updateParticles(this.particles);
      this.floatingTexts = updateFloatingTexts(this.floatingTexts);
      return;
    }

    // ── playing ──
    this.distance += this.speed;
    this.speed = Math.min(
      MAX_SPEED,
      BASE_SPEED + this.distance * SPEED_RAMP_PER_DISTANCE,
    );

    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    if (this.input.consumeJump() && this.player.grounded) {
      this.player.vy = JUMP_FORCE;
      this.player.grounded = false;
      this.sound.jump();
    }

    this.player.ducking = this.input.state.duckPressed && this.player.grounded;

    if (!this.player.grounded) {
      this.player.vy += GRAVITY;
      if (this.input.state.duckPressed) this.player.vy += 0.5;
      this.player.y += this.player.vy;
      if (this.player.y >= GROUND_Y) {
        this.player.y = GROUND_Y;
        this.player.vy = 0;
        this.player.grounded = true;
      }
    }

    this.player.legFrame += this.speed;
    this.player.sunglassesGlint =
      Math.sin(this.frame * 0.02) > 0.85 ? 1 : 0;
    if (this.player.invincible > 0) this.player.invincible--;

    this.player.trailTimer++;
    if (this.player.trailTimer % 4 === 0 && this.speed > 6) {
      this.particles.push({
        x: this.player.x - 5,
        y: this.player.y + (this.player.ducking ? -5 : 5),
        vx: -1 - Math.random(),
        vy: (Math.random() - 0.5) * 0.5,
        life: 15,
        maxLife: 15,
        color: Colors.pink,
        size: 2 + Math.random() * 2,
      });
    }

    this.spawnTimer += this.speed;
    if (
      this.spawnTimer > spawnIntervalFor(this.speed) + Math.random() * 60 &&
      W + 50 - this.lastObstacleX >= SPAWN_MIN_GAP_PX
    ) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }

    this.collectibleTimer += this.speed;
    if (this.collectibleTimer > 120 + Math.random() * 80) {
      this.spawnCollectible();
      this.collectibleTimer = 0;
    }

    const playerBox = this.playerHitbox();

    this.obstacles = this.obstacles.filter((obs) => {
      obs.x -= this.speed;
      if (obs.x < -60) return false;

      if (this.player.invincible <= 0) {
        const obsBox: Box = {
          x: obs.x + 4,
          y: obs.y + 4,
          w: obs.w - 8,
          h: obs.h - 8,
        };
        if (boxOverlap(playerBox, obsBox)) {
          this.die(obs.type);
          return true;
        }
        if (!obs.nearMissed && nearMiss(playerBox, obsBox, NEAR_MISS_PX)) {
          obs.nearMissed = true;
          this.score += NEAR_MISS_BONUS;
          spawnFloatingText(
            this.floatingTexts,
            obs.x,
            obs.y - 14,
            "CLOSE CALL!",
            Colors.yellow,
          );
          this.sound.nearMiss();
        }
      }
      this.lastObstacleX = Math.min(this.lastObstacleX, obs.x);
      return true;
    });

    this.collectibles = this.collectibles.filter((col) => {
      col.x -= this.speed;
      if (col.x < -40) return false;
      if (col.collected) return true;

      const colBox: Box = { x: col.x, y: col.y, w: col.w, h: col.h };
      if (!boxOverlap(playerBox, colBox)) return true;

      col.collected = true;
      this.combo++;
      this.comboTimer = COMBO_WINDOW_FRAMES;

      let points = 0;
      let text = "";
      if (col.type === "paycheck") {
        points = 100 * Math.max(1, this.combo);
        text = this.combo > 1 ? `$${points} x${this.combo}!` : `+$${points}`;
        spawnParticles(this.particles, col.x + 16, col.y + 12, Colors.green, 8);
        this.sound.paycheck(this.combo);
      } else if (col.type === "bonus") {
        points = 500;
        text = `BONUS $${points}!`;
        spawnParticles(this.particles, col.x + 16, col.y + 12, Colors.yellow, 15);
        this.player.invincible = INVINCIBILITY_FRAMES;
        this.sound.bonus();
      } else {
        points = 250 * Math.max(1, this.combo);
        text = `W-2 FILED! +$${points}`;
        spawnParticles(this.particles, col.x + 16, col.y + 12, Colors.teal, 12);
        this.sound.w2();
      }

      this.score += points;
      spawnFloatingText(
        this.floatingTexts,
        col.x,
        col.y - 10,
        text,
        col.type === "bonus" ? Colors.yellow : Colors.green,
      );
      this.checkPromotion();
      return false;
    });

    if (this.frame % 6 === 0) this.score += 1;
    this.checkPromotion();

    this.particles = updateParticles(this.particles);
    this.floatingTexts = updateFloatingTexts(this.floatingTexts);

    for (const c of this.clouds) {
      c.x -= c.speed * this.speed * 0.2;
      if (c.x < -80) c.x = W + 40 + Math.random() * 100;
    }
    for (const pt of this.palmTrees) {
      pt.x -= this.speed * (pt.layer === 0 ? 0.4 : 0.7);
      if (pt.x < -60) pt.x = W + 60 + Math.random() * 100;
    }
    for (const b of this.bgBuildings) {
      b.x -= this.speed * 0.3;
      if (b.x < -80) b.x = W + 40 + Math.random() * 60;
    }
  }

  private playerHitbox(): Box {
    const ph = this.player.ducking ? DUCK_H : this.player.h;
    const py = this.player.ducking
      ? this.player.y - DUCK_H
      : this.player.y - this.player.h;
    return {
      x: this.player.x + 6,
      y: py + 4,
      w: this.player.w - 12,
      h: ph - 8,
    };
  }

  private spawnObstacle(): void {
    let r = Math.random();
    let cum = 0;
    let type: ObstacleType = OBSTACLE_TYPES[0];
    for (let i = 0; i < OBSTACLE_TYPES.length; i++) {
      cum += OBSTACLE_WEIGHTS[i];
      if (r < cum) {
        type = OBSTACLE_TYPES[i];
        break;
      }
    }
    let h = 44;
    let w = 44;
    let y = GROUND_Y;
    if (type === "deadline") {
      h = 30;
      w = 44;
      y = GROUND_Y - 40 - Math.random() * 30;
    } else if (type === "compliance") {
      h = 36;
      w = 48;
    } else {
      h = 44;
      w = 44;
    }
    const x = W + 50;
    this.obstacles.push({
      x,
      y: y - h,
      w,
      h,
      type,
      nearMissed: false,
      passed: false,
    });
    this.lastObstacleX = x;
  }

  private spawnCollectible(): void {
    const type = COLLECTIBLE_BAG[Math.floor(Math.random() * COLLECTIBLE_BAG.length)];
    const yOptions = [GROUND_Y - 50, GROUND_Y - 80, GROUND_Y - 120];
    const y = yOptions[Math.floor(Math.random() * yOptions.length)];
    this.collectibles.push({
      x: W + 50,
      y,
      w: 32,
      h: 24,
      type,
      collected: false,
    });
  }

  private die(obsType: ObstacleType): void {
    this.state = "gameover";
    if (this.score > this.hiScore) this.hiScore = this.score;
    this.shakeTimer = 15;
    spawnParticles(this.particles, this.player.x + 20, this.player.y - 20, Colors.red, 20);
    spawnParticles(this.particles, this.player.x + 20, this.player.y - 20, Colors.orange, 10);
    const msg =
      obsType === "tax"
        ? "TAX PENALTY!"
        : obsType === "deadline"
        ? "MISSED DEADLINE!"
        : "VIOLATION!";
    spawnFloatingText(this.floatingTexts, this.player.x, this.player.y - 40, msg, Colors.red);
    this.sound.death();

    const durationSeconds = Math.max(
      1,
      Math.round((performance.now() - this.startedAt) / 1000),
    );
    this.options.onGameOver?.({
      score: this.score,
      durationSeconds,
      rankTitle: rankFor(this.score),
    });
  }

  private checkPromotion(): void {
    const idx = rankIndexFor(this.score);
    if (idx > this.highestRankIndex) {
      this.highestRankIndex = idx;
      const tier = RANK_TIERS[idx];
      spawnFloatingText(
        this.floatingTexts,
        W / 2,
        H / 2 - 40,
        "PROMOTED!",
        Colors.yellow,
        14,
      );
      spawnFloatingText(
        this.floatingTexts,
        W / 2,
        H / 2 - 20,
        tier.title.toUpperCase(),
        Colors.green,
        10,
      );
      spawnParticles(this.particles, W / 2, H / 2, Colors.yellow, 24);
      this.sound.promotion();
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    let sx = 0;
    let sy = 0;
    if (this.shakeTimer > 0) {
      sx = (Math.random() - 0.5) * this.shakeTimer * 0.8;
      sy = (Math.random() - 0.5) * this.shakeTimer * 0.8;
      this.shakeTimer--;
    }
    ctx.save();
    ctx.translate(sx, sy);

    drawSky(ctx);
    drawSun(ctx);
    drawBuildings(ctx, this.bgBuildings, this.frame);
    drawClouds(ctx, this.clouds);
    drawPalmsLayer(ctx, this.palmTrees, 0, this.frame);
    drawGround(ctx, this.frame, this.speed);
    drawPalmsLayer(ctx, this.palmTrees, 1, this.frame);

    for (const col of this.collectibles) {
      if (!col.collected) drawCollectible(ctx, col, this.frame);
    }
    for (const obs of this.obstacles) {
      drawObstacle(ctx, obs, this.frame);
    }

    if (this.player.invincible > 0 && this.frame % 4 < 2) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = `hsl(${this.frame * 8}, 80%, 60%)`;
      ctx.beginPath();
      ctx.arc(this.player.x + 20, this.player.y - 20, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawFlamingo(
      ctx,
      this.player.x,
      this.player.y,
      this.player.ducking,
      this.player.legFrame,
      this.player.sunglassesGlint,
      this.frame,
    );

    if (this.combo > 1 && this.comboTimer > 0) {
      ctx.globalAlpha = this.comboTimer / COMBO_WINDOW_FRAMES;
      drawPixelText(
        ctx,
        `${this.combo}x COMBO!`,
        this.player.x + 50,
        this.player.y - this.player.h - 20,
        10,
        Colors.yellow,
        "left",
      );
      ctx.globalAlpha = 1;
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      drawRect(ctx, p.x, p.y, p.size, p.size, p.color);
    }
    ctx.globalAlpha = 1;
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = t.life / t.maxLife;
      drawPixelText(ctx, t.text, t.x, t.y, t.size, t.color, "center");
    }
    ctx.globalAlpha = 1;

    if (this.state !== "title") {
      drawHud(ctx, this.score, this.hiScore);
    }

    if (this.state === "title") drawTitleOverlay(ctx, this.frame);
    if (this.state === "gameover") {
      const isNewHighScore = this.score >= this.hiScore;
      drawGameOverOverlay(
        ctx,
        this.score,
        this.hiScore,
        isNewHighScore,
        this.frame,
      );
    }

    ctx.restore();
  }
}

function boxOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function nearMiss(player: Box, obs: Box, threshold: number): boolean {
  const dx = Math.max(obs.x - (player.x + player.w), player.x - (obs.x + obs.w), 0);
  const dy = Math.max(obs.y - (player.y + player.h), player.y - (obs.y + obs.h), 0);
  if (dx === 0 && dy === 0) return false;
  return Math.hypot(dx, dy) <= threshold;
}

// Re-export for convenience.
export type { GameOverInfo };
