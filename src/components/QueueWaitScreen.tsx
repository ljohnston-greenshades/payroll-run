"use client";

import { useEffect, useState } from "react";

interface Props {
  token: string;
}

type QueueStatus =
  | "waiting"
  | "ready"
  | "playing"
  | "done"
  | "expired";

interface QueueResponse {
  status: QueueStatus;
  position: number;
  screenName: string;
  waitSeconds: number;
}

const POLL_INTERVAL_MS = 3_000;

function formatEta(seconds: number): string {
  if (seconds < 60) return "less than a minute";
  if (seconds < 120) return "about 1 minute";
  return `about ${Math.round(seconds / 60)} minutes`;
}

export function QueueWaitScreen({ token }: Props) {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/queue/me?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setError(res.status === 404 ? "We can't find your spot — try registering again." : "Connection issue.");
          return;
        }
        const json = (await res.json()) as QueueResponse;
        if (cancelled) return;
        setError(null);
        setData(json);
      } catch {
        if (!cancelled) setError("Connection issue.");
      }
    };
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  if (!data && !error) {
    return (
      <div className="text-center font-pixel text-sm text-white/70">
        Loading your spot…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-6 text-center font-pixel text-sm text-red-200">
        {error}
      </div>
    );
  }

  const status = data!.status;

  if (status === "ready") {
    return (
      <div className="rounded-lg border-2 border-gsGreen bg-gsNavy/80 p-8 text-center shadow-2xl shadow-gsGreen/30">
        <div className="font-pixel text-3xl text-gsGreen">YOU&apos;RE UP!</div>
        <p className="mt-4 font-serif text-base text-white/90">
          Walk to the booth and press the <span className="font-pixel text-gsGreen">JUMP</span> button.
        </p>
        <p className="mt-2 font-serif text-sm text-white/60">
          You have 30 seconds before we move on to the next player.
        </p>
      </div>
    );
  }

  if (status === "playing") {
    return (
      <div className="rounded-lg border border-gsGreen/50 bg-white/5 p-8 text-center">
        <div className="font-pixel text-xl text-gsGreen">Run, {data!.screenName}!</div>
        <p className="mt-3 font-serif text-sm text-white/70">
          Your game is live. We&apos;ll show your result here when you finish.
        </p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="rounded-lg border border-gsGreen/30 bg-white/5 p-8 text-center">
        <div className="font-pixel text-lg text-gsGreen">Nice run!</div>
        <p className="mt-3 font-serif text-sm text-white/70">
          Check the leaderboard on the TV. Want another go? Scan the QR code again.
        </p>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="rounded-lg border border-white/20 bg-white/5 p-8 text-center">
        <div className="font-pixel text-lg text-white">Spot timed out</div>
        <p className="mt-3 font-serif text-sm text-white/70">
          We held your spot but didn&apos;t see you at the booth. Scan the QR
          code again whenever you&apos;re ready.
        </p>
      </div>
    );
  }

  // waiting
  return (
    <div className="rounded-lg border border-gsGreen/30 bg-white/5 p-8 text-center">
      <div className="font-pixel text-xs uppercase tracking-widest text-white/60">
        You&apos;re in line
      </div>
      <div className="mt-4 font-pixel text-6xl text-gsGreen">#{data!.position}</div>
      <p className="mt-4 font-serif text-base text-white/85">
        Estimated wait: <span className="text-gsGreen">{formatEta(data!.waitSeconds)}</span>
      </p>
      <p className="mt-4 font-serif text-sm text-white/55">
        Keep this page open. We&apos;ll buzz you when it&apos;s your turn — just
        watch for the big <span className="font-pixel text-gsGreen">{data!.screenName}</span> on the booth screen.
      </p>
    </div>
  );
}
