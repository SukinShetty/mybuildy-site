// /admin — download counts and signup answers. Server-rendered, behind ADMIN_PASSWORD.

import type { Metadata } from "next";
import { Download, LogOut } from "lucide-react";
import { login, logout } from "@/app/admin/actions";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { formatWhen, platformLabel, tally } from "@/lib/admin-format";
import { getReleaseStats, type ReleaseStats } from "@/lib/release-stats";
import { AGENT_OPTIONS, BUILD_OPTIONS, SELF_OPTIONS } from "@/lib/signup";
import { getSupabase, listSignups, type SignupRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — MyBuildy",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";
const button =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-small font-bold transition-colors";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await isAdmin())) {
    const { error } = await searchParams;
    return <SignIn error={Boolean(error)} />;
  }

  const db = getSupabase();
  const [releases, signups] = await Promise.all([
    getReleaseStats(),
    db
      ? listSignups(db).then(
          (rows) => ({ rows }) as const,
          () => ({ error: "Could not read the signups table." }) as const,
        )
      : Promise.resolve({ error: "Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." } as const),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-section font-bold tracking-[-0.02em]">Admin</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/signups.csv" className={`${button} bg-orange text-ink hover:bg-amber`}>
            <Download className="size-4" aria-hidden="true" />
            Download CSV
          </a>
          <form action={logout}>
            <button type="submit" className={`${button} cursor-pointer border border-line text-muted hover:text-text`}>
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <Downloads releases={releases} />

      <section aria-labelledby="signups-title" className="mt-14">
        <h2 id="signups-title" className="text-note font-bold">
          Signups
        </h2>
        {"error" in signups ? (
          <p className={`${card} mt-5 text-body text-muted`}>{signups.error}</p>
        ) : (
          <Signups rows={signups.rows} />
        )}
      </section>
    </main>
  );
}

function SignIn({ error }: { error: boolean }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="text-section font-bold tracking-[-0.02em]">Admin</h1>
      {adminConfigured() ? (
        <form action={login} className="mt-8">
          <label htmlFor="password" className="text-small font-bold">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            autoFocus
            aria-invalid={error || undefined}
            aria-describedby={error ? "password-error" : undefined}
            className="mt-2 block h-12 w-full rounded-xl border border-line bg-surface px-4 text-body text-text outline-none focus-visible:border-amber"
          />
          {error && (
            <p id="password-error" role="alert" className="mt-3 text-small text-orange">
              Wrong password.
            </p>
          )}
          <button type="submit" className={`${button} mt-6 w-full cursor-pointer bg-orange text-ink hover:bg-amber`}>
            Sign in
          </button>
        </form>
      ) : (
        <p className="mt-6 text-body text-muted">Admin is not set up: ADMIN_PASSWORD is not configured.</p>
      )}
    </main>
  );
}

function Downloads({ releases }: { releases: ReleaseStats[] | null }) {
  const totals = (releases ?? []).reduce(
    (t, r) => ({ windows: t.windows + r.windows, macArm: t.macArm + r.macArm, macIntel: t.macIntel + r.macIntel, total: t.total + r.total }),
    { windows: 0, macArm: 0, macIntel: 0, total: 0 },
  );
  const num = "px-4 py-3 text-right tabular-nums";

  return (
    <section aria-labelledby="downloads-title" className="mt-10">
      <h2 id="downloads-title" className="text-note font-bold">
        Downloads
      </h2>
      {releases === null ? (
        <p className={`${card} mt-5 text-body text-muted`}>Couldn&rsquo;t reach GitHub right now. Try again in a minute.</p>
      ) : releases.length === 0 ? (
        <p className={`${card} mt-5 text-body text-muted`}>No releases published yet.</p>
      ) : (
        <>
          <p className="mt-2 text-small text-muted">From GitHub, refreshed every five minutes.</p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-small">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Release</th>
                  <th scope="col" className="px-4 py-3 font-bold">Published</th>
                  <th scope="col" className={`${num} font-bold`}>Windows</th>
                  <th scope="col" className={`${num} font-bold`}>Apple Silicon</th>
                  <th scope="col" className={`${num} font-bold`}>Intel</th>
                  <th scope="col" className={`${num} font-bold`}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {releases.map((r) => (
                  <tr key={r.tag}>
                    <th scope="row" className="px-4 py-3 text-left font-bold">
                      <a href={r.url} className="underline decoration-orange/60 underline-offset-4 hover:decoration-orange">
                        {r.name}
                      </a>
                    </th>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatWhen(r.publishedAt)}</td>
                    <td className={num}>{r.windows.toLocaleString("en-US")}</td>
                    <td className={num}>{r.macArm.toLocaleString("en-US")}</td>
                    <td className={num}>{r.macIntel.toLocaleString("en-US")}</td>
                    <td className={`${num} font-bold`}>{r.total.toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
              {releases.length > 1 && (
                <tfoot className="border-t border-line">
                  <tr>
                    <th scope="row" colSpan={2} className="px-4 py-3 text-left font-bold">
                      All releases
                    </th>
                    <td className={num}>{totals.windows.toLocaleString("en-US")}</td>
                    <td className={num}>{totals.macArm.toLocaleString("en-US")}</td>
                    <td className={num}>{totals.macIntel.toLocaleString("en-US")}</td>
                    <td className={`${num} font-bold text-orange`}>{totals.total.toLocaleString("en-US")}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Signups({ rows }: { rows: SignupRow[] }) {
  const withEmail = rows.filter((r) => r.email).length;
  const questions = [
    { title: "What are you hoping to build?", data: tally(BUILD_OPTIONS, rows.map((r) => r.building)) },
    { title: "Which coding agent do you use?", data: tally(AGENT_OPTIONS, rows.map((r) => r.agents)) },
    { title: "How would you describe yourself?", data: tally(SELF_OPTIONS, rows.map((r) => r.skill_level)) },
  ];
  const empty = <span className="text-muted">—</span>;

  return (
    <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <p className="text-small text-muted">Total signups</p>
          <p className="mt-1 text-section font-bold tabular-nums">{rows.length.toLocaleString("en-US")}</p>
        </div>
        <div className={card}>
          <p className="text-small text-muted">Gave an email</p>
          <p className="mt-1 text-section font-bold tabular-nums">
            {withEmail.toLocaleString("en-US")}
            {rows.length > 0 && (
              <span className="ml-2 text-body font-normal text-muted">{Math.round((withEmail / rows.length) * 100)}%</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {questions.map((q) => (
          <div key={q.title} className={card}>
            <h3 className="text-body font-bold">{q.title}</h3>
            <ul className="mt-4 space-y-3">
              {q.data.map(({ option, count }) => {
                const share = rows.length ? count / rows.length : 0;
                return (
                  <li key={option} className="text-small">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">{option}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {count} <span className="sr-only">of {rows.length}</span>
                      </span>
                    </div>
                    <div aria-hidden="true" className="mt-1.5 h-2 rounded-full bg-text/10">
                      <div className="h-2 rounded-full bg-orange" style={{ width: `${share * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <h3 className="mt-10 text-body font-bold">Every signup, newest first</h3>
      {rows.length === 0 ? (
        <p className={`${card} mt-4 text-body text-muted`}>No signups yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[960px] text-small">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                {["Date", "Name", "Email", "Platform", "Building", "Agents", "Skill level"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatWhen(r.created_at)}</td>
                  <td className="px-4 py-3">{r.name || empty}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.email ? <a href={`mailto:${r.email}`} className="hover:text-orange">{r.email}</a> : empty}</td>
                  <td className="whitespace-nowrap px-4 py-3">{platformLabel(r.platform)}</td>
                  <td className="px-4 py-3">{r.building?.length ? r.building.join(", ") : empty}</td>
                  <td className="px-4 py-3">{r.agents?.length ? r.agents.join(", ") : empty}</td>
                  <td className="px-4 py-3">{r.skill_level || empty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
