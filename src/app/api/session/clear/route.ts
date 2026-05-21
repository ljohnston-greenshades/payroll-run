import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

// Called when the returning-player UI shows "Not you?" — wipes the
// session cookie so the next /?mode=booth visit shows the full form.
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
