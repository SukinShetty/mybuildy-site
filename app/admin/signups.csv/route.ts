// GET /admin/signups.csv — the whole signups table as CSV. Admin session required.

import { isAdmin } from "@/lib/admin-auth";
import { signupsToCsv } from "@/lib/admin-format";
import { getSupabase, listSignups } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!(await isAdmin())) return new Response("Not signed in.", { status: 401 });
  const db = getSupabase();
  if (!db) return new Response("Supabase is not configured.", { status: 503 });

  let csv: string;
  try {
    csv = signupsToCsv(await listSignups(db));
  } catch {
    return new Response("Could not read signups.", { status: 503 });
  }
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mybuildy-signups-${day}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
