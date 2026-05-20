import { BoothBackdrop } from "@/components/BoothBackdrop";
import { BoothShell } from "@/components/BoothShell";
import { getLeaderboard, getPlayerCount } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BoothPage() {
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "the booth";
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG ?? "";
  const gameUrl = process.env.NEXT_PUBLIC_GAME_URL ?? "";
  const [entries, total] = eventSlug
    ? await Promise.all([getLeaderboard(eventSlug, 10), getPlayerCount(eventSlug)])
    : [[], 0];

  return (
    <main className="relative flex h-[100dvh] flex-col items-stretch overflow-hidden">
      <BoothBackdrop eventName={eventName} />
      <BoothShell
        eventName={eventName}
        eventSlug={eventSlug}
        gameUrl={gameUrl}
        initialEntries={entries}
        initialTotal={total}
      />
    </main>
  );
}
