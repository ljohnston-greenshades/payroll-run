import { notFound } from "next/navigation";
import { isValidAdminKey } from "@/lib/admin";
import {
  getAllPlayersWithStats,
  getEventStats,
  getRecentScores,
  type PlayerWithStats,
  type RecentScore,
} from "@/lib/db";
import { deleteScoreAction, retryHubspotAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SearchParams {
  key?: string;
}

// Score-per-second rate that flags an entry as worth a manual look.
// Real gameplay rarely sustains above 500/s; anti-cheat hard rejects
// at 1000/s, so a flag at 600 catches grey-area submissions.
const RATE_FLAG_THRESHOLD = 600;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isValidAdminKey(searchParams.key)) {
    notFound();
  }
  const adminKey = searchParams.key as string;

  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG ?? "";
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? eventSlug;
  if (!eventSlug) {
    return (
      <main className="p-12">
        <p className="text-red-300">NEXT_PUBLIC_EVENT_SLUG missing.</p>
      </main>
    );
  }

  const [stats, players, recent] = await Promise.all([
    getEventStats(eventSlug),
    getAllPlayersWithStats(eventSlug),
    getRecentScores(eventSlug, 50),
  ]);
  const failedHubspot = players.filter((p) => !p.hubspot_submitted).length;

  return (
    <main className="min-h-screen bg-gsNavy p-8 text-white">
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="font-pixel text-2xl text-gsGreen">PAYROLL RUNNER — ADMIN</h1>
          <p className="mt-1 font-serif text-sm text-white/60">
            {eventName} · slug: <code className="text-gsGreen">{eventSlug}</code>
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={`/api/admin/csv?key=${encodeURIComponent(adminKey)}`}
            className="rounded-md bg-gsGreen px-4 py-2 font-pixel text-[0.55rem] uppercase tracking-wider text-gsNavy hover:brightness-110"
          >
            Export CSV
          </a>
          <form action={retryHubspotAction}>
            <input type="hidden" name="key" value={adminKey} />
            <button
              type="submit"
              disabled={failedHubspot === 0}
              className="rounded-md border border-gsGreen px-4 py-2 font-pixel text-[0.55rem] uppercase tracking-wider text-gsGreen transition hover:bg-gsGreen/10 disabled:opacity-40"
            >
              Retry HubSpot ({failedHubspot})
            </button>
          </form>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Players" value={stats.total_players.toLocaleString()} />
        <StatCard label="Games played" value={stats.total_games.toLocaleString()} />
        <StatCard
          label="Avg score"
          value={`$${stats.avg_score.toLocaleString()}`}
        />
        <StatCard
          label="Top score"
          value={`$${stats.max_score.toLocaleString()}`}
        />
      </section>

      <section className="mb-12">
        <h2 className="mb-3 font-pixel text-xs uppercase tracking-wider text-gsGreen">
          Players ({players.length})
        </h2>
        <PlayersTable players={players} />
      </section>

      <section>
        <h2 className="mb-3 font-pixel text-xs uppercase tracking-wider text-gsGreen">
          Recent scores ({recent.length})
        </h2>
        <p className="mb-2 font-serif text-xs text-white/50">
          Rows flagged in red have a score-per-second rate above{" "}
          {RATE_FLAG_THRESHOLD}/s — worth a manual look.
        </p>
        <RecentScoresTable scores={recent} adminKey={adminKey} />
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-4">
      <div className="font-serif text-xs uppercase tracking-wider text-white/60">
        {label}
      </div>
      <div className="mt-2 font-pixel text-xl text-gsGreen">{value}</div>
    </div>
  );
}

function PlayersTable({ players }: { players: PlayerWithStats[] }) {
  if (players.length === 0) {
    return (
      <p className="font-serif text-sm text-white/40">No players yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-white/10">
      <table className="min-w-full text-sm">
        <thead className="bg-white/5 text-left font-serif text-xs uppercase tracking-wider text-white/60">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Company</th>
            <th className="px-3 py-2">Screen</th>
            <th className="px-3 py-2 text-right">Best</th>
            <th className="px-3 py-2 text-right">Games</th>
            <th className="px-3 py-2">HubSpot</th>
            <th className="px-3 py-2">Joined</th>
          </tr>
        </thead>
        <tbody className="font-serif">
          {players.map((p) => (
            <tr key={p.id} className="border-t border-white/5">
              <td className="px-3 py-2">
                {p.first_name} {p.last_name}
              </td>
              <td className="px-3 py-2 text-white/80">{p.email}</td>
              <td className="px-3 py-2 text-white/70">{p.company ?? "—"}</td>
              <td className="px-3 py-2 font-pixel text-[0.65rem] text-gsGreen">
                {p.screen_name}
              </td>
              <td className="px-3 py-2 text-right">
                {p.best_score !== null ? `$${p.best_score.toLocaleString()}` : "—"}
              </td>
              <td className="px-3 py-2 text-right">{p.game_count}</td>
              <td className="px-3 py-2">
                {p.hubspot_submitted ? (
                  <span className="text-gsGreen">✓</span>
                ) : (
                  <span className="text-yellow-400">pending</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-white/50">
                {formatDate(p.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentScoresTable({
  scores,
  adminKey,
}: {
  scores: RecentScore[];
  adminKey: string;
}) {
  if (scores.length === 0) {
    return <p className="font-serif text-sm text-white/40">No scores yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-white/10">
      <table className="min-w-full text-sm">
        <thead className="bg-white/5 text-left font-serif text-xs uppercase tracking-wider text-white/60">
          <tr>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Screen</th>
            <th className="px-3 py-2 text-right">Score</th>
            <th className="px-3 py-2 text-right">Duration</th>
            <th className="px-3 py-2 text-right">Rate ($/s)</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="font-serif">
          {scores.map((s) => {
            const flagged = s.rate >= RATE_FLAG_THRESHOLD;
            return (
              <tr
                key={s.id}
                className={`border-t border-white/5 ${flagged ? "bg-red-900/20" : ""}`}
              >
                <td className="px-3 py-2 text-xs text-white/50">
                  {formatDate(s.created_at)}
                </td>
                <td className="px-3 py-2 font-pixel text-[0.65rem] text-gsGreen">
                  {s.screen_name}
                </td>
                <td className="px-3 py-2 text-right">
                  ${s.score.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">{s.duration_seconds}s</td>
                <td
                  className={`px-3 py-2 text-right ${flagged ? "text-red-300" : ""}`}
                >
                  {Math.round(s.rate)}
                </td>
                <td className="px-3 py-2">
                  <form action={deleteScoreAction}>
                    <input type="hidden" name="key" value={adminKey} />
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded border border-red-500/50 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}
