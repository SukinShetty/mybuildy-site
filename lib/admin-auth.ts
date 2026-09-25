// Password gate for /admin. The password comes from ADMIN_PASSWORD; no third-party auth.
//
// The session cookie holds an HMAC derived from the password, never the password itself, so it
// can be checked without storing anything and changing ADMIN_PASSWORD signs every session out.

import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "mybuildy_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // one week

const password = () => process.env.ADMIN_PASSWORD || "";

export const adminConfigured = () => password().length > 0;

function sessionToken(): string {
  return createHmac("sha256", password()).update("mybuildy-admin-session-v1").digest("hex");
}

/** Constant-time string comparison (both sides hashed first so lengths always match). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function passwordMatches(attempt: string): boolean {
  return adminConfigured() && safeEqual(attempt, password());
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(value) && safeEqual(value!, sessionToken());
}

export async function startSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/admin", maxAge: 0 });
}

// Login throttle: a speed bump against guessing, per server instance, keyed by a hash of the IP
// kept in memory only. Mirrors the signup route's approach.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; windowStart: number }>();

export function loginThrottled(ip: string, now = Date.now()): boolean {
  for (const [k, v] of attempts) if (now - v.windowStart >= LOGIN_WINDOW_MS) attempts.delete(k);
  const key = createHash("sha256").update(ip).digest("hex");
  const entry = attempts.get(key);
  if (!entry) {
    attempts.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_LIMIT;
}
