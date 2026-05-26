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

export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  frame: number,
): void {
  const x = obs.x;
  const y = obs.y;
  const bob = obs.type === "coffee" ? 0 : Math.sin(frame * 0.1 + obs.x) * 3;
  const drawY = y + bob;
  const img = getObstacleAsset(obs.type);
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, drawY, obs.w, obs.h);
    return;
  }
  // Fallback silhouette until the PNG loads — keeps gameplay fair.
  drawRect(ctx, x, drawY, obs.w, obs.h, "#cc2222");
}

export function drawCollectible(
  ctx: CanvasRenderingContext2D,
  col: Collectible,
  frame: number,
): void {
  const x = col.x;
  const y = col.y;
  const bob = Math.sin(frame * 0.08 + col.x * 0.1) * 3;
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
  drawRect(ctx, x + 1 * s, cy + 1 * s, 14 * s, 3 * s, Colors.navy);
  drawPixelText(ctx, "W-2", x + 8 * s, cy + 3 * s, 8, Colors.white, "center");
  for (let i = 0; i < 4; i++) {
    drawRect(ctx, x + 2 * s, cy + 6 * s + i * 3 * s, 10 * s, 1 * s, "#ccc");
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
