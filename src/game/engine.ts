import {
  BASE_SPEED,
  COMBO_WINDOW_FRAMES,
  Colors,
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
  collectibleIntervalFor,
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
  drawShieldLogoBadge,
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
  // Player's screen name, drawn in the canvas top-left HUD.
  screenName?: string;
  // Hide the session BEST line and retry prompt on the game-over
  // canvas overlay. Used by booth mode where each game is a fresh
  // component mount and retry is automated.
  hideSessionBest?: boolean;
}

const OBSTACLE_TYPES: ObstacleType[] = ["tax", "deadline", "garnishment"];
const OBSTACLE_WEIGHTS = [0.4, 0.35, 0.25];
// Probability bag: ~75% paychecks, 20% W-2s, 5% shields. Shields are
// rare so they feel like a real reward when one shows up.
const COLLECTIBLE_BAG: CollectibleType[] = [
  "paycheck", "paycheck", "paycheck", "paycheck", "paycheck",
  "paycheck", "paycheck", "paycheck", "paycheck", "paycheck",
  "paycheck", "paycheck", "paycheck", "paycheck", "paycheck",
  "w2", "w2", "w2", "w2",
  "shield",
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
  // Hero-moment state for the Greenshades shield power-up.
  private shieldHeroStartFrame: number | null = null;
  private shieldOriginX = 0;
  private shieldOriginY = 0;
  private shieldFlashTimer = 0;
  private wasInvincible = false;
  // Brief input lockout after game over so an accidental keypress
  // doesn't skip past the result screen and immediately restart.
  private gameOverLockoutFrames = 0;

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

  // External input hooks for mobile JUMP / DUCK buttons.
  pressJump(): void {
    this.input.pressJump();
  }

  setDucking(active: boolean): void {
    this.input.setDucking(active);
  }

  // Fired by GameCanvas when /api/score returns position #1 with
  // prior players. Layered fanfare + a particle burst on the canvas
  // to compound the DOM celebration overlay.
  celebrateNewRecord(): void {
    this.sound.shieldActivate();
    this.sound.promotion();
    spawnParticles(
      this.particles,
      this.player.x + 20,
      this.player.y - 30,
      Colors.yellow,
      40,
    );
    spawnParticles(
      this.particles,
      this.player.x + 20,
      this.player.y - 30,
      Colors.green,
      30,
    );
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
    this.sound.stopMusic();
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
    this.sound.startMusic();
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
    this.shieldHeroStartFrame = null;
    this.shieldOriginX = 0;
    this.shieldOriginY = 0;
    this.shieldFlashTimer = 0;
    this.wasInvincible = false;
    this.gameOverLockoutFrames = 0;
    this.highestRankIndex = 0;
    this.startedAt = performance.now();
    this.player.x = Math.round(W * 0.15);
    this.player.y = GROUND_Y;
    this.player.vy = 0;
    this.player.grounded = true;
    this.player.ducking = false;
    this.player.invincible = 0;
    this.player.legFrame = 0;
    this.initBackground();
  }

  private tick(): void {
    this.input.pollGamepad();
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
      if (this.gameOverLockoutFrames > 0) {
        this.gameOverLockoutFrames--;
        // Discard any input received during the lockout so a button
        // smash doesn't queue an unintended restart.
        this.input.consumeJump();
      } else if (this.input.consumeJump()) {
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
    if (this.wasInvincible && this.player.invincible === 0) {
      this.sound.shieldEnd();
      this.shieldHeroStartFrame = null;
    }
    this.wasInvincible = this.player.invincible > 0;

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
      this.spawnTimer > spawnIntervalFor(this.distance) + Math.random() * 120 &&
      W + 50 - this.lastObstacleX >= SPAWN_MIN_GAP_PX
    ) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }

    this.collectibleTimer += this.speed;
    if (
      this.collectibleTimer >
      collectibleIntervalFor(this.distance) + Math.random() * 100
    ) {
      this.spawnCollectible();
      this.collectibleTimer = 0;
    }

    const playerBoxes = this.playerHitboxes();

    this.obstacles = this.obstacles.filter((obs) => {
      obs.x -= this.speed;
      if (obs.x < -60) return false;

      if (this.player.invincible <= 0) {
        const collision = this.obstacleCollision(obs);
        let hit = false;
        for (const pb of playerBoxes) {
          for (const ob of collision.boxes) {
            if (boxOverlap(pb, ob)) {
              hit = true;
              break;
            }
          }
          if (hit) break;
          if (collision.circle) {
            const c = collision.circle;
            if (circleOverlapsBox(c.cx, c.cy, c.r, pb)) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          this.die(obs.type);
          return true;
        }
        if (!obs.nearMissed) {
          const bounds = this.obstacleBounds(obs);
          for (const pb of playerBoxes) {
            if (nearMiss(pb, bounds, NEAR_MISS_PX)) {
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
              break;
            }
          }
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
      const grabbed = playerBoxes.some((pb) => boxOverlap(pb, colBox));
      if (!grabbed) return true;

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
      } else if (col.type === "shield") {
        points = 500;
        text = `+$${points}`;
        // Hero moment: big particle burst, screen flash, fanfare.
        spawnParticles(this.particles, col.x + 16, col.y + 12, Colors.yellow, 28);
        spawnParticles(this.particles, col.x + 16, col.y + 12, Colors.green, 22);
        this.player.invincible = INVINCIBILITY_FRAMES;
        this.shieldHeroStartFrame = this.frame;
        this.shieldOriginX = col.x + 16;
        this.shieldOriginY = col.y + 12;
        this.shieldFlashTimer = 18;
        this.sound.shieldActivate();
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
        col.type === "shield" ? Colors.yellow : Colors.green,
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

  // Multi-box hitboxes that exactly match the sprite rectangles drawn
  // in src/game/sprites.ts. Coordinates derived directly from the
  // drawFlamingo / drawObstacle calls (s = pixel scale = 2). Each
  // visual sub-shape gets its own box so collision mirrors the
  // silhouette: if any visible part touches the obstacle, you die.
  private playerHitboxes(): Box[] {
    const px = this.player.x;
    const py = this.player.y;
    if (this.player.ducking) {
      return [
        { x: px - 12, y: py - 16, w: 12, h: 12 }, // tail tip
        { x: px - 4, y: py - 16, w: 40, h: 24 },  // body (top edge → bottom edge)
        { x: px + 36, y: py - 20, w: 12, h: 16 }, // head
        { x: px + 48, y: py - 16, w: 8, h: 10 },  // beak
      ];
    }
    return [
      { x: px + 16, y: py - 60, w: 20, h: 18 }, // head
      { x: px + 36, y: py - 54, w: 12, h: 10 }, // beak
      { x: px + 17, y: py - 48, w: 12, h: 24 }, // neck (incl ±1 sway)
      { x: px + 8, y: py - 28, w: 24, h: 4 },   // body top curve
      { x: px, y: py - 24, w: 40, h: 28 },      // body main mass
      { x: px - 8, y: py - 16, w: 16, h: 12 },  // tail/wing
    ];
  }

  // Per-type obstacle collision shape. Boxes for rectangular sprites,
  // circle for the clock so we don't leave dead corners around the
  // disc. Matches the rendered sprite extents 1:1.
  private obstacleCollision(obs: Obstacle): {
    boxes: Box[];
    circle?: { cx: number; cy: number; r: number };
  } {
    const x = obs.x;
    const y = obs.y;
    if (obs.type === "tax") {
      // Sign (red, x-4 → x+44, y-24 → y+8) plus post (x+16 → x+24, y → y+28).
      return {
        boxes: [
          { x: x - 4, y: y - 24, w: 48, h: 32 },
          { x: x + 16, y: y, w: 8, h: 28 },
        ],
      };
    }
    if (obs.type === "deadline") {
      // Clock body is a circle; wings flap out the sides as separate
      // small rectangles. Both must register as hits.
      const bob = Math.sin(this.frame * 0.1 + obs.x) * 4;
      const wing = Math.sin(this.frame * 0.3) * 3;
      return {
        boxes: [
          { x: x - 4, y: y + bob + 4 + wing, w: 12, h: 6 }, // left wing
          { x: x + 32, y: y + bob + 4 - wing, w: 12, h: 6 }, // right wing
        ],
        circle: { cx: x + 20, cy: y + 12 + bob, r: 20 },
      };
    }
    // garnishment — paper rectangle, x → x+48, y → y+36
    return {
      boxes: [{ x, y, w: 48, h: 36 }],
    };
  }

  // Bounding box of an obstacle for near-miss / spawn-overlap checks
  // where we just need a single rough region.
  private obstacleBounds(obs: Obstacle): Box {
    const x = obs.x;
    const y = obs.y;
    if (obs.type === "tax") {
      return { x: x - 4, y: y - 24, w: 48, h: 56 };
    }
    if (obs.type === "deadline") {
      const bob = Math.sin(this.frame * 0.1 + obs.x) * 4;
      return { x, y: y - 8 + bob, w: 40, h: 40 };
    }
    return { x, y, w: 48, h: 36 };
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
    } else if (type === "garnishment") {
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

    // Try positions until one doesn't overlap any obstacle within a
    // safety margin. Falls through with no spawn if every option
    // collides — better to drop a collectible than to stack it on a
    // tax sign and force the player to die for the points.
    const w = 32;
    const h = 24;
    const x = W + 50;
    const margin = 50;
    const positions = yOptions
      .slice()
      .sort(() => Math.random() - 0.5);
    for (const y of positions) {
      const proposed = { x, y, w, h };
      const blocked = this.obstacles.some((o) => {
        const bounds = this.obstacleBounds(o);
        const expanded = {
          x: bounds.x - margin,
          y: bounds.y - margin,
          w: bounds.w + margin * 2,
          h: bounds.h + margin * 2,
        };
        return boxOverlap(proposed, expanded);
      });
      if (!blocked) {
        this.collectibles.push({ x, y, w, h, type, collected: false });
        return;
      }
    }
  }

  private die(obsType: ObstacleType): void {
    this.state = "gameover";
    this.gameOverLockoutFrames = 75; // ~1.25s — read your score, then retry.
    if (this.score > this.hiScore) this.hiScore = this.score;
    this.shakeTimer = 15;
    spawnParticles(this.particles, this.player.x + 20, this.player.y - 20, Colors.red, 20);
    spawnParticles(this.particles, this.player.x + 20, this.player.y - 20, Colors.orange, 10);
    const msg =
      obsType === "tax"
        ? "IRS AUDIT!"
        : obsType === "deadline"
        ? "MISSED DEADLINE!"
        : "WAGES GARNISHED!";
    spawnFloatingText(this.floatingTexts, this.player.x, this.player.y - 40, msg, Colors.red);
    this.sound.death();
    this.sound.stopMusic();

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
      this.player.invincible > 0,
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
    if (this.options.screenName) {
      drawPixelText(
        ctx,
        this.options.screenName.toUpperCase(),
        12,
        18,
        7,
        Colors.green,
        "left",
      );
    }
    if (this.state === "playing" && this.shieldHeroStartFrame !== null) {
      this.drawShieldHero(ctx);
    }

    // Brief green flash when the shield activates, fades over ~18 frames.
    if (this.shieldFlashTimer > 0) {
      ctx.fillStyle = `rgba(133,196,65,${(this.shieldFlashTimer / 36).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      this.shieldFlashTimer--;
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
        this.gameOverLockoutFrames > 0,
        this.options.hideSessionBest ?? false,
      );
    }

    ctx.restore();
  }

  // Greenshades shield hero animation: G icon launches from the
  // collection point, grows + rises, then shrinks and flies up to the
  // HUD where it sits next to a "COMPLIANCE SHIELD Ns" countdown.
  private drawShieldHero(ctx: CanvasRenderingContext2D): void {
    if (this.shieldHeroStartFrame === null) return;
    const animFrame = this.frame - this.shieldHeroStartFrame;
    const GROW = 25;
    const FLY = 25;

    // HUD docking: G centered slightly left of canvas center, text
    // continuing to the right.
    const hudGX = W / 2 - 90;
    const hudGY = 22;
    const hudGSize = 18;

    let gx: number;
    let gy: number;
    let gSize: number;

    if (animFrame < GROW) {
      // Phase 1: rise + grow at collection point.
      const t = animFrame / GROW;
      const eased = 1 - (1 - t) * (1 - t); // easeOutQuad
      gx = this.shieldOriginX;
      gy = this.shieldOriginY - eased * 50;
      gSize = 24 + eased * 56; // 24 → 80
    } else if (animFrame < GROW + FLY) {
      // Phase 2: shrink + fly to HUD.
      const t = (animFrame - GROW) / FLY;
      const eased =
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
      const fromX = this.shieldOriginX;
      const fromY = this.shieldOriginY - 50;
      const fromSize = 80;
      gx = fromX + (hudGX - fromX) * eased;
      gy = fromY + (hudGY - fromY) * eased;
      gSize = fromSize + (hudGSize - fromSize) * eased;
    } else {
      // Phase 3: parked in HUD.
      gx = hudGX;
      gy = hudGY;
      gSize = hudGSize;
    }

    drawShieldLogoBadge(ctx, gx, gy, gSize / 11);

    if (animFrame < GROW + FLY) {
      // Big "COMPLIANCE SHIELD ACTIVATED!" banner during the intro,
      // fades out as the G flies to the HUD.
      const fade = animFrame < GROW ? 1 : 1 - (animFrame - GROW) / FLY;
      ctx.globalAlpha = fade;
      drawPixelText(
        ctx,
        "COMPLIANCE SHIELD",
        W / 2,
        H * 0.36,
        H > W ? 14 : 18,
        Colors.green,
        "center",
      );
      drawPixelText(
        ctx,
        "ACTIVATED!",
        W / 2,
        H * 0.36 + (H > W ? 22 : 26),
        H > W ? 14 : 18,
        Colors.yellow,
        "center",
      );
      ctx.globalAlpha = 1;
    } else {
      // HUD countdown — fades in once docked, pulses in the final second.
      const fadeT = Math.min(1, (animFrame - GROW - FLY) / 10);
      const seconds = Math.ceil(this.player.invincible / 60);
      const blink = seconds <= 1 && this.frame % 12 < 6;
      ctx.globalAlpha = fadeT * (blink ? 0.45 : 1);
      drawPixelText(
        ctx,
        `COMPLIANCE SHIELD ${seconds}s`,
        hudGX + 14,
        hudGY,
        9,
        Colors.green,
        "left",
      );
      ctx.globalAlpha = 1;
    }
  }
}

function boxOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// True if any pixel of the circle (cx, cy, r) lies inside the box.
// Standard "closest-point on box to circle center" distance check.
function circleOverlapsBox(
  cx: number,
  cy: number,
  r: number,
  box: Box,
): boolean {
  const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
  const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

function nearMiss(player: Box, obs: Box, threshold: number): boolean {
  const dx = Math.max(obs.x - (player.x + player.w), player.x - (obs.x + obs.w), 0);
  const dy = Math.max(obs.y - (player.y + player.h), player.y - (obs.y + obs.h), 0);
  if (dx === 0 && dy === 0) return false;
  return Math.hypot(dx, dy) <= threshold;
}

// Re-export for convenience.
export type { GameOverInfo };
