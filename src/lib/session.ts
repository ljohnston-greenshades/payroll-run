import { cookies } from "next/headers";
import { findPlayerBySession, type Player } from "./db";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "pr_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setSessionCookie(token: string): void {
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function getSessionToken(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value;
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentPlayer(): Promise<Player | null> {
  const token = getSessionToken();
  if (!token) return null;
  return findPlayerBySession(token);
}
