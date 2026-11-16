"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEventScheduleAction } from "./actions";

interface Props {
  adminKey: string;
  slug: string;
  initialStartsAt: string | null;
  initialEndsAt: string | null;
  initialLocation: string | null;
}

// Per-event inline form. Lives in its own row under the main event
// row in the admin table so admins can set / change dates without
// leaving the page. The slug + name are immutable here; for those
// the admin would delete and recreate.
export function EventScheduleForm({
  adminKey,
  slug,
  initialStartsAt,
  initialEndsAt,
  initialLocation,
}: Props) {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState(initialStartsAt ?? "");
  const [endsAt, setEndsAt] = useState(initialEndsAt ?? "");
  const [location, setLocation] = useState(initialLocation ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData();
    form.set("key", adminKey);
    form.set("slug", slug);
    form.set("starts_at", startsAt);
    form.set("ends_at", endsAt);
    form.set("location", location);
    startTransition(async () => {
      const result = await updateEventScheduleAction(form);
      if (!result.ok) {
        setError(result.error ?? "Couldn't save.");
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-2 text-xs"
    >
      <div>
        <label className="block text-[0.6rem] uppercase tracking-wider text-white/55">
          Start
        </label>
        <input
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="mt-1 rounded border border-white/15 bg-white/[0.04] px-2 py-1 text-white outline-none focus:border-gsGreen focus:ring-1 focus:ring-gsGreen/25"
        />
      </div>
      <div>
        <label className="block text-[0.6rem] uppercase tracking-wider text-white/55">
          End
        </label>
        <input
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className="mt-1 rounded border border-white/15 bg-white/[0.04] px-2 py-1 text-white outline-none focus:border-gsGreen focus:ring-1 focus:ring-gsGreen/25"
        />
      </div>
      <div className="min-w-[14rem] flex-1">
        <label className="block text-[0.6rem] uppercase tracking-wider text-white/55">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Las Vegas, NV"
          className="mt-1 w-full rounded border border-white/15 bg-white/[0.04] px-2 py-1 text-white placeholder-white/40 outline-none focus:border-gsGreen focus:ring-1 focus:ring-gsGreen/25"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-gsGreen/60 px-3 py-1 font-pixel text-[0.55rem] uppercase tracking-wider text-gsGreen transition hover:bg-gsGreen/10 disabled:opacity-50"
      >
        {isPending ? "Saving…" : savedAt ? "Saved" : "Save"}
      </button>
      {error ? (
        <span className="text-red-300" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
