"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  screenName: string;
}

export function PlayAgainCard({ screenName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPlayAgain = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/queue/rejoin", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.queueToken) {
        setError("Couldn't get you in line. Please try again.");
        setBusy(false);
        return;
      }
      router.push(`/queue/${data.queueToken}`);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  const onSwitchPlayer = async () => {
    try {
      await fetch("/api/session/clear", { method: "POST" });
    } catch {
      // If clearing fails, reload anyway — the form will show on a
      // fresh navigation.
    }
    router.refresh();
  };

  return (
    <div className="w-full max-w-md text-center">
      <p className="font-pixel text-xs uppercase tracking-widest text-white/55">
        Welcome back
      </p>
      <p className="mt-2 font-pixel text-3xl text-gsGreen">{screenName}</p>
      <p className="mt-5 font-serif text-base text-white/85">
        Ready for another run? Tap below and we&apos;ll put you back in line.
        No need to fill out the form again.
      </p>

      <button
        type="button"
        onClick={onPlayAgain}
        disabled={busy}
        className="mt-6 w-full rounded-md bg-gsGreen px-6 py-3 font-pixel text-sm uppercase tracking-wider text-gsNavy shadow-lg shadow-gsGreen/20 transition hover:brightness-110 hover:shadow-gsGreen/40 active:translate-y-px disabled:opacity-60"
      >
        {busy ? "Getting in line…" : "Play Again →"}
      </button>

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSwitchPlayer}
        className="mt-4 w-full text-center text-xs text-white/55 underline-offset-2 hover:text-white/80 hover:underline"
      >
        Not you? Start over.
      </button>
    </div>
  );
}
