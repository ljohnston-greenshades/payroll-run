import Image from "next/image";
import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { HowToPlay } from "@/components/HowToPlay";
import { RegistrationForm } from "@/components/RegistrationForm";

export default function HomePage() {
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "the booth";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10 md:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 35%, rgba(133,196,65,0.08), transparent 70%)",
        }}
      />

      <section className="flex w-full max-w-5xl flex-col items-center gap-8 md:flex-row md:items-center md:justify-center md:gap-14 lg:gap-20">
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 translate-y-6 blur-2xl"
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 50% 60%, rgba(255,107,157,0.25), transparent 70%)",
            }}
          />
          <Image
            src="/flo.png"
            alt="Flo the flamingo"
            width={300}
            height={388}
            unoptimized
            priority
            className="flo-bounce drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)]"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <div className="flex w-full max-w-md flex-col text-center md:text-left">
          <div className="mb-5 flex flex-col items-center md:items-start">
            <GreenshadesLogo className="h-5 w-auto md:h-6" />
            <p className="mt-2 font-serif text-[0.6rem] uppercase tracking-[0.3em] text-white/55">
              {eventName}
            </p>
          </div>

          <h1 className="whitespace-nowrap font-pixel text-3xl leading-none text-gsGreen sm:text-4xl md:text-5xl">
            PAYROLL RUN
          </h1>
          <div className="mx-auto mt-4 h-[3px] w-20 bg-gsGreen md:mx-0" />
          <p className="mb-6 mt-4 font-serif text-base text-white/85 md:text-lg">
            How long can you keep payroll running?
          </p>

          <RegistrationForm />
          <HowToPlay />
        </div>
      </section>
    </main>
  );
}
