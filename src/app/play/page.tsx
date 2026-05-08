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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="text-center">
        <p className="font-pixel text-[0.6rem] uppercase tracking-widest text-gsGreen">
          Playing as {player.screen_name}
        </p>
      </div>
      <GameCanvas />
      <p className="font-serif text-xs text-white/50">
        Space / tap right · Down arrow / tap left to duck
      </p>
    </main>
  );
}
