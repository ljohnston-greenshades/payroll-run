import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import { GameCanvas } from "@/components/GameCanvas";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/");
  }

  return (
    <main className="flex h-[100dvh] flex-col items-center px-3 py-3 md:justify-center md:gap-3 md:p-4">
      <GameCanvas screenName={player.screen_name} />
      <p className="mt-2 hidden font-serif text-xs text-white/50 md:block">
        Space / tap right · Down arrow / tap left to duck
      </p>
    </main>
  );
}
