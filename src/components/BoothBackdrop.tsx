import { GreenshadesLogo } from "./GreenshadesLogo";

interface Props {
  eventName: string;
}

// Desktop-only set design that frames the game canvas. Treats the
// negative space around the canvas as a Greenshades booth backdrop:
// brand mark anchors the top-left, event identity anchors the
// top-right, soft atmospheric gradients evoke the in-game tropical
// sunset, and a footer reinforces the brand. Sizes scale up
// aggressively at xl / 2xl breakpoints since the booth TV is the
// primary viewing context (typically a 55"+ display). Mobile is
// full-bleed and renders none of this.
export function BoothBackdrop(_props: Props) {
  return (
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
  );
}

export function BoothHeader({ eventName }: Props) {
  return (
    <header className="relative z-10 hidden items-center justify-between px-8 py-5 md:flex lg:px-16 lg:py-8 xl:px-20 xl:py-10 2xl:px-24 2xl:py-12">
      <div className="flex items-center gap-5 lg:gap-7 xl:gap-10">
        <GreenshadesLogo className="h-9 w-auto lg:h-12 xl:h-14 2xl:h-16" />
        <div className="hidden border-l border-gsGreen/30 pl-5 lg:block xl:pl-8 2xl:pl-10">
          <p className="font-pixel text-[0.6rem] uppercase tracking-[0.3em] text-gsGreen lg:text-xs xl:text-sm 2xl:text-base">
            Payroll Runner
          </p>
          <p className="mt-1 font-serif text-xs text-white/60 lg:text-sm xl:text-base 2xl:text-xl">
            How long can you keep payroll running?
          </p>
        </div>
      </div>
      {eventName ? (
        <div className="text-right">
          <p className="font-pixel text-sm uppercase tracking-[0.3em] text-gsGreen lg:text-base xl:text-xl 2xl:text-2xl">
            {eventName}
          </p>
        </div>
      ) : (
        <div className="text-right">
          <p className="font-pixel text-sm uppercase tracking-[0.3em] text-gsGreen lg:text-base xl:text-xl 2xl:text-2xl">
            Greenshades
          </p>
          <p className="mt-2 font-serif text-xs text-white/55 lg:text-sm xl:text-base 2xl:text-lg">
            payroll · HR · compliance
          </p>
        </div>
      )}
    </header>
  );
}

export function BoothFooter() {
  return (
    <footer className="relative z-10 hidden items-center justify-between px-8 py-3 md:flex lg:px-16 lg:py-5 xl:px-20 xl:py-6 2xl:px-24 2xl:py-7">
      <p className="font-serif text-xs text-white/45 lg:text-sm xl:text-base 2xl:text-lg">
        Space / tap right · ↓ / tap left to duck
      </p>
      <p className="font-pixel text-[0.55rem] uppercase tracking-[0.3em] text-white/45 lg:text-xs xl:text-sm 2xl:text-base">
        go.greenshades.com
      </p>
    </footer>
  );
}
