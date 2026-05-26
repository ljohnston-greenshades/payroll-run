import { Colors } from "./constants";
import type { Collectible, Obstacle } from "./types";

// Lazily-loaded Greenshades logo for the shield power-up. The image
// lives at /public/gs-logo.png; until it loads (or if it fails to
// load), drawCollectible falls back to the procedural shield draw.
let gsLogo: HTMLImageElement | null = null;
let gsLogoReady = false;
export function getGsLogo(): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (!gsLogo) {
    gsLogo = new Image();
    gsLogo.onload = () => {
      gsLogoReady = true;
    };
    gsLogo.src = "/gs-logo.png";
  }
  return gsLogoReady ? gsLogo : null;
}

// Polished Flo PNG (the same asset shown on the registration page),
// used in the intro dialog to introduce her with more personality
// than the in-game pixel sprite affords.
let floImg: HTMLImageElement | null = null;
let floImgReady = false;
export function getFloImage(): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (!floImg) {
    floImg = new Image();
    floImg.onload = () => {
      floImgReady = true;
    };
    floImg.src = "/flo.png";
  }
  return floImgReady ? floImg : null;
}

// Lazily-loaded obstacle artwork. Each PNG lives in /public; we cache
// the Image element and a "ready" flag so callers can fall back to a
// silhouette rectangle until the asset paints.
interface AssetRef {
  img: HTMLImageElement;
  ready: boolean;
}
const obstacleAssets: Record<string, AssetRef> = {};
function loadAsset(src: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let entry = obstacleAssets[src];
  if (!entry) {
    const img = new Image();
    entry = { img, ready: false };
    img.onload = () => {
      entry!.ready = true;
    };
    img.src = src;
    obstacleAssets[src] = entry;
  }
  return entry.ready ? entry.img : null;
}
export function getObstacleAsset(type: "coffee" | "error" | "audit"): HTMLImageElement | null {
  const src =
    type === "coffee"
      ? "/coffee-spill.png"
      : type === "error"
      ? "/error-enemy.png"
      : "/evil-audit.png";
  return loadAsset(src);
}

export function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "left",
): void {
  ctx.fillStyle = color;
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, Math.round(x), Math.round(y));
}

export function drawFlamingo(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  ducking: boolean,
  legFrame: number,
  glint: number,
  frame: number,
  invincible = false,
): void {
  const s = 2;
  if (ducking) {
    drawRect(ctx, px - 2 * s, py - 6 * s, 20 * s, 8 * s, Colors.pink);
    drawRect(ctx, px, py - 8 * s, 16 * s, 2 * s, Colors.pink);
    drawRect(ctx, px + 2 * s, py + 2 * s, 12 * s, 2 * s, Colors.pink);
    drawRect(ctx, px + 18 * s, py - 8 * s, 6 * s, 6 * s, Colors.pink);
    drawRect(ctx, px + 20 * s, py - 10 * s, 4 * s, 2 * s, Colors.pink);
    drawRect(ctx, px + 24 * s, py - 8 * s, 4 * s, 3 * s, Colors.orange);
    drawRect(ctx, px + 24 * s, py - 5 * s, 3 * s, 2 * s, Colors.charcoal);
    if (invincible) {
      // Bigger green frame around black lenses — the "compliance shield"
      // upgrade to Flo's eyewear. Green rectangle is the frame; two
      // charcoal rects on top are the lenses. The exposed green
      // between/around the lenses is the frame's outline + bridge.
      drawRect(ctx, px + 19 * s, py - 10 * s, 7 * s, 5 * s, Colors.green);
      drawRect(ctx, px + 20 * s, py - 9 * s, 2 * s, 3 * s, Colors.charcoal);
      drawRect(ctx, px + 23 * s, py - 9 * s, 2 * s, 3 * s, Colors.charcoal);
      if (glint > 0) drawRect(ctx, px + 20 * s, py - 9 * s, 1 * s, 1 * s, Colors.white);
    } else {
      drawRect(ctx, px + 20 * s, py - 9 * s, 5 * s, 3 * s, Colors.charcoal);
      if (glint > 0) drawRect(ctx, px + 21 * s, py - 9 * s, 2 * s, 1 * s, Colors.white);
    }
    drawRect(ctx, px + 4 * s, py + 2 * s, 2 * s, 3 * s, Colors.coral);
    drawRect(ctx, px + 10 * s, py + 2 * s, 2 * s, 3 * s, Colors.coral);
    drawRect(ctx, px - 4 * s, py - 6 * s, 4 * s, 4 * s, Colors.hotPink);
    drawRect(ctx, px - 6 * s, py - 8 * s, 3 * s, 3 * s, Colors.hotPink);
    return;
  }

  const neckSway = Math.sin(frame * 0.15) * 1;
  drawRect(ctx, px + 10 * s + neckSway, py - 24 * s, 4 * s, 12 * s, Colors.pink);
  drawRect(ctx, px + 9 * s + neckSway, py - 22 * s, 2 * s, 8 * s, Colors.pink);

  const hx = px + 8 * s + neckSway;
  const hy = py - 28 * s;
  drawRect(ctx, hx, hy, 10 * s, 7 * s, Colors.pink);
  drawRect(ctx, hx + 2 * s, hy - 2 * s, 6 * s, 2 * s, Colors.pink);
  drawRect(ctx, hx + 10 * s, hy + 1 * s, 6 * s, 3 * s, Colors.orange);
  drawRect(ctx, hx + 10 * s, hy + 4 * s, 5 * s, 2 * s, Colors.charcoal);
  if (invincible) {
    // Bigger green-framed shades with black lenses for compliance
    // shield mode. The green rect is the full frame; two black rects
    // sit on top as the lenses, with the gap between them showing
    // through as the bridge.
    drawRect(ctx, hx + 2 * s, hy + 0 * s, 9 * s, 5 * s, Colors.green);
    drawRect(ctx, hx + 3 * s, hy + 1 * s, 3 * s, 3 * s, Colors.charcoal);
    drawRect(ctx, hx + 7 * s, hy + 1 * s, 3 * s, 3 * s, Colors.charcoal);
    if (glint > 0) drawRect(ctx, hx + 4 * s, hy + 1 * s, 1 * s, 1 * s, Colors.white);
  } else {
    drawRect(ctx, hx + 4 * s, hy + 1 * s, 7 * s, 3 * s, Colors.charcoal);
    drawRect(ctx, hx + 3 * s, hy + 1 * s, 2 * s, 3 * s, Colors.charcoal);
    if (glint > 0) drawRect(ctx, hx + 5 * s, hy + 1 * s, 2 * s, 1 * s, Colors.white);
  }

  drawRect(ctx, px + 2 * s, py - 12 * s, 16 * s, 14 * s, Colors.pink);
  drawRect(ctx, px, py - 10 * s, 20 * s, 10 * s, Colors.pink);
  drawRect(ctx, px + 4 * s, py - 14 * s, 12 * s, 2 * s, Colors.pink);

  drawRect(ctx, px + 1 * s, py - 10 * s, 3 * s, 8 * s, Colors.hotPink);
  const wingFlap = Math.sin(frame * 0.2) * 2;
  drawRect(ctx, px - 2 * s, py - 8 * s + wingFlap, 4 * s, 5 * s, Colors.hotPink);
  drawRect(ctx, px - 2 * s, py - 8 * s, 4 * s, 5 * s, Colors.hotPink);
  drawRect(ctx, px - 4 * s, py - 6 * s, 3 * s, 3 * s, Colors.hotPink);

  const legA = Math.sin(legFrame * 0.25) * 4;
  const legB = Math.sin(legFrame * 0.25 + Math.PI) * 4;
  drawRect(ctx, px + 6 * s, py + 2 * s, 2 * s, 10 * s, Colors.coral);
  drawRect(ctx, px + 5 * s + legA, py + 12 * s, 4 * s, 2 * s, Colors.coral);
  drawRect(ctx, px + 12 * s, py + 2 * s, 2 * s, 10 * s, Colors.coral);
  drawRect(ctx, px + 11 * s + legB, py + 12 * s, 4 * s, 2 * s, Colors.coral);
}

export function drawPalmTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  frame: number,
): void {
  const s = size;
  drawRect(ctx, x - 2 * s, y - 20 * s, 4 * s, 20 * s, "#8B6914");
  drawRect(ctx, x - 1 * s, y - 20 * s, 2 * s, 20 * s, "#a07d1c");
  for (let i = 0; i < 5; i++) {
    drawRect(ctx, x - 3 * s, y - 4 * s * i - 2 * s, 6 * s, 1 * s, "#6d5010");
  }
  const sway = Math.sin(frame * 0.03 + x) * 2;
  for (let i = -3; i <= 3; i++) {
    const angle = i * 0.45;
    const len = (12 + Math.abs(i) * 2) * s;
    const fx = x + Math.cos(angle) * len + sway;
    const fy = y - 20 * s + Math.sin(angle) * len * 0.3 - 4 * s;
    ctx.strokeStyle = Colors.greenDark;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(x, y - 20 * s);
    ctx.quadraticCurveTo(x + i * 4 * s + sway, y - 24 * s, fx, fy);
    ctx.stroke();
    ctx.strokeStyle = Colors.green;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(fx - 3 * s, fy);
    ctx.lineTo(fx + 2 * s, fy + 2 * s);
    ctx.stroke();
  }
  drawRect(ctx, x - 2 * s, y - 21 * s, 3 * s, 3 * s, "#5c3d0a");
  drawRect(ctx, x + 1 * s, y - 22 * s, 3 * s, 3 * s, "#5c3d0a");
}

// Pixel-art ERROR enemy — an Excel-window-styled menace with a
// flashing #REF! cell. Lighter visual noise than the PNG version so
// it's readable from across the booth.
function drawErrorEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
): void {
  // Drop shadow
  drawRect(ctx, x + 2, y + 2, w, h, "rgba(0,0,0,0.4)");
  // Window background
  drawRect(ctx, x, y, w, h, "#f5f5f0");
  // Green Excel-style title bar
  const titleH = 8;
  drawRect(ctx, x, y, w, titleH, "#1e7e3c");
  drawRect(ctx, x + 1, y + 1, w - 2, 1, "#2a9c4e");
  // Window control dots (close / restore)
  drawRect(ctx, x + w - 14, y + 2, 4, 4, "#fff");
  drawRect(ctx, x + w - 8, y + 2, 4, 4, "#fff");
  // Cell grid (3 cols × 3 rows)
  const gridY = y + titleH + 2;
  const gridH = h - titleH - 4;
  const colW = (w - 4) / 3;
  const rowH = gridH / 3;
  for (let i = 1; i < 3; i++) {
    drawRect(ctx, x + 2 + colW * i, gridY, 1, gridH, "#c8c8c2");
    drawRect(ctx, x + 2, gridY + rowH * i, w - 4, 1, "#c8c8c2");
  }
  // Flashing #REF! cell — slow pulse, no shake so it stays readable
  const errorPulse = Math.sin(frame * 0.12) > 0 ? "#cc2222" : "#ee3333";
  const cellX = x + 2;
  const cellY = gridY;
  const cellW = colW * 3 - 1;
  const cellH = rowH - 1;
  drawRect(ctx, cellX, cellY, cellW, cellH, errorPulse);
  drawPixelText(
    ctx,
    "#REF!",
    cellX + cellW / 2,
    cellY + cellH / 2 + 1,
    Math.min(10, Math.floor(rowH * 0.55)),
    "#fff",
    "center",
  );
  // A little ❌ red marks in the other cells to sell the "broken
  // spreadsheet" energy without adding noise.
  for (let r = 1; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if ((r + c) % 2 === 0) continue;
      const xx = x + 2 + colW * c + colW / 2;
      const yy = gridY + rowH * r + rowH / 2;
      drawPixelText(ctx, "x", xx, yy + 1, 6, "#cc2222", "center");
    }
  }
}

// Simple, scary AUDIT warning sign — same chunky red shape as the
// original IRS sign with the word "AUDIT" in place of "IRS". A small
// gray post stub anchors it visually whether it spawns on the ground
// or floats mid-air. Text auto-fits so longer words like "AUDIT"
// can't overflow the sign frame.
function drawAuditSign(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  _frame: number,
): void {
  // Sign occupies the upper ~78% of the box; gray post fills the rest.
  const signH = Math.floor(h * 0.78);
  const postH = h - signH;
  const postW = 8;
  const postX = x + (w - postW) / 2;
  // Post
  drawRect(ctx, postX, y + signH, postW, postH, "#888");
  // Dark red outer border
  drawRect(ctx, x, y, w, signH, "#7a0e0e");
  // Bright red sign face
  drawRect(ctx, x + 4, y + 4, w - 8, signH - 8, "#ee3333");

  // Auto-fit the AUDIT text so it never overflows the sign panel.
  // Press Start 2P is monospace-ish but the exact glyph width varies
  // by size, so we measure rather than estimate.
  const innerW = w - 14;
  let textSize = Math.min(14, Math.floor(signH * 0.55));
  ctx.save();
  while (textSize > 6) {
    ctx.font = `${textSize}px "Press Start 2P", monospace`;
    if (ctx.measureText("AUDIT").width <= innerW) break;
    textSize -= 1;
  }
  ctx.restore();
  drawPixelText(
    ctx,
    "AUDIT",
    x + w / 2,
    y + signH / 2 + 1,
    textSize,
    "#fff",
    "center",
  );
}

export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  frame: number,
): void {
  if (obs.type === "coffee") {
    // The spilled-coffee PNG carries enough personality on its own.
    const img = getObstacleAsset("coffee");
    if (img) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, obs.x, obs.y, obs.w, obs.h);
      return;
    }
    // Fallback silhouette while the asset loads.
    drawRect(ctx, obs.x, obs.y, obs.w, obs.h, "#6b4528");
    return;
  }
  if (obs.type === "error") {
    drawErrorEnemy(ctx, obs.x, obs.y, obs.w, obs.h, frame);
    return;
  }
  drawAuditSign(ctx, obs.x, obs.y, obs.w, obs.h, frame);
}

export function drawCollectible(
  ctx: CanvasRenderingContext2D,
  col: Collectible,
  frame: number,
): void {
  const x = col.x;
  const y = col.y;
  // Gentle hover — matches the bob the intro applies to obstacle
  // previews so catch + dodge items feel like they're sharing the
  // same breath of motion.
  const bob = Math.sin(frame * 0.06 + col.x * 0.08) * 2;
  const s = 2;
  if (col.type === "paycheck") {
    const cy = y + bob;
    ctx.fillStyle = "rgba(133,196,65,0.15)";
    ctx.beginPath();
    ctx.arc(x + 8 * s, cy + 6 * s, 14 * s, 0, Math.PI * 2);
    ctx.fill();
    drawRect(ctx, x - 2 * s, cy, 20 * s, 12 * s, Colors.sage);
    drawRect(ctx, x, cy + 1 * s, 16 * s, 10 * s, Colors.green);
    drawPixelText(ctx, "$", x + 8 * s, cy + 6 * s, 12, Colors.white, "center");
    if (frame % 30 < 8) {
      drawRect(ctx, x + 16 * s, cy - 2 * s, 2 * s, 2 * s, Colors.yellow);
      drawRect(ctx, x - 4 * s, cy + 10 * s, 2 * s, 2 * s, Colors.yellow);
    }
    return;
  }
  if (col.type === "shield") {
    // Greenshades shield power-up — actual shield SHAPE in brand greens
    // with a white check inside, halo behind for the rarity glow.
    const cy = y + bob;
    const cx = x + 8 * s;
    const cyMid = cy + 8 * s;

    // Glow halo
    ctx.fillStyle = "rgba(133,196,65,0.28)";
    ctx.beginPath();
    ctx.arc(cx, cyMid, 16 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(133,196,65,0.18)";
    ctx.beginPath();
    ctx.arc(cx, cyMid, 12 * s, 0, Math.PI * 2);
    ctx.fill();

    // Outer shield (dark green border)
    ctx.fillStyle = Colors.deepGreen;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 1 * s);
    ctx.lineTo(cx + 9 * s, cy + 3 * s);
    ctx.lineTo(cx + 9 * s, cy + 12 * s);
    ctx.lineTo(cx, cy + 18 * s);
    ctx.lineTo(cx - 9 * s, cy + 12 * s);
    ctx.lineTo(cx - 9 * s, cy + 3 * s);
    ctx.closePath();
    ctx.fill();
    // Inner shield (Greenshades green)
    ctx.fillStyle = Colors.green;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 1 * s);
    ctx.lineTo(cx + 7.5 * s, cy + 4.5 * s);
    ctx.lineTo(cx + 7.5 * s, cy + 11 * s);
    ctx.lineTo(cx, cy + 16 * s);
    ctx.lineTo(cx - 7.5 * s, cy + 11 * s);
    ctx.lineTo(cx - 7.5 * s, cy + 4.5 * s);
    ctx.closePath();
    ctx.fill();

    // Circular Greenshades logo badge inside the shield
    drawShieldLogoBadge(ctx, cx, cy + 8 * s, s);
    return;
  }
  // w2
  const cy = y + bob;
  drawRect(ctx, x, cy, 16 * s, 20 * s, Colors.white);
  // Taller navy header so the "W-2" text sits cleanly inside it
  // instead of bleeding above and below into the white paper.
  drawRect(ctx, x + 1 * s, cy + 1 * s, 14 * s, 5 * s, Colors.navy);
  drawPixelText(ctx, "W-2", x + 8 * s, cy + 3 * s + s, 8, Colors.white, "center");
  for (let i = 0; i < 3; i++) {
    drawRect(ctx, x + 2 * s, cy + 9 * s + i * 3 * s, 10 * s, 1 * s, "#ccc");
  }
  ctx.fillStyle = "rgba(13,147,137,0.12)";
  ctx.beginPath();
  ctx.arc(x + 8 * s, cy + 10 * s, 16 * s, 0, Math.PI * 2);
  ctx.fill();
}

// Circular logo badge used inside the Greenshades shield power-up.
// Renders a white circle with the gs-logo.png inside if the asset is
// loaded and roughly square; otherwise falls back to a green "G".
// Exported so the legend mini-icon can match the in-game shield.
export function drawShieldLogoBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
): void {
  const radius = 5.5 * s;
  ctx.fillStyle = Colors.white;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  const logo = getGsLogo();
  if (logo && logo.naturalWidth > 0 && logo.naturalHeight > 0) {
    const aspect = logo.naturalWidth / logo.naturalHeight;
    if (aspect <= 1.6) {
      // Square-ish logo — fits nicely in the circle.
      const dh = radius * 1.6;
      const dw = dh * aspect;
      ctx.drawImage(logo, cx - dw / 2, cy - dh / 2, dw, dh);
      return;
    }
  }

  // Fallback: green "G" mark in Press Start 2P, sized to fit the badge.
  drawPixelText(ctx, "G", cx, cy, 5 * s, Colors.green, "center");
}
