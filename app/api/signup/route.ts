// POST /api/signup — stores one optional post-download answer set in Supabase (table public.signups).
//
// Privacy rules enforced here:
//   - Stores ONLY the validated answers and the platform chosen; the database adds the timestamp.
//     No IP address, no user agent, no headers.
//   - Rate limit: at most RATE_LIMIT submissions per visitor per hour. The visitor key is a
//     salted SHA-256 of the IP kept in this instance's memory for the window only — never
//     stored, never logged. (Serverless instances don't share memory, so the limit is per
//     instance: a speed bump against floods, not a hard quota.)
//   - There is no GET or any other read endpoint: only POST is exported.
//   - If Supabase isn't configured or is unreachable, the request still "succeeds" (204). The form
//     must never look broken to someone who just downloaded the app.
//
// The payload keeps the form's field names (build, self); they map to the columns building and
// skill_level here, at the storage boundary.

import { createHash, randomBytes } from "node:crypto";
import { parseSignup } from "@/lib/signup";
import { getSupabase, SIGNUPS_TABLE } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

// Salt for the in-memory visitor hash, regenerated per server instance and never persisted.
const SALT = randomBytes(16);
const hits = new Map<string, { count: number; windowStart: number }>();

function visitorKey(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(SALT).update(ip).digest("hex");
}

function overLimit(key: string, now: number): boolean {
  // Drop expired windows so the map can't grow without bound.
  for (const [k, v] of hits) if (now - v.windowStart >= WINDOW_MS) hits.delete(k);
  const entry = hits.get(key);
  if (!entry) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

const noContent = () => new Response(null, { status: 204 });

export async function POST(req: Request): Promise<Response> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return new Response(null, { status: 415 });
  }
  if (overLimit(visitorKey(req), Date.now())) return new Response(null, { status: 429 });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const answers = parseSignup(body);
  if (!answers) return new Response(null, { status: 400 });

  const db = getSupabase();
  if (!db) {
    console.warn("[signup] Supabase is not configured; answer not stored");
    return noContent();
  }

  try {
    const { error } = await db.from(SIGNUPS_TABLE).insert({
      name: answers.name || null,
      email: answers.email || null,
      platform: answers.platform,
      building: answers.build,
      agents: answers.agents,
      skill_level: answers.self,
    });
    if (error) console.warn(`[signup] Supabase insert failed: ${error.code || "unknown code"}`);
  } catch (error) {
    console.warn("[signup] Supabase insert failed:", error instanceof Error ? error.name : "unknown error");
  }
  return noContent();
}
