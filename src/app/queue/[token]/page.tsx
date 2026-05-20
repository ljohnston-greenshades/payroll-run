import { QueueWaitScreen } from "@/components/QueueWaitScreen";
import { BoothBackdrop } from "@/components/BoothBackdrop";

export const dynamic = "force-dynamic";

export default function QueueWaitPage({
  params,
}: {
  params: { token: string };
}) {
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "the booth";
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-10">
      <BoothBackdrop eventName={eventName} />
      <div className="relative z-10 w-full max-w-md">
        <QueueWaitScreen token={params.token} />
      </div>
    </main>
  );
}
