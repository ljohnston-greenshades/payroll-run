import { notFound } from "next/navigation";
import Link from "next/link";
import { isValidAdminKey } from "@/lib/admin";
import { listAllEvents } from "@/lib/db";
import {
  archiveEventAction,
  unarchiveEventAction,
} from "./actions";
import { CreateEventForm } from "./CreateEventForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SearchParams {
  key?: string;
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isValidAdminKey(searchParams.key)) {
    notFound();
  }
  const adminKey = searchParams.key as string;
  const events = await listAllEvents();
  const baseUrl = process.env.NEXT_PUBLIC_GAME_URL ?? "";

  return (
    <main className="min-h-screen bg-gsNavy p-8 text-white">
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="font-pixel text-2xl text-gsGreen">
            PAYROLL RUNNER — EVENTS
          </h1>
          <p className="mt-1 font-serif text-sm text-white/60">
            Spin up a new conference leaderboard. The booth URL is live the
            moment the event is created — no redeploys.
          </p>
        </div>
        <Link
          href={`/admin?key=${encodeURIComponent(adminKey)}`}
          className="rounded-md border border-gsGreen px-4 py-2 font-pixel text-[0.55rem] uppercase tracking-wider text-gsGreen transition hover:bg-gsGreen/10"
        >
          ← Back to admin
        </Link>
      </header>

      <section className="mb-12">
        <h2 className="mb-3 font-pixel text-xs uppercase tracking-wider text-gsGreen">
          New event
        </h2>
        <CreateEventForm adminKey={adminKey} />
      </section>

      <section>
        <h2 className="mb-3 font-pixel text-xs uppercase tracking-wider text-gsGreen">
          All events ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="font-serif text-sm text-white/45">
            No events yet — create one above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left font-serif text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Booth URL</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="font-serif">
                {events.map((e) => {
                  const boothUrl = baseUrl
                    ? `${baseUrl}/booth/${e.slug}`
                    : `/booth/${e.slug}`;
                  return (
                    <tr key={e.slug} className="border-t border-white/5">
                      <td className="px-3 py-2">{e.name}</td>
                      <td className="px-3 py-2 font-pixel text-[0.65rem] text-gsGreen">
                        {e.slug}
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={`/booth/${e.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gsGreen underline-offset-2 hover:underline"
                        >
                          {boothUrl}
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        {e.archived_at ? (
                          <span className="text-yellow-300">archived</span>
                        ) : (
                          <span className="text-gsGreen">live</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-white/50">
                        {formatDate(e.created_at)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {e.archived_at ? (
                          <form action={unarchiveEventAction}>
                            <input type="hidden" name="key" value={adminKey} />
                            <input type="hidden" name="slug" value={e.slug} />
                            <button
                              type="submit"
                              className="rounded border border-gsGreen/60 px-2 py-1 text-xs text-gsGreen transition hover:bg-gsGreen/10"
                            >
                              Unarchive
                            </button>
                          </form>
                        ) : (
                          <form action={archiveEventAction}>
                            <input type="hidden" name="key" value={adminKey} />
                            <input type="hidden" name="slug" value={e.slug} />
                            <button
                              type="submit"
                              className="rounded border border-yellow-500/40 px-2 py-1 text-xs text-yellow-300 transition hover:bg-yellow-500/10"
                            >
                              Archive
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString();
}
