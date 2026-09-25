// POST /api/signup — stores one optional post-download answer set in Vercel KV (Upstash Redis).
//
// Privacy rules enforced here:
//   - Stores ONLY the validated answers, the platform chosen and a timestamp. No IP address, no
//     user agent, no headers.
//   - Rate limit: at most RATE_LIMIT submissions per visitor per hour. The visitor key is a
//     salted SHA-256 of the IP kept in this instance's memory for the window only — never
//     stored, never logged. (Serverless instances don't share memory, so the limit is per
//     instance: a speed bump against floods, not a hard quota.)
//   - There is no GET or any other read endpoint: only POST is exported.
//   - If KV isn't configured or is unreachable, the request still "succeeds" (204). The form
//     must never look broken to someone who just downloaded the app.

import { createHash, randomBytes } from "node:crypto";
import { parseSignup } from "@/lib/signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_KEY = "mybuildy:signups";
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

function kvConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
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

  const kv = kvConfig();
  if (!kv) {
    console.warn("[signup] KV is not configured; answer not stored");
    return noContent();
  }

  const record = JSON.stringify({ ...answers, at: new Date().toISOString() });
  try {
    const res = await fetch(kv.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${kv.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["LPUSH", LIST_KEY, record]),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) console.warn(`[signup] KV write failed with HTTP ${res.status}`);
  } catch (error) {
    console.warn("[signup] KV write failed:", error instanceof Error ? error.name : "unknown error");
  }
  return noContent();
}
