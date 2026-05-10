import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import {
  BoothBackdrop,
  BoothFooter,
  BoothHeader,
} from "@/components/BoothBackdrop";
import { GameCanvas } from "@/components/GameCanvas";
import { LeaderboardSidePanel } from "@/components/LeaderboardSidePanel";
import { getLeaderboard, getPlayerCount } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SearchParams {
  board?: string;
}

export default async function PlayPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/");
  }

  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "";
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG ?? "";
  const showSideBoard = searchParams.board === "side";

  const [entries, total] =
    showSideBoard && eventSlug
      ? await Promise.all([
          getLeaderboard(eventSlug, 10),
          getPlayerCount(eventSlug),
        ])
      : [[], 0];

  return (
    <main className="relative flex h-[100svh] flex-col items-stretch overflow-hidden md:h-[100dvh]">
      <BoothBackdrop eventName={eventName} />
      <BoothHeader eventName={eventName} />

      <div
        className={`relative z-10 flex flex-1 flex-col items-center justify-end px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:justify-center md:p-6 md:pb-6 lg:p-8 lg:pb-8 ${
          showSideBoard ? "xl:flex-row xl:items-center xl:gap-8" : ""
        }`}
      >
        <div
          className={`flex w-full ${
            showSideBoard ? "xl:max-w-[1100px]" : ""
          } flex-1 min-h-0 justify-center`}
        >
          <GameCanvas screenName={player.screen_name} />
        </div>
        {showSideBoard ? (
          <LeaderboardSidePanel
            initialEntries={entries}
            initialTotal={total}
            eventSlug={eventSlug}
          />
        ) : null}
      </div>

      <BoothFooter />
    </main>
  );
}
