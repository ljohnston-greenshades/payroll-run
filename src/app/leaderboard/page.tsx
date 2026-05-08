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
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-gsGreen/30 px-12 py-6">
        <GreenshadesLogo className="h-9 w-auto" />
        <h1 className="font-pixel text-3xl text-gsGreen md:text-4xl">
          PAYROLL RUN — LEADERBOARD
        </h1>
        <div className="font-serif text-lg text-white/70">{eventName}</div>
      </header>

      <section className="flex-1 overflow-hidden px-12 py-6">
        <LeaderboardTV
          initialEntries={entries}
          initialTotal={total}
          eventSlug={eventSlug}
        />
      </section>

      <footer className="flex items-center justify-between border-t border-gsGreen/30 px-12 py-6">
        <div className="font-pixel text-2xl text-white/80">
          <span className="text-gsGreen">{total.toLocaleString()}</span>{" "}
          players today
        </div>
        {gameUrl ? <QRCode value={gameUrl} size={130} caption={eventName} /> : null}
      </footer>
    </main>
  );
}
