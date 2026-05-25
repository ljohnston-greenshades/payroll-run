import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Legacy route — kept alive so the current test URL keeps working
// through the migration. Reads the env-var default and forwards to
// the new /booth/[slug] structure. Once everyone is on slugged URLs,
// this file can be deleted.
export default function LegacyBoothPage() {
  const defaultSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  if (!defaultSlug) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-pixel text-xl text-gsGreen">No event configured</h1>
        <p className="mt-4 max-w-md font-serif text-sm text-white/70">
          Set up an event at{" "}
          <code className="text-gsGreen">/admin</code> and visit{" "}
          <code className="text-gsGreen">/booth/&lt;slug&gt;</code> to run it.
        </p>
      </main>
    );
  }
  redirect(`/booth/${defaultSlug}`);
}
