import Image from "next/image";
import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { listActiveEvents } from "@/lib/db";

export const dynamic = "force-dynamic";

// Event-neutral marketing landing. Visitors who hit payrollrunner.com
// directly (without scanning a booth QR) see the brand pitch + a list
// of where the booth will be next. Actual sign-up lives at
// /[eventSlug] and is reached via the on-booth QR code.
export default async function HomePage() {
  const events = await listActiveEvents();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 35%, rgba(133,196,65,0.08), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10"
        style={{
          height: "380px",
          background:
            "linear-gradient(to top, rgba(237, 124, 46, 0.18) 0%, rgba(255, 138, 110, 0.10) 25%, rgba(255, 107, 157, 0.06) 55%, rgba(130, 90, 180, 0.04) 80%, transparent 100%)",
        }}
      />

      <header className="flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <GreenshadesLogo className="h-8 w-auto md:h-10" />
        <a
          href="https://www.greenshades.com"
          className="font-serif text-xs uppercase tracking-[0.25em] text-white/60 hover:text-gsGreen md:text-sm"
        >
          greenshades.com →
        </a>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-12 md:py-20">
        <div className="flex w-full max-w-5xl flex-col items-center gap-10 md:flex-row md:gap-16">
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
              className="flo-bounce h-56 w-auto drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)] md:h-80"
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          <div className="flex w-full max-w-lg flex-col text-center md:text-left">
            <h1 className="whitespace-nowrap font-pixel text-3xl leading-none text-gsGreen sm:text-4xl md:text-5xl">
              PAYROLL RUNNER
            </h1>
            <div className="mx-auto mt-5 h-[3px] w-20 bg-gsGreen md:mx-0" />
            <p className="mt-5 font-serif text-lg text-white/90 md:text-xl">
              The retro arcade game where you collect paychecks, dodge tax
              audits, and try not to miss payroll.
            </p>
            <p className="mt-3 font-serif text-base text-white/65">
              Built by Greenshades — drop by the booth at an upcoming event to
              play.
            </p>

            <div className="mt-8">
              <h2 className="font-pixel text-xs uppercase tracking-widest text-gsGreen">
                Where to find us
              </h2>
              {events.length === 0 ? (
                <p className="mt-3 font-serif text-sm text-white/60">
                  No active events right now. Check back soon, or visit{" "}
                  <a
                    className="text-gsGreen underline"
                    href="https://www.greenshades.com"
                  >
                    greenshades.com
                  </a>{" "}
                  to learn more.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {events.map((e) => (
                    <li
                      key={e.slug}
                      className="flex items-baseline justify-between rounded-md border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <span className="font-pixel text-sm text-white">
                        {e.name}
                      </span>
                      <span className="font-pixel text-[0.6rem] uppercase tracking-widest text-white/45">
                        Live
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-6 text-center font-serif text-xs text-white/40 md:px-12">
        © Greenshades · Payroll Runner is for fun. Real payroll runs better
        with{" "}
        <a className="text-gsGreen hover:underline" href="https://www.greenshades.com">
          Greenshades
        </a>
        .
      </footer>
    </main>
  );
}
