export interface InputState {
  jumpPressed: boolean;
  duckPressed: boolean;
}

// Keyboard + pointer + gamepad input. Jump is a one-shot edge
// (consume + reset); duck is held. Duck is ORed across sources so
// releasing one input doesn't cancel another that's still held.
export class InputHandler {
  readonly state: InputState = { jumpPressed: false, duckPressed: false };
  private cleanups: Array<() => void> = [];

  private duckFromKey = false;
  private duckFromPointer = false;
  private duckFromPad = false;
  private duckFromExternal = false;

  private padJumpWasDown = false;

  constructor(private target: HTMLCanvasElement) {
    this.attach();
  }

  private syncDuck(): void {
    this.state.duckPressed =
      this.duckFromKey ||
      this.duckFromPointer ||
      this.duckFromPad ||
      this.duckFromExternal;
  }

  private attach(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        this.state.jumpPressed = true;
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        this.duckFromKey = true;
        this.syncDuck();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") {
        this.duckFromKey = false;
        this.syncDuck();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    this.cleanups.push(() => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    });

    // Split the canvas: left 35% is duck, right 65% is jump.
    // Matches phone-friendly thumb zones from CLAUDE.md §9.
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const rect = this.target.getBoundingClientRect();
      const xRel = (e.clientX - rect.left) / rect.width;
      if (xRel < 0.35) {
        this.duckFromPointer = true;
        this.syncDuck();
      } else {
        this.state.jumpPressed = true;
      }
    };
    const onPointerUp = () => {
      this.duckFromPointer = false;
      this.syncDuck();
    };
    this.target.addEventListener("pointerdown", onPointerDown);
    this.target.addEventListener("pointerup", onPointerUp);
    this.target.addEventListener("pointerleave", onPointerUp);
    this.target.addEventListener("pointercancel", onPointerUp);
    this.cleanups.push(() => {
      this.target.removeEventListener("pointerdown", onPointerDown);
      this.target.removeEventListener("pointerup", onPointerUp);
      this.target.removeEventListener("pointerleave", onPointerUp);
      this.target.removeEventListener("pointercancel", onPointerUp);
    });
  }

  // Called once per frame by the engine. Reads the first connected
  // gamepad and maps B0 → Jump (edge-triggered) and B1 → Duck (held).
  // Works with Xbox-style USB pads and the booth's custom 2-button
  // arcade controller from Tech Dungeon.
  pollGamepad(): void {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad: Gamepad | null = null;
    for (const p of pads) {
      if (p && p.connected) {
        pad = p;
        break;
      }
    }
    if (!pad) {
      if (this.duckFromPad) {
        this.duckFromPad = false;
        this.syncDuck();
      }
      this.padJumpWasDown = false;
      return;
    }

    const jumpDown = pad.buttons[0]?.pressed ?? false;
    if (jumpDown && !this.padJumpWasDown) {
      this.state.jumpPressed = true;
    }
    this.padJumpWasDown = jumpDown;

    const duckDown = pad.buttons[1]?.pressed ?? false;
    if (duckDown !== this.duckFromPad) {
      this.duckFromPad = duckDown;
      this.syncDuck();
    }
  }

  consumeJump(): boolean {
    const was = this.state.jumpPressed;
    this.state.jumpPressed = false;
    return was;
  }

  // Public hooks for DOM controls (mobile JUMP/DUCK buttons).
  pressJump(): void {
    this.state.jumpPressed = true;
  }

  setDucking(active: boolean): void {
    this.duckFromExternal = active;
    this.syncDuck();
  }

  detach(): void {
    for (const c of this.cleanups) c();
    this.cleanups = [];
  }
}
