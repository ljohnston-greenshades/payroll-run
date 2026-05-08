import { notFound } from "next/navigation";
import { sql } from "@vercel/postgres";
import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { LeaderboardTV } from "@/components/LeaderboardTV";
import { QRCode } from "@/components/QRCode";
import { getLeaderboard, getPlayerCount } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EVENT_SLUG_PATTERN = /^[a-z0-9-]+$/;

interface Params {
  eventSlug: string;
}

async function eventHasData(slug: string): Promise<boolean> {
  // Either a player or a score row exists for this slug.
  const { rows } = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM players WHERE event_slug = ${slug}
      UNION
      SELECT 1 FROM scores WHERE event_slug = ${slug}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

// "hr-tech-2026" → "Hr Tech 2026". Best-effort title-case for archived
// events where we don't know the original display name. The current
// event is special-cased to use NEXT_PUBLIC_EVENT_NAME.
function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function EventLeaderboardPage({
  params,
}: {
  params: Params;
}) {
  const slug = decodeURIComponent(params.eventSlug);
  if (!EVENT_SLUG_PATTERN.test(slug)) {
    notFound();
  }
  if (!(await eventHasData(slug))) {
    notFound();
  }

  const currentSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  const isCurrent = slug === currentSlug;
  const displayName = isCurrent
    ? process.env.NEXT_PUBLIC_EVENT_NAME ?? prettifySlug(slug)
    : prettifySlug(slug);
  const gameUrl = process.env.NEXT_PUBLIC_GAME_URL ?? "";

  const [entries, total] = await Promise.all([
    getLeaderboard(slug, 20),
    getPlayerCount(slug),
  ]);

  return (
    <main className="flex min-h-[100dvh] flex-col">
      <header className="flex flex-col items-center gap-2 border-b border-gsGreen/30 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-12 md:py-6">
        <GreenshadesLogo className="h-6 w-auto md:h-9" />
        <div className="flex flex-col items-center">
          <h1 className="text-center font-pixel text-base text-gsGreen sm:text-xl md:text-3xl lg:text-4xl">
            PAYROLL RUN — LEADERBOARD
          </h1>
          {!isCurrent ? (
            <p className="mt-1 font-serif text-[0.6rem] uppercase tracking-widest text-yellow-300/80 md:text-xs">
              Archive
            </p>
          ) : null}
        </div>
        <div className="font-serif text-xs text-white/70 md:text-lg">
          {displayName}
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-3 py-4 md:overflow-hidden md:px-12 md:py-6">
        <LeaderboardTV
          initialEntries={entries}
          initialTotal={total}
          eventSlug={slug}
        />
      </section>

      <footer className="flex items-center justify-between border-t border-gsGreen/30 px-4 py-3 md:px-12 md:py-6">
        <div className="font-pixel text-sm text-white/80 md:text-2xl">
          <span className="text-gsGreen">{total.toLocaleString()}</span>{" "}
          {isCurrent ? "players today" : "players"}
        </div>
        {isCurrent && gameUrl ? (
          <div className="hidden md:block">
            <QRCode value={gameUrl} size={130} caption={displayName} />
          </div>
        ) : null}
      </footer>
    </main>
  );
}
