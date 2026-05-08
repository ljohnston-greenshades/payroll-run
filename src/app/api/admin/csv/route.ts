import { NextRequest, NextResponse } from "next/server";
import { isValidAdminKey } from "@/lib/admin";
import { getAllPlayersWithStats } from "@/lib/db";

const CSV_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "company",
  "screen_name",
  "best_score",
  "game_count",
  "hubspot_submitted",
  "created_at",
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const key = req.nextUrl.searchParams.get("key");
  if (!isValidAdminKey(key)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  if (!eventSlug) {
    return NextResponse.json({ error: "event_slug_missing" }, { status: 500 });
  }

  const players = await getAllPlayersWithStats(eventSlug);
  const lines = [CSV_HEADERS.join(",")];
  for (const p of players) {
    lines.push(
      [
        p.first_name,
        p.last_name,
        p.email,
        p.company,
        p.screen_name,
        p.best_score ?? "",
        p.game_count,
        p.hubspot_submitted,
        p.created_at instanceof Date ? p.created_at.toISOString() : p.created_at,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-run-${eventSlug}-${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
