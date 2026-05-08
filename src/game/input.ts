export interface InputState {
  jumpPressed: boolean;
  duckPressed: boolean;
}

// Keyboard + pointer input. Jump is a one-shot edge (consume + reset);
// duck is held (true while pointer/key is down).
export class InputHandler {
  readonly state: InputState = { jumpPressed: false, duckPressed: false };
  private cleanups: Array<() => void> = [];

  constructor(private target: HTMLCanvasElement) {
    this.attach();
  }

  private attach(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        this.state.jumpPressed = true;
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        this.state.duckPressed = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") this.state.duckPressed = false;
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
      if (xRel < 0.35) this.state.duckPressed = true;
      else this.state.jumpPressed = true;
    };
    const onPointerUp = () => {
      this.state.duckPressed = false;
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

  consumeJump(): boolean {
    const was = this.state.jumpPressed;
    this.state.jumpPressed = false;
    return was;
  }

  detach(): void {
    for (const c of this.cleanups) c();
    this.cleanups = [];
  }
}
