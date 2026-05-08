import type { FloatingText, Particle } from "./types";

export function spawnParticles(
  pool: Particle[],
  x: number,
  y: number,
  color: string,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    pool.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

export function spawnFloatingText(
  pool: FloatingText[],
  x: number,
  y: number,
  text: string,
  color: string,
  size = 9,
): void {
  pool.push({
    x,
    y,
    text,
    color,
    size,
    vy: -2,
    life: 40,
    maxLife: 40,
  });
}

export function updateParticles(pool: Particle[]): Particle[] {
  return pool.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    return p.life > 0;
  });
}

export function updateFloatingTexts(pool: FloatingText[]): FloatingText[] {
  return pool.filter((t) => {
    t.y += t.vy;
    t.life--;
    return t.life > 0;
  });
}
