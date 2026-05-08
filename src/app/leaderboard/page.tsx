import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { LeaderboardTV } from "@/components/LeaderboardTV";
import { QRCode } from "@/components/QRCode";
import { getLeaderboard, getPlayerCount } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeaderboardPage() {
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG ?? "";
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? eventSlug;
  const gameUrl = process.env.NEXT_PUBLIC_GAME_URL ?? "";

  const [entries, total] = eventSlug
    ? await Promise.all([getLeaderboard(eventSlug, 20), getPlayerCount(eventSlug)])
    : [[], 0];

  return (
    <main className="flex min-h-[100dvh] flex-col">
      <header className="flex flex-col items-center gap-2 border-b border-gsGreen/30 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-12 md:py-6">
        <GreenshadesLogo className="h-6 w-auto md:h-9" />
        <h1 className="text-center font-pixel text-base text-gsGreen sm:text-xl md:text-3xl lg:text-4xl">
          PAYROLL RUN — LEADERBOARD
        </h1>
        <div className="font-serif text-xs text-white/70 md:text-lg">
          {eventName}
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-3 py-4 md:overflow-hidden md:px-12 md:py-6">
        <LeaderboardTV
          initialEntries={entries}
          initialTotal={total}
          eventSlug={eventSlug}
        />
      </section>

      <footer className="flex items-center justify-between border-t border-gsGreen/30 px-4 py-3 md:px-12 md:py-6">
        <div className="font-pixel text-sm text-white/80 md:text-2xl">
          <span className="text-gsGreen">{total.toLocaleString()}</span>{" "}
          players today
        </div>
        {gameUrl ? (
          <div className="hidden md:block">
            <QRCode value={gameUrl} size={130} caption={eventName} />
          </div>
        ) : null}
      </footer>
    </main>
  );
}
