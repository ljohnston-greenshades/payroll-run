// Procedural Web Audio sound effects — no audio files needed.
// All tones are generated at call time via OscillatorNode; the
// AudioContext is lazily created on first play to comply with browser
// autoplay policies.

type OscType = OscillatorType;

const MUSIC_URL = "/audio/payroll-run.mp3";
const MUSIC_VOLUME = 0.35;

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean;
  private music: HTMLAudioElement | null = null;
  private musicWanted = false;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.reconcileMusic();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  startMusic(): void {
    this.musicWanted = true;
    this.reconcileMusic();
  }

  stopMusic(): void {
    this.musicWanted = false;
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
    }
  }

  private reconcileMusic(): void {
    if (typeof window === "undefined") return;
    if (!this.musicWanted || !this.enabled) {
      this.music?.pause();
      return;
    }
    if (!this.music) {
      this.music = new Audio(MUSIC_URL);
      this.music.loop = true;
      this.music.volume = MUSIC_VOLUME;
    }
    // Browsers may block autoplay until a user gesture; the catch
    // keeps that from spamming the console. The next user input will
    // unlock it on its own (e.g., the jump press that started play).
    this.music.play().catch(() => {});
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      try {
        this.ctx = new AC();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscType = "square",
    volume = 0.1,
    startOffset = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const start = ctx.currentTime + startOffset;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  jump(): void {
    this.tone(440, 0.12, "square", 0.08);
  }

  paycheck(combo: number): void {
    // Higher pitch as combo grows. Capped so it doesn't go ear-piercing.
    const base = 600;
    const freq = base + Math.min(combo, 10) * 60;
    this.tone(freq, 0.1, "sine", 0.12);
  }

  w2(): void {
    this.tone(550, 0.05, "sine", 0.1);
    this.tone(700, 0.1, "sine", 0.12, 0.05);
  }

  bonus(): void {
    // Ascending arpeggio: C, E, G, C
    [523, 659, 784, 1046].forEach((f, i) => {
      this.tone(f, 0.1, "triangle", 0.14, i * 0.05);
    });
  }

  nearMiss(): void {
    this.tone(280, 0.05, "triangle", 0.06);
  }

  death(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  promotion(): void {
    // Five-note fanfare
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      this.tone(f, 0.14, "triangle", 0.16, i * 0.07);
    });
  }
}
