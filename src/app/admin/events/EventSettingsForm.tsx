"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEventSettingsAction } from "./actions";

interface Props {
  adminKey: string;
  slug: string;
  initialStartsAt: string | null;
  initialEndsAt: string | null;
  initialLocation: string | null;
  initialUtmMedium: string | null;
  initialUtmSource: string | null;
  initialUtmCampaign: string | null;
  // Shown as placeholders so admins can see what a blank UTM resolves to.
  defaultUtmMedium: string;
  defaultUtmCampaign: string;
  // The link the booth QR code currently encodes (server-computed).
  qrUrl: string;
}

const inputClass =
  "mt-1 w-full rounded border border-white/15 bg-white/[0.04] px-2 py-1 text-white placeholder-white/35 outline-none focus:border-gsGreen focus:ring-1 focus:ring-gsGreen/25";
const labelClass =
  "block text-[0.6rem] uppercase tracking-wider text-white/55";

// Per-event inline form under each row of the admin events table:
// schedule, location, and the UTMs added to the booth QR code link.
// The slug + name are immutable here.
export function EventSettingsForm(props: Props) {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState(props.initialStartsAt ?? "");
  const [endsAt, setEndsAt] = useState(props.initialEndsAt ?? "");
  const [location, setLocation] = useState(props.initialLocation ?? "");
  const [utmMedium, setUtmMedium] = useState(props.initialUtmMedium ?? "");
  const [utmSource, setUtmSource] = useState(props.initialUtmSource ?? "");
  const [utmCampaign, setUtmCampaign] = useState(
    props.initialUtmCampaign ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData();
    form.set("key", props.adminKey);
    form.set("slug", props.slug);
    form.set("starts_at", startsAt);
    form.set("ends_at", endsAt);
    form.set("location", location);
    form.set("utm_medium", utmMedium);
    form.set("utm_source", utmSource);
    form.set("utm_campaign", utmCampaign);
    startTransition(async () => {
      const result = await updateEventSettingsAction(form);
      if (!result.ok) {
        setError(result.error ?? "Couldn't save.");
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2 text-xs">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className={labelClass}>Start</label>
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>End</label>
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="min-w-[14rem] flex-1">
          <label className={labelClass}>Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Las Vegas, NV"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[9rem] flex-1">
          <label className={labelClass}>UTM medium</label>
          <input
            type="text"
            value={utmMedium}
            onChange={(e) => setUtmMedium(e.target.value)}
            placeholder={props.defaultUtmMedium}
            className={inputClass}
          />
        </div>
        <div className="min-w-[9rem] flex-1">
          <label className={labelClass}>UTM source</label>
          <input
            type="text"
            value={utmSource}
            onChange={(e) => setUtmSource(e.target.value)}
            placeholder={props.slug}
            className={inputClass}
          />
        </div>
        <div className="min-w-[9rem] flex-1">
          <label className={labelClass}>UTM campaign</label>
          <input
            type="text"
            value={utmCampaign}
            onChange={(e) => setUtmCampaign(e.target.value)}
            placeholder={props.defaultUtmCampaign}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded border border-gsGreen/60 px-3 py-1 font-pixel text-[0.55rem] uppercase tracking-wider text-gsGreen transition hover:bg-gsGreen/10 disabled:opacity-50"
        >
          {isPending ? "Saving…" : savedAt ? "Saved" : "Save"}
        </button>
      </div>
      {props.qrUrl ? (
        <p className="break-all text-white/45">
          QR link:{" "}
          <a
            href={props.qrUrl}
            target="_blank"
            rel="noreferrer"
            className="text-gsGreen/80 underline-offset-2 hover:underline"
          >
            {props.qrUrl}
          </a>
        </p>
      ) : null}
      {error ? (
        <p className="text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
