// Server-side Supabase access for the `signups` table. Uses the service-role key, which bypasses
// Row Level Security, so this module must never be imported from a client component: the
// `server-only` import makes that a build error.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SIGNUPS_TABLE = "signups";

/** One row of public.signups, as created by the SQL in README.md. */
export type SignupRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  platform: string;
  building: string[];
  agents: string[];
  skill_level: string | null;
};

const TIMEOUT_MS = 4000;

/** A service-role client, or null when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      // Every request gets a timeout and bypasses Next's fetch cache.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) }),
    },
  });
}

/** Every signup, newest first. Pages through PostgREST's 1000-row response cap. */
export async function listSignups(db: SupabaseClient): Promise<SignupRow[]> {
  const PAGE = 1000;
  const rows: SignupRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(SIGNUPS_TABLE)
      .select("id, created_at, name, email, platform, building, agents, skill_level")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as SignupRow[]));
    if (!data || data.length < PAGE) return rows;
  }
}
