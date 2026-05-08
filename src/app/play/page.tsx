import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="font-pixel text-2xl text-gsGreen">Get ready, {player.screen_name}!</h1>
      <p className="mt-4 font-serif text-white/80">
        The game canvas drops in Phase 5. Your session is live.
      </p>
    </main>
  );
}
