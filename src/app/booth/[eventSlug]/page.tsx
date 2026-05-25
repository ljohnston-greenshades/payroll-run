import { notFound } from "next/navigation";
import { BoothBackdrop } from "@/components/BoothBackdrop";
import { BoothShell } from "@/components/BoothShell";
import { getEvent, getLeaderboard, getPlayerCount } from "@/lib/db";
import { isValidEventSlug } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Event-scoped booth display. Each event gets its own URL —
// /booth/bullhorn-engage-2026, /booth/shrm-annual-2026, etc. Spin up a
// new event in /admin → its booth URL is immediately live.
export default async function BoothEventPage({
  params,
}: {
  params: { eventSlug: string };
}) {
  const slug = decodeURIComponent(params.eventSlug);
  if (!isValidEventSlug(slug)) notFound();

  const event = await getEvent(slug);
  if (!event) notFound();

  const gameUrl = process.env.NEXT_PUBLIC_GAME_URL ?? "";
  const [entries, total] = await Promise.all([
    getLeaderboard(event.slug, 10),
    getPlayerCount(event.slug),
  ]);

  return (
    <main className="relative flex h-[100dvh] flex-col items-stretch overflow-hidden">
      <BoothBackdrop eventName={event.name} />
      <BoothShell
        eventName={event.name}
        eventSlug={event.slug}
        gameUrl={gameUrl}
        initialEntries={entries}
        initialTotal={total}
      />
    </main>
  );
}
