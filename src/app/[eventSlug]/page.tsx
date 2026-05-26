import Image from "next/image";
import { notFound } from "next/navigation";
import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { RegistrationForm } from "@/components/RegistrationForm";
import { PlayAgainCard } from "@/components/PlayAgainCard";
import {
  getEvent,
  getLeaderboardPosition,
  getPersonalBest,
} from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { isValidEventSlug } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface SearchParams {
  mode?: string;
}

// Event-scoped registration page. This is what the booth-display QR
// codes encode (`payrollrunner.com/<slug>?mode=booth`) — scanning
// drops the visitor onto a form tied to that specific event with no
// env-var dance required.
export default async function EventRegistrationPage({
  params,
  searchParams,
}: {
  params: { eventSlug: string };
  searchParams: SearchParams;
}) {
  const slug = decodeURIComponent(params.eventSlug);
  if (!isValidEventSlug(slug)) notFound();

  const event = await getEvent(slug);
  if (!event) notFound();
  if (event.archived_at) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-pixel text-2xl text-gsGreen">{event.name}</h1>
        <p className="mt-4 max-w-md font-serif text-base text-white/70">
          This event has wrapped — registrations are closed. Check{" "}
          <a className="text-gsGreen underline" href="/">payrollrunner.com</a>{" "}
          for upcoming events.
        </p>
      </main>
    );
  }

  const isBoothMode = searchParams.mode === "booth";

  // Returning player on the booth-QR path? Skip the form (and the
  // HubSpot resubmission that would come with it) and offer them a
  // Play Again button instead.
  const player = await getCurrentPlayer();
  const showPlayAgain =
    isBoothMode && !!player && player.event_slug === event.slug;

  let personalBest = 0;
  let personalRank = 0;
  let personalTotal = 0;
  if (showPlayAgain && player) {
    personalBest = await getPersonalBest(player.id, event.slug);
    if (personalBest > 0) {
      const ranked = await getLeaderboardPosition(event.slug, personalBest);
      personalRank = ranked.position;
      personalTotal = ranked.total;
    }
  }

  // Two layouts share this page:
  //  - First-time registration (form): big Flo + branding + form
  //  - Play Again (returning booth player): compressed header so the
  //    welcome / stats / Play Again / demo CTA / bullets fit above
  //    the fold on a phone. The big branding isn't useful here —
  //    the player just played and knows the game name.
  if (showPlayAgain && player) {
    return (
      <main className="relative flex min-h-screen flex-col items-center px-4 pb-8 pt-6 md:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(133,196,65,0.08), transparent 70%)",
          }}
        />
        <header className="flex w-full max-w-md items-center justify-between">
          <GreenshadesLogo className="h-7 w-auto" />
          <p className="font-serif text-[0.6rem] uppercase tracking-[0.25em] text-white/55">
            {event.name}
          </p>
        </header>
        <div className="mt-4 w-full max-w-md">
          <PlayAgainCard
            eventSlug={event.slug}
            screenName={player.screen_name}
            personalBest={personalBest}
            personalRank={personalRank}
            personalTotal={personalTotal}
            initialDemoRequested={player.demo_requested ?? false}
          />
        </div>
      </main>
    );
  }

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
          <div className="mb-6 flex flex-col items-center md:items-start">
            <GreenshadesLogo className="h-8 w-auto md:h-10" />
            <p className="mt-3 font-serif text-xs uppercase tracking-[0.25em] text-white/70 md:text-sm">
              {event.name}
            </p>
          </div>

          <h1 className="whitespace-nowrap font-pixel text-2xl leading-none text-gsGreen sm:text-3xl md:text-4xl">
            PAYROLL RUNNER
          </h1>
          <div className="mx-auto mt-4 h-[3px] w-20 bg-gsGreen md:mx-0" />
          <p className="mb-6 mt-4 font-serif text-base text-white/85 md:text-lg">
            How long can you keep payroll running?
          </p>

          <RegistrationForm eventSlug={event.slug} />
        </div>
      </section>
    </main>
  );
}
