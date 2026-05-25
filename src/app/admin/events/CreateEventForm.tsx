"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEventAction } from "./actions";

interface Props {
  adminKey: string;
}

// Title-Case → kebab-case slug suggestion so the user doesn't have to
// type both fields. "Bullhorn Engage 2026" → "bullhorn-engage-2026".
function suggestSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateEventForm({ adminKey }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setName(v);
    if (!slugTouched) setSlug(suggestSlug(v));
  };

  const onSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    setSlug(e.target.value.toLowerCase());
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = new FormData();
    form.set("key", adminKey);
    form.set("name", name);
    form.set("slug", slug);
    startTransition(async () => {
      const result = await createEventAction(form);
      if (!result.ok) {
        setError(result.error ?? "Couldn't create event.");
        return;
      }
      setSuccess(`Created /booth/${slug}.`);
      setName("");
      setSlug("");
      setSlugTouched(false);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border border-white/10 bg-white/[0.04] p-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="event-name"
            className="block text-xs font-semibold uppercase tracking-wider text-white/70"
          >
            Event name <span className="text-gsGreen">*</span>
          </label>
          <input
            id="event-name"
            name="name"
            value={name}
            onChange={onNameChange}
            placeholder="Bullhorn Engage 2026"
            required
            className="mt-1.5 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-white placeholder-white/40 outline-none focus:border-gsGreen focus:ring-2 focus:ring-gsGreen/25"
          />
        </div>
        <div>
          <label
            htmlFor="event-slug"
            className="block text-xs font-semibold uppercase tracking-wider text-white/70"
          >
            URL slug <span className="text-gsGreen">*</span>
          </label>
          <input
            id="event-slug"
            name="slug"
            value={slug}
            onChange={onSlugChange}
            placeholder="bullhorn-engage-2026"
            required
            className="mt-1.5 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 font-pixel text-xs text-gsGreen placeholder-white/40 outline-none focus:border-gsGreen focus:ring-2 focus:ring-gsGreen/25"
          />
          <p className="mt-1 text-xs text-white/45">
            Becomes /booth/{slug || "<slug>"}
          </p>
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-sm text-gsGreen" role="status">
          {success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="mt-4 rounded-md bg-gsGreen px-5 py-2 font-pixel text-[0.6rem] uppercase tracking-wider text-gsNavy transition hover:brightness-110 disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create Event"}
      </button>
    </form>
  );
}
