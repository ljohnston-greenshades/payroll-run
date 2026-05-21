import Image from "next/image";
import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { RegistrationForm } from "@/components/RegistrationForm";
import { PlayAgainCard } from "@/components/PlayAgainCard";
import { getCurrentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

interface SearchParams {
  mode?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "the booth";
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG ?? "";
  const isBoothMode = searchParams.mode === "booth";

  // Returning player on the booth-QR path? Skip the form (and the
  // HubSpot resubmission that would come with it) and offer them a
  // Play Again button instead.
  const player = await getCurrentPlayer();
  const showPlayAgain =
    isBoothMode && !!player && player.event_slug === eventSlug;

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
            className={`flo-bounce drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)] ${
              showPlayAgain ? "h-44 w-auto md:h-72" : ""
            }`}
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <div
          className={`flex w-full max-w-md flex-col ${
            showPlayAgain ? "text-center" : "text-center md:text-left"
          }`}
        >
          <div
            className={`mb-6 flex flex-col ${
              showPlayAgain ? "items-center" : "items-center md:items-start"
            }`}
          >
            <GreenshadesLogo className="h-8 w-auto md:h-10" />
            <p className="mt-3 font-serif text-xs uppercase tracking-[0.25em] text-white/70 md:text-sm">
              {eventName}
            </p>
          </div>

          <h1 className="whitespace-nowrap font-pixel text-2xl leading-none text-gsGreen sm:text-3xl md:text-4xl">
            PAYROLL RUNNER
          </h1>
          <div
            className={`mt-4 h-[3px] w-20 bg-gsGreen ${
              showPlayAgain ? "mx-auto" : "mx-auto md:mx-0"
            }`}
          />
          <p className="mb-6 mt-4 font-serif text-base text-white/85 md:text-lg">
            How long can you keep payroll running?
          </p>

          {showPlayAgain && player ? (
            <PlayAgainCard screenName={player.screen_name} />
          ) : (
            <RegistrationForm />
          )}
        </div>
      </section>
    </main>
  );
}
