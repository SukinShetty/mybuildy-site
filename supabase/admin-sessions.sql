-- Run BEFORE deploying the server-backed admin-session patch.
-- Private session store: no raw tokens, passwords, IP addresses or user agents.
create table if not exists public.admin_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.admin_sessions enable row level security;
revoke all on table public.admin_sessions from public, anon, authenticated;
-- Service-role access is already used server-side; no new public policies or credentials.
grant select, insert, delete on table public.admin_sessions to service_role;
create index if not exists admin_sessions_expires_at_idx on public.admin_sessions (expires_at);
-- Optional maintenance, executed by an authorized administrator:
-- delete from public.admin_sessions where expires_at <= now();
