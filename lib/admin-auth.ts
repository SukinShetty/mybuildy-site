// Password gate for /admin. The password comes from ADMIN_PASSWORD; no third-party auth.
//
// Sessions use random bearer tokens; only password-bound hashes are stored in Supabase.
// Server-side expiry and deletion make copied tokens expire and logout revoke them across instances.

import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

export const ADMIN_COOKIE = "mybuildy_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // one week

const password = () => process.env.ADMIN_PASSWORD || "";

export const adminConfigured = () => password().length > 0;

const SESSION_TABLE = "admin_sessions";
const validToken = (value: string) => /^v2\.[A-Za-z0-9_-]{43}$/.test(value);
const tokenHash = (value: string) => createHmac("sha256", password())
  .update("mybuildy-admin-session-v2:").update(value).digest("hex");
const cookieOptions = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/admin" };

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
  if (!value || !validToken(value)) return false;
  try {
    const db = getSupabase();
    if (!db) return false;
    const { data, error } = await db.from(SESSION_TABLE).select("expires_at")
      .eq("token_hash", tokenHash(value)).maybeSingle();
    return !error && Boolean(data) && Date.parse(data!.expires_at) > Date.now();
  } catch {
    return false; // A session-store failure must never grant access.
  }
}

export async function startSession(): Promise<boolean> {
  if (!adminConfigured()) return false;
  try {
    const db = getSupabase();
    if (!db) return false;
    const value = `v2.${randomBytes(32).toString("base64url")}`;
    const { error } = await db.from(SESSION_TABLE).insert({
      token_hash: tokenHash(value),
      expires_at: new Date(Date.now() + ADMIN_COOKIE_MAX_AGE * 1000).toISOString(),
    });
    if (error) return false;
    (await cookies()).set(ADMIN_COOKIE, value, { ...cookieOptions, maxAge: ADMIN_COOKIE_MAX_AGE });
    return true;
  } catch {
    return false;
  }
}

export async function endSession(): Promise<boolean> {
  const jar = await cookies();
  const value = jar.get(ADMIN_COOKIE)?.value;
  if (value && validToken(value) && adminConfigured()) {
    try {
      const db = getSupabase();
      if (!db) return false;
      const { error } = await db.from(SESSION_TABLE).delete().eq("token_hash", tokenHash(value));
      if (error) return false;
    } catch {
      return false;
    }
  }
  // Clear only after revocation succeeds. Never report a failed logout as completed.
  jar.set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return true;
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
