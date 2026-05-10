import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import {
  BoothBackdrop,
  BoothFooter,
  BoothHeader,
} from "@/components/BoothBackdrop";
import { GameCanvas } from "@/components/GameCanvas";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/");
  }

  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "";

  return (
    <main className="relative flex h-[100svh] flex-col items-stretch overflow-hidden md:h-[100dvh]">
      <BoothBackdrop eventName={eventName} />
      <BoothHeader eventName={eventName} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 pt-3 pb-4 md:p-6 lg:p-8">
        <GameCanvas screenName={player.screen_name} />
      </div>

      <BoothFooter />
    </main>
  );
}
