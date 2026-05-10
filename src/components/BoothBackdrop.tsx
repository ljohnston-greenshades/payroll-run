import { GreenshadesLogo } from "./GreenshadesLogo";

interface Props {
  eventName: string;
}

// Desktop-only set design that frames the game canvas. Treats the
// negative space around the canvas as a Greenshades booth backdrop:
// brand mark anchors the top-left, event identity anchors the
// top-right, soft atmospheric gradients evoke the in-game tropical
// sunset, and a footer reinforces the brand. Mobile is full-bleed
// and renders none of this.
export function BoothBackdrop({ eventName }: Props) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
      >
        {/* Greenshades green wash, weighted top */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% 30%, rgba(133,196,65,0.10) 0%, transparent 70%)",
          }}
        />
        {/* Warm sunset glow weighted bottom (echoes the in-game horizon) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-2/3"
          style={{
            background:
              "linear-gradient(to top, rgba(237,124,46,0.06) 0%, transparent 65%)",
          }}
        />
        {/* Subtle pixel-grid pattern for booth-stage texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #85c441 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>
    </>
  );
}

export function BoothHeader({ eventName }: Props) {
  return (
    <header className="relative z-10 hidden items-center justify-between px-8 py-5 md:flex lg:px-16 lg:py-7">
      <div className="flex items-center gap-5">
        <GreenshadesLogo className="h-10 w-auto lg:h-12" />
        <div className="hidden border-l border-gsGreen/30 pl-5 lg:block">
          <p className="font-pixel text-[0.6rem] uppercase tracking-[0.3em] text-gsGreen">
            Payroll Run
          </p>
          <p className="mt-1 font-serif text-xs text-white/60">
            How long can you keep payroll running?
          </p>
        </div>
      </div>
      {eventName ? (
        <div className="text-right">
          <p className="font-pixel text-xs uppercase tracking-[0.3em] text-gsGreen md:text-sm lg:text-base">
            {eventName}
          </p>
          <p className="mt-1 font-serif text-xs text-white/55 md:text-sm">
            visit us at the booth
          </p>
        </div>
      ) : (
        <div className="text-right">
          <p className="font-pixel text-xs uppercase tracking-[0.3em] text-gsGreen md:text-sm">
            Greenshades
          </p>
          <p className="mt-1 font-serif text-xs text-white/55 md:text-sm">
            payroll · HR · compliance
          </p>
        </div>
      )}
    </header>
  );
}

export function BoothFooter() {
  return (
    <footer className="relative z-10 hidden items-center justify-between px-8 py-3 md:flex lg:px-16 lg:py-4">
      <p className="font-serif text-xs text-white/45">
        Space / tap right · ↓ / tap left to duck
      </p>
      <p className="font-pixel text-[0.55rem] uppercase tracking-[0.3em] text-white/45">
        greenshades.com
      </p>
    </footer>
  );
}
