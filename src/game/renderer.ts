import { Colors, GROUND_Y, H, W, rankFor } from "./constants";
import {
  drawFlamingo,
  drawPalmTree,
  drawPixelText,
  drawRect,
  getGsLogo,
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
  // Darker overlay so the legend reads cleanly over the moving scene.
  ctx.fillStyle = "rgba(6,42,71,0.88)";
  ctx.fillRect(0, 0, W, H);

  const isPortrait = H > W;

  // Title block
  const titleY = isPortrait ? H * 0.1 : H * 0.18;
  const titleSize = isPortrait ? 26 : 28;
  drawPixelText(ctx, "PAYROLL RUN", W / 2, titleY, titleSize, Colors.green, "center");
  drawPixelText(
    ctx,
    "PAYROLL RUN",
    W / 2 - 1,
    titleY - 1,
    titleSize,
    Colors.sage,
    "center",
  );
  const subtitleY = isPortrait ? H * 0.16 : H * 0.27;
  drawPixelText(
    ctx,
    "A Greenshades Adventure",
    W / 2,
    subtitleY,
    9,
    Colors.warmGray,
    "center",
  );

  // Flamingo mascot
  const flamingoX = W / 2 - 20;
  const flamingoY = isPortrait ? H * 0.34 : H * 0.5;
  drawFlamingo(
    ctx,
    flamingoX,
    flamingoY,
    false,
    frame,
    Math.sin(frame * 0.05) > 0.7 ? 1 : 0,
    frame,
  );

  // Legend
  drawLegend(ctx, frame, isPortrait);

  // Press start (blink)
  if (Math.sin(frame * 0.06) > 0) {
    drawPixelText(
      ctx,
      "PRESS SPACE OR TAP TO START",
      W / 2,
      H * 0.95,
      isPortrait ? 8 : 9,
      Colors.white,
      "center",
    );
  }
}

// Each row reserves room for the icon, a gap, and a plural label up
// to ~140px ("GREENSHADES SHIELDS" at 7pt).
const LEGEND_ROW_WIDTH = 200;
const LEGEND_ICON_OFFSET = 16; // icon center, measured from rowStart
const LEGEND_LABEL_OFFSET = 42; // label start (left-aligned), measured from rowStart

const COLLECT_ITEMS: Array<[LegendIconType, string]> = [
  ["paycheck", "PAYCHECKS"],
  ["w2", "W-2 FORMS"],
  ["shield", "GREENSHADES SHIELDS"],
];
const DODGE_ITEMS: Array<[LegendIconType, string]> = [
  ["tax", "IRS AUDITS"],
  ["deadline", "DEADLINES"],
  ["garnishment", "GARNISHMENTS"],
];

function drawLegend(
  ctx: CanvasRenderingContext2D,
  frame: number,
  isPortrait: boolean,
): void {
  if (isPortrait) {
    drawLegendStacked(ctx, frame);
  } else {
    drawLegendTwoColumn(ctx, frame);
  }
}

function drawLegendTwoColumn(
  ctx: CanvasRenderingContext2D,
  frame: number,
): void {
  const headerY = H * 0.62;
  const collectCenter = W * 0.28;
  const dodgeCenter = W * 0.72;
  drawPixelText(ctx, "COLLECT", collectCenter, headerY, 8, Colors.green, "center");
  drawPixelText(ctx, "DODGE", dodgeCenter, headerY, 8, Colors.coral, "center");

  const rowSpacing = 28;
  const startRowY = headerY + 24;
  for (let i = 0; i < 3; i++) {
    const y = startRowY + i * rowSpacing;
    drawLegendRow(ctx, frame, COLLECT_ITEMS[i][0], COLLECT_ITEMS[i][1], collectCenter, y);
    drawLegendRow(ctx, frame, DODGE_ITEMS[i][0], DODGE_ITEMS[i][1], dodgeCenter, y);
  }
}

// Single column with COLLECT on top of DODGE — used in portrait so the
// longer labels (GREENSHADES, GARNISHMENT) don't crash into each other.
function drawLegendStacked(
  ctx: CanvasRenderingContext2D,
  frame: number,
): void {
  const cx = W / 2;
  const startY = H * 0.45;
  const rowSpacing = 28;

  drawPixelText(ctx, "COLLECT", cx, startY, 9, Colors.green, "center");
  for (let i = 0; i < 3; i++) {
    drawLegendRow(ctx, frame, COLLECT_ITEMS[i][0], COLLECT_ITEMS[i][1], cx, startY + 22 + i * rowSpacing);
  }

  const dodgeY = startY + 22 + 3 * rowSpacing + 14;
  drawPixelText(ctx, "DODGE", cx, dodgeY, 9, Colors.coral, "center");
  for (let i = 0; i < 3; i++) {
    drawLegendRow(ctx, frame, DODGE_ITEMS[i][0], DODGE_ITEMS[i][1], cx, dodgeY + 22 + i * rowSpacing);
  }
}

function drawLegendRow(
  ctx: CanvasRenderingContext2D,
  frame: number,
  type: LegendIconType,
  label: string,
  centerX: number,
  centerY: number,
): void {
  const rowStart = centerX - LEGEND_ROW_WIDTH / 2;
  drawLegendIcon(ctx, type, frame, rowStart + LEGEND_ICON_OFFSET, centerY);
  drawPixelText(
    ctx,
    label,
    rowStart + LEGEND_LABEL_OFFSET,
    centerY + 1,
    7,
    Colors.white,
    "left",
  );
}

type LegendIconType =
  | "paycheck"
  | "w2"
  | "shield"
  | "tax"
  | "deadline"
  | "garnishment";

// Mini icons drawn at ~18-22px tall, centered at (cx, cy).
// Visually echoes the in-game sprites without re-running their full
// animated draw paths (which expect game-world coordinates).
function drawLegendIcon(
  ctx: CanvasRenderingContext2D,
  type: LegendIconType,
  frame: number,
  cx: number,
  cy: number,
): void {
  if (type === "paycheck") {
    drawRect(ctx, cx - 10, cy - 7, 20, 14, Colors.sage);
    drawRect(ctx, cx - 9, cy - 6, 18, 12, Colors.green);
    drawPixelText(ctx, "$", cx, cy + 1, 11, Colors.white, "center");
    return;
  }
  if (type === "w2") {
    drawRect(ctx, cx - 8, cy - 10, 16, 20, Colors.white);
    drawRect(ctx, cx - 8, cy - 10, 16, 5, Colors.navy);
    drawPixelText(ctx, "W-2", cx, cy - 7, 6, Colors.white, "center");
    drawRect(ctx, cx - 6, cy - 2, 12, 1, "#bbb");
    drawRect(ctx, cx - 6, cy + 1, 12, 1, "#bbb");
    drawRect(ctx, cx - 6, cy + 4, 12, 1, "#bbb");
    return;
  }
  if (type === "shield") {
    const logo = getGsLogo();
    if (logo) {
      const targetH = 18;
      const aspect = logo.width / logo.height;
      const w = targetH * aspect;
      ctx.drawImage(logo, cx - w / 2, cy - targetH / 2, w, targetH);
      return;
    }
    // Fallback shield while the asset loads
    ctx.fillStyle = Colors.deepGreen;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9);
    ctx.lineTo(cx + 8, cy - 5);
    ctx.lineTo(cx + 8, cy + 4);
    ctx.lineTo(cx, cy + 10);
    ctx.lineTo(cx - 8, cy + 4);
    ctx.lineTo(cx - 8, cy - 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = Colors.green;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy - 4);
    ctx.lineTo(cx + 6, cy + 3);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 6, cy + 3);
    ctx.lineTo(cx - 6, cy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = Colors.white;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy);
    ctx.lineTo(cx - 1, cy + 2);
    ctx.lineTo(cx + 3, cy - 3);
    ctx.stroke();
    return;
  }
  if (type === "tax") {
    drawRect(ctx, cx - 11, cy - 8, 22, 16, "#cc2222");
    drawRect(ctx, cx - 10, cy - 7, 20, 14, "#ee3333");
    drawPixelText(ctx, "IRS", cx, cy + 1, 9, Colors.white, "center");
    return;
  }
  if (type === "deadline") {
    const wing = Math.sin(frame * 0.3) * 2;
    drawRect(ctx, cx - 13, cy - 1 + wing, 5, 3, "#cc9900");
    drawRect(ctx, cx + 8, cy - 1 - wing, 5, 3, "#cc9900");
    ctx.fillStyle = Colors.yellow;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cc9900";
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = Colors.white;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = Colors.charcoal;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 3, cy - 2);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + 4);
    ctx.stroke();
    return;
  }
  // garnishment
  drawRect(ctx, cx - 9, cy - 9, 18, 18, "#f5e6c8");
  drawRect(ctx, cx - 8, cy - 8, 16, 16, "#fbf3df");
  drawRect(ctx, cx - 9, cy - 9, 18, 5, "#cc2222");
  drawPixelText(ctx, "G", cx, cy - 7, 5, Colors.white, "center");
  drawRect(ctx, cx - 7, cy - 2, 14, 1, "#666");
  drawRect(ctx, cx - 7, cy + 1, 14, 1, "#666");
  drawRect(ctx, cx - 7, cy + 4, 14, 1, "#666");
  ctx.fillStyle = "#cc2222";
  ctx.beginPath();
  ctx.arc(cx + 5, cy + 6, 2.2, 0, Math.PI * 2);
  ctx.fill();
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
