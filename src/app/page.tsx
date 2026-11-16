import Image from "next/image";
import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { listPublicEvents, type Event } from "@/lib/db";

export const dynamic = "force-dynamic";

// Event-neutral marketing landing. Visitors who hit payrollrunner.com
// directly (without scanning a booth QR) see the brand pitch + a list
// of where the booth will be next. Actual sign-up lives at
// /[eventSlug] and is reached via the on-booth QR code.
export default async function HomePage() {
  const events = await listPublicEvents();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 35%, rgba(133,196,65,0.08), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10"
        style={{
          height: "380px",
          background:
            "linear-gradient(to top, rgba(237, 124, 46, 0.18) 0%, rgba(255, 138, 110, 0.10) 25%, rgba(255, 107, 157, 0.06) 55%, rgba(130, 90, 180, 0.04) 80%, transparent 100%)",
        }}
      />

      <header className="flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <GreenshadesLogo className="h-8 w-auto md:h-10" />
        <a
          href="https://www.greenshades.com"
          className="font-serif text-xs uppercase tracking-[0.25em] text-white/60 hover:text-gsGreen md:text-sm"
        >
          greenshades.com →
        </a>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-12 md:py-20">
        <div className="flex w-full max-w-5xl flex-col items-center gap-10 md:flex-row md:gap-16">
          <div className="relative shrink-0">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 translate-y-6 blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse 60% 80% at 50% 60%, rgba(255,107,157,0.25), transparent 70%)",
              }}
            />
            <Image
              src="/flo.png"
              alt="Flo the flamingo"
              width={300}
              height={388}
              unoptimized
              priority
              className="flo-bounce h-56 w-auto drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)] md:h-80"
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          <div className="flex w-full max-w-lg flex-col text-center md:text-left">
            <h1 className="whitespace-nowrap font-pixel text-3xl leading-none text-gsGreen sm:text-4xl md:text-5xl">
              PAYROLL RUNNER
            </h1>
            <div className="mx-auto mt-5 h-[3px] w-20 bg-gsGreen md:mx-0" />
            <p className="mt-5 font-serif text-lg text-white/90 md:text-xl">
              The retro arcade game where you collect paychecks, dodge tax
              audits, and try not to miss payroll.
            </p>
            <p className="mt-3 font-serif text-base text-white/65">
              Built by Greenshades — drop by the booth at an upcoming event to
              play.
            </p>

            <div className="mt-8">
              <h2 className="font-pixel text-xs uppercase tracking-widest text-gsGreen">
                Where to find us
              </h2>
              {events.length === 0 ? (
                <p className="mt-3 font-serif text-sm text-white/60">
                  No upcoming events right now. Check back soon, or visit{" "}
                  <a
                    className="text-gsGreen underline"
                    href="https://www.greenshades.com"
                  >
                    greenshades.com
                  </a>{" "}
                  to learn more.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {events.map((e) => (
                    <EventListItem key={e.slug} event={e} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-6 text-center font-serif text-xs text-white/40 md:px-12">
        © Greenshades · Payroll Runner is for fun. Real payroll runs better
        with{" "}
        <a className="text-gsGreen hover:underline" href="https://www.greenshades.com">
          Greenshades
        </a>
        .
      </footer>
    </main>
  );
}

// One row in the "Where to find us" list. Live events get a pulsing
// green dot + LIVE chip so it's the first thing a visitor's eye
// catches when they land mid-conference; upcoming events show the
// date range and city instead.
function EventListItem({ event }: { event: Event }) {
  const isLive = isEventLive(event);
  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-pixel text-sm text-white">{event.name}</p>
        <p className="mt-0.5 truncate font-serif text-xs text-white/55">
          {formatEventMeta(event)}
        </p>
      </div>
      {isLive ? (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gsGreen/15 px-2.5 py-1 font-pixel text-[0.55rem] uppercase tracking-widest text-gsGreen">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-gsGreen"
          />
          Live
        </span>
      ) : null}
    </li>
  );
}

// "Jun 15–17 · Las Vegas, NV" / "Jun 15 · Las Vegas, NV" /
// just the location, etc — degrades gracefully as fields are missing.
function formatEventMeta(event: Event): string {
  const dateRange = formatDateRange(event.starts_at, event.ends_at);
  const parts: string[] = [];
  if (dateRange) parts.push(dateRange);
  if (event.location) parts.push(event.location);
  return parts.join(" · ");
}

function formatDateRange(
  startsAtRaw: Date | string | null,
  endsAtRaw: Date | string | null,
): string {
  if (!startsAtRaw) return "";
  const start = toDate(startsAtRaw);
  const end = endsAtRaw ? toDate(endsAtRaw) : start;
  if (!start) return "";
  const sameMonth =
    end !== null &&
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();
  const sameDay =
    end !== null &&
    sameMonth &&
    start.getUTCDate() === end.getUTCDate();
  if (!end || sameDay) {
    return formatMonthDay(start, /* withYear */ shouldShowYear(start));
  }
  if (sameMonth) {
    return `${formatMonthDay(start, false)}–${end.getUTCDate()}${
      shouldShowYear(end) ? `, ${end.getUTCFullYear()}` : ""
    }`;
  }
  return `${formatMonthDay(start, false)} – ${formatMonthDay(
    end,
    shouldShowYear(end),
  )}`;
}

function toDate(d: Date | string): Date | null {
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthDay(d: Date, withYear: boolean): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const base = `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return withYear ? `${base}, ${d.getUTCFullYear()}` : base;
}

function shouldShowYear(d: Date): boolean {
  return d.getUTCFullYear() !== new Date().getUTCFullYear();
}

function isEventLive(event: Event): boolean {
  if (!event.starts_at) return false;
  const start = toDate(event.starts_at);
  if (!start) return false;
  const end = event.ends_at ? toDate(event.ends_at) ?? start : start;
  const today = todayUtc();
  return start <= today && today <= end;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
