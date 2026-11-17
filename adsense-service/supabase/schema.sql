-- Apply only inside the existing VibeVerse Supabase project.
create table if not exists public.adsense_connections (
  id smallint primary key check (id = 1),
  owner_uid uuid not null,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.adsense_connections enable row level security;
revoke all on public.adsense_connections from public, anon, authenticated;
grant select, insert, update on public.adsense_connections to service_role;
-- No policies: only the trusted server/service role may read or write.
