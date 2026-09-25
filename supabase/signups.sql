-- Optional post-download answers from mybuildy.com. Paste into the Supabase SQL editor and run.

create table if not exists public.signups (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text,
  email       text,
  platform    text not null,
  building    text[] not null default '{}',
  agents      text[] not null default '{}',
  skill_level text
);

-- Row Level Security on, and no policies: the public (anon) and signed-in (authenticated) roles
-- can neither read nor write. Only the service-role key, used server-side by the site, bypasses RLS.
alter table public.signups enable row level security;
revoke all on table public.signups from anon, authenticated;

-- The admin page lists newest first.
create index if not exists signups_created_at_idx on public.signups (created_at desc);
