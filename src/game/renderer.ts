import { Colors, GROUND_Y, H, W, rankFor } from "./constants";
import {
  drawFlamingo,
  drawPalmTree,
  drawPixelText,
  drawRect,
} from "./sprites";
import type { BgBuilding, Cloud, PalmTree } from "./types";

export function drawSky(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, "#0b2942");
  grad.addColorStop(0.4, "#14506e");
  grad.addColorStop(0.7, "#1a6a70");
  grad.addColorStop(1, Colors.orange);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

export function drawSun(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#ffcc44";
  ctx.beginPath();
  ctx.arc(W * 0.75, GROUND_Y - 20, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(W * 0.75, GROUND_Y - 20, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,220,80,0.08)";
  ctx.beginPath();
  ctx.arc(W * 0.75, GROUND_Y - 20, 100, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBuildings(
  ctx: CanvasRenderingContext2D,
  buildings: BgBuilding[],
  frame: number,
): void {
  for (const b of buildings) {
    drawRect(ctx, b.x, GROUND_Y - b.h, b.w, b.h, b.color);
    for (let row = 0; row < b.windows; row++) {
      for (let col = 0; col < 3; col++) {
        const lit = Math.sin(frame * 0.01 + b.x + row * 3 + col * 7) > 0.3;
        drawRect(
          ctx,
          b.x + 4 + col * 10,
          GROUND_Y - b.h + 6 + row * 14,
          6,
          8,
          lit ? "#ffe066" : "#0a3350",
        );
      }
    }
  }
}

export function drawClouds(
  ctx: CanvasRenderingContext2D,
  clouds: Cloud[],
): void {
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (const c of clouds) {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w / 2, c.w / 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.3, c.y - 5, c.w / 3, c.w / 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPalmsLayer(
  ctx: CanvasRenderingContext2D,
  trees: PalmTree[],
  layer: 0 | 1,
  frame: number,
): void {
  for (const pt of trees) {
    if (pt.layer !== layer) continue;
    if (layer === 0) {
      ctx.globalAlpha = 0.4;
      drawPalmTree(ctx, pt.x, GROUND_Y, pt.size * 0.7, frame);
      ctx.globalAlpha = 1;
    } else {
      drawPalmTree(ctx, pt.x, GROUND_Y, pt.size, frame);
    }
  }
}

export function drawGround(
  ctx: CanvasRenderingContext2D,
  frame: number,
  speed: number,
): void {
  drawRect(ctx, 0, GROUND_Y, W, H - GROUND_Y, Colors.sand);
  drawRect(ctx, 0, GROUND_Y, W, 3, Colors.sandDark);
  for (let i = 0; i < 40; i++) {
    const gx = ((i * 23 + frame * speed * 0.5) % (W + 20)) - 10;
    drawRect(
      ctx,
      gx,
      GROUND_Y + 8 + (i % 3) * 12,
      12 + (i % 4) * 4,
      2,
      "#d4be82",
    );
  }
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  score: number,
  hiScore: number,
): void {
  drawPixelText(
    ctx,
    `$${score.toLocaleString()}`,
    W - 12,
    18,
    11,
    Colors.green,
    "right",
  );
  drawPixelText(
    ctx,
    `HI $${hiScore.toLocaleString()}`,
    W - 12,
    36,
    7,
    Colors.warmGray,
    "right",
  );
}

export function drawTitleOverlay(
  ctx: CanvasRenderingContext2D,
  frame: number,
): void {
  ctx.fillStyle = "rgba(6,42,71,0.7)";
  ctx.fillRect(0, 0, W, H);
  drawPixelText(ctx, "PAYROLL RUN", W / 2, H * 0.28, 28, Colors.green, "center");
  drawPixelText(ctx, "PAYROLL RUN", W / 2 - 1, H * 0.28 - 1, 28, Colors.sage, "center");
  drawPixelText(
    ctx,
    "A Greenshades Adventure",
    W / 2,
    H * 0.38,
    10,
    Colors.warmGray,
    "center",
  );
  drawFlamingo(
    ctx,
    W / 2 - 20,
    H * 0.62,
    false,
    frame,
    Math.sin(frame * 0.05) > 0.7 ? 1 : 0,
    frame,
  );
  if (Math.sin(frame * 0.06) > 0) {
    drawPixelText(
      ctx,
      "PRESS SPACE OR TAP TO START",
      W / 2,
      H * 0.78,
      9,
      Colors.white,
      "center",
    );
  }
  drawPixelText(
    ctx,
    "COLLECT: $Paychecks  W-2s  2X Bonuses",
    W / 2,
    H * 0.87,
    7,
    Colors.sage,
    "center",
  );
  drawPixelText(
    ctx,
    "DODGE: Tax Penalties  Deadlines  Violations",
    W / 2,
    H * 0.93,
    7,
    Colors.coral,
    "center",
  );
}

export function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  score: number,
  hiScore: number,
  isNewHighScore: boolean,
  frame: number,
): void {
  ctx.fillStyle = "rgba(6,42,71,0.75)";
  ctx.fillRect(0, 0, W, H);
  drawPixelText(ctx, "PAYROLL FAILED!", W / 2, H * 0.28, 22, Colors.orange, "center");
  drawPixelText(
    ctx,
    `EARNINGS: $${score.toLocaleString()}`,
    W / 2,
    H * 0.42,
    12,
    Colors.green,
    "center",
  );
  if (isNewHighScore && hiScore > 0) {
    drawPixelText(ctx, "NEW HIGH SCORE!", W / 2, H * 0.5, 10, Colors.yellow, "center");
  }
  drawPixelText(
    ctx,
    `BEST: $${hiScore.toLocaleString()}`,
    W / 2,
    H * 0.57,
    10,
    Colors.warmGray,
    "center",
  );
  if (Math.sin(frame * 0.06) > 0) {
    drawPixelText(
      ctx,
      "TAP OR PRESS SPACE TO RETRY",
      W / 2,
      H * 0.72,
      9,
      Colors.white,
      "center",
    );
  }
  drawPixelText(
    ctx,
    `RANK: ${rankFor(score)}`,
    W / 2,
    H * 0.84,
    8,
    Colors.teal,
    "center",
  );
}
